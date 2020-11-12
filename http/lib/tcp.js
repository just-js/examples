
const { sys, net } = just
const { EPOLLIN, EPOLLERR, EPOLLHUP, EPOLLOUT } = just.loop
const { IPPROTO_TCP, O_NONBLOCK, TCP_NODELAY, SO_KEEPALIVE, SOMAXCONN, AF_INET, SOCK_STREAM, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, SOCK_NONBLOCK, SO_ERROR } = net

const { loop } = just.factory

const readableMask = EPOLLIN | EPOLLERR | EPOLLHUP
const readableWritableMask = EPOLLIN | EPOLLERR | EPOLLHUP | EPOLLOUT

function createServer (host = '127.0.0.1', port = 3000) {
  const server = { host, port }
  const sockets = {}

  function closeSocket (sock) {
    const { fd } = sock
    sock.onClose && sock.onClose(sock)
    delete sockets[fd]
    loop.remove(fd)
    net.close(fd)
  }

  function onConnect (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      return closeSocket({ fd })
    }
    const clientfd = net.accept(fd)
    const socket = sockets[clientfd] = { fd: clientfd }
    net.setsockopt(clientfd, IPPROTO_TCP, TCP_NODELAY, 0)
    net.setsockopt(clientfd, SOL_SOCKET, SO_KEEPALIVE, 0)
    loop.add(clientfd, (fd, event) => {
      if (event & EPOLLERR || event & EPOLLHUP) {
        return closeSocket(socket)
      }
      const { offset } = buffer
      const bytes = net.recv(fd, buffer, offset, byteLength - offset)
      if (bytes > 0) {
        socket.onData(bytes)
        return
      }
      if (bytes < 0) {
        const errno = sys.errno()
        if (errno === net.EAGAIN) return
        just.error(`recv error: ${sys.strerror(errno)} (${errno})`)
      }
      closeSocket(socket)
    })
    let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
    flags |= O_NONBLOCK
    sys.fcntl(clientfd, sys.F_SETFL, flags)
    loop.update(clientfd, readableMask)
    socket.write = (buf, len = byteLength, off = 0) => {
      const written = net.send(clientfd, buf, len, off)
      if (written > 0) {
        return written
      }
      if (written < 0) {
        const errno = sys.errno()
        if (errno === net.EAGAIN) return written
        just.error(`write error (${clientfd}): ${sys.strerror(errno)} (${errno})`)
      }
      if (written === 0) {
        just.error(`zero write ${clientfd}`)
      }
      return written
    }
    socket.writeString = str => net.sendString(clientfd, str)
    socket.close = () => closeSocket(socket)
    socket.setNoDelay = on => net.setsockopt(clientfd, IPPROTO_TCP, TCP_NODELAY, on ? 1 : 0)
    socket.setKeepalive = on => net.setsockopt(clientfd, SOL_SOCKET, SO_KEEPALIVE, on ? 1 : 0)
    const buffer = server.onConnect(socket)
    const byteLength = buffer.byteLength
    buffer.offset = 0
  }

  function listen (maxconn = SOMAXCONN) {
    const r = net.listen(sockfd, maxconn)
    if (r === 0) loop.add(sockfd, onConnect)
    return r
  }
  const sockfd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, 1)
  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEPORT, 1)
  server.reuseAddress = on => net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, on ? 1 : 0)
  server.reusePort = on => net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEPORT, on ? 1 : 0)
  server.bind = () => net.bind(sockfd, host, port)
  server.listen = listen
  return server
}

function createClient (address = '127.0.0.1', port = 3000) {
  const sock = { address, port, connected: false }
  let fd
  let byteLength = 0

  function closeSocket () {
    sock.onClose && sock.onClose(sock)
    loop.remove(fd)
    net.close(fd)
  }

  function handleRead (fd, event) {
    const { offset } = buffer
    const bytes = net.recv(fd, buffer, offset, byteLength - offset)
    if (bytes > 0) {
      sock.onData(bytes)
      return
    }
    if (bytes < 0) {
      const errno = sys.errno()
      if (errno === net.EAGAIN) return
      just.print(`recv error: ${sys.strerror(errno)} (${errno})`)
    }
    closeSocket(sock)
  }

  function handleError (fd, event) {
    const errno = net.getsockopt(fd, SOL_SOCKET, SO_ERROR)
    if (!sock.connected) {
      sock.onConnect(new Error(`${errno} : ${just.sys.strerror(errno)}`))
    }
  }

  function handleWrite (fd, event) {
    if (!sock.connected) {
      net.setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, 0)
      net.setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, 0)
      let flags = sys.fcntl(fd, sys.F_GETFL, 0)
      flags |= O_NONBLOCK
      sys.fcntl(fd, sys.F_SETFL, flags)
      loop.update(fd, readableMask)
      sock.setNoDelay = on => net.setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, on ? 1 : 0)
      sock.setKeepalive = on => net.setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, on ? 1 : 0)
      buffer = sock.onConnect(null, sock)
      byteLength = buffer.byteLength
      buffer.offset = 0
      sock.connected = true
    }
    // todo: pause/drain or sock.onReadable/sock.onWritable
  }

  function onSocketEvent (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      handleError(fd, event)
      closeSocket()
      return
    }
    if (event & EPOLLIN) {
      handleRead(fd, event)
    }
    if (event & EPOLLOUT) {
      handleWrite(fd, event)
    }
  }

  sock.write = (buf, len = buf.byteLength, off = 0) => {
    const written = net.send(fd, buf, len, off)
    if (written > 0) {
      return written
    }
    if (written < 0) {
      const errno = sys.errno()
      if (errno === net.EAGAIN) return written
      just.error(`write error (${fd}): ${sys.strerror(errno)} (${errno})`)
    }
    if (written === 0) {
      just.error(`zero write ${fd}`)
    }
    return written
  }
  sock.writeString = str => net.sendString(fd, str)

  sock.close = () => closeSocket(sock)

  function connect () {
    fd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
    loop.add(fd, onSocketEvent, readableWritableMask)
    net.connect(fd, address, port)
    sock.fd = fd
    return sock
  }

  let buffer
  sock.connect = connect
  return sock
}

module.exports = { createServer, createClient }
