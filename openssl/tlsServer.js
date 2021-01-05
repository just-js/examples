const { net, sys } = just
const { tls } = just.library('tls', 'openssl.so')
const { SSL_OP_ALL, SSL_OP_NO_RENEGOTIATION, SSL_OP_NO_SSLv3, SSL_OP_NO_TLSv1, SSL_OP_NO_TLSv1_1, SSL_OP_NO_DTLSv1, SSL_OP_NO_DTLSv1_2 } = tls
const { AF_INET, SOCK_STREAM, SOCK_NONBLOCK, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, SOMAXCONN, IPPROTO_TCP, TCP_NODELAY, SO_KEEPALIVE, O_NONBLOCK, EAGAIN } = net
const { loop } = just.factory
const { EPOLLERR, EPOLLHUP, EPOLLIN, EPOLLOUT } = just.loop

function closeSocket (socket) {
  const { fd, buf, closed } = socket
  if (closed) return
  loop.remove(fd)
  delete sockets[fd]
  tls.shutdown(buf)
  tls.free(buf)
  net.close(fd)
  socket.closed = true
}

function onSocketEvent (fd, event) {
  const socket = sockets[fd]
  const { buf, secured, handshake } = socket
  if (event & EPOLLERR || event & EPOLLHUP) {
    closeSocket(socket)
    return
  }
  if (!handshake) {
    let r
    if (!secured) {
      r = tls.acceptSocket(fd, context, buf)
      socket.secured = true
    } else {
      r = tls.handshake(buf)
    }
    if (r === 1) {
      socket.handshake = true
      return
    }
    const err = tls.error(buf, r)
    if (err === tls.SSL_ERROR_WANT_WRITE) {
      loop.update(fd, EPOLLOUT)
    } else if (err === tls.SSL_ERROR_WANT_READ) {
      loop.update(fd, EPOLLIN)
    } else {
      just.print('socket handshake error')
      net.shutdown(fd)
    }
    return
  }
  if (event & EPOLLOUT) {
    loop.update(fd, EPOLLIN)
  }
  if (event & EPOLLIN) {
    const bytes = tls.read(buf)
    if (bytes > 0) {
      tls.write(buf, buf.writeString('HTTP/1.1 200 OK \r\nContent-Length: 0\r\n\r\n'))
      return
    }
    if (bytes < 0) {
      const err = tls.error(buf, bytes)
      if (err === tls.SSL_ERROR_WANT_READ) {
        const errno = sys.errno()
        if (errno !== EAGAIN) {
          just.print(`tls read error: ${sys.errno()}: ${sys.strerror(sys.errno())}`)
        }
      }
      return
    }
    const err = tls.error(buf, bytes)
    if (err === tls.SSL_ERROR_ZERO_RETURN) {
      just.print('tls read error: ssl has been shut down')
    } else {
      just.print('tls read error: connection has been aborted')
    }
    net.shutdown(fd)
  }
}

function onListenEvent (fd, event) {
  const clientfd = net.accept(fd)
  net.setsockopt(clientfd, IPPROTO_TCP, TCP_NODELAY, 1)
  net.setsockopt(clientfd, SOL_SOCKET, SO_KEEPALIVE, 1)
  let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
  flags |= O_NONBLOCK
  sys.fcntl(clientfd, sys.F_SETFL, flags)
  const buf = new ArrayBuffer(BUFSIZE)
  sockets[clientfd] = { fd: clientfd, buf, secured: false, handshake: false, closed: false }
  loop.add(clientfd, onSocketEvent, EPOLLIN | EPOLLOUT)
}

function onTimer () {
  just.print(just.memoryUsage().rss)
}

just.setInterval(onTimer, 1000)

const BUFSIZE = 16384
const options = BigInt(SSL_OP_ALL | SSL_OP_NO_RENEGOTIATION | SSL_OP_NO_SSLv3 | SSL_OP_NO_TLSv1 | SSL_OP_NO_TLSv1_1 | SSL_OP_NO_DTLSv1 | SSL_OP_NO_DTLSv1_2)
const context = tls.serverContext(new ArrayBuffer(0), 'cert.pem', 'key.pem', options)
const sockets = {}
const server = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
net.setsockopt(server, SOL_SOCKET, SO_REUSEADDR, 1)
net.setsockopt(server, SOL_SOCKET, SO_REUSEPORT, 1)
net.bind(server, '127.0.0.1', 3000)
net.listen(server, SOMAXCONN)
loop.add(server, onListenEvent)
