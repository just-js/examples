const { udp, net, sys } = just
const { tls } = just.library('openssl.so', 'tls')
const { AF_INET, SOCK_STREAM, SOCK_NONBLOCK, SOL_SOCKET, IPPROTO_TCP, TCP_NODELAY, SO_KEEPALIVE, EAGAIN } = net
const { EPOLLERR, EPOLLHUP, EPOLLIN, EPOLLOUT } = just.loop
const { loop } = just.factory
const { create, parse } = just.require('./dns.js')
const { createParser, HTTP_RESPONSE } = require('./protocol.js')

function lookup (query = 'www.google.com', onRecord = () => {}, address = '8.8.8.8', port = 53, buf = new ArrayBuffer(65536)) {
  const fd = net.socket(net.AF_INET, net.SOCK_DGRAM | net.SOCK_NONBLOCK, 0)
  net.bind(fd, address, port)
  loop.add(fd, (fd, event) => {
    const answer = []
    const len = udp.recvmsg(fd, buf, answer)
    const [address, port] = answer
    const message = { length: len, address, port, message: parse(buf, len) }
    loop.remove(fd)
    net.close(fd)
    onRecord(message)
  })
  const len = create(query, buf, 1)
  udp.sendmsg(fd, buf, address, port, len)
}

function closeSocket (socket) {
  const { fd, buf, closed } = socket
  if (closed) return
  loop.remove(fd)
  delete sockets[fd]
  tls.shutdown(buf)
  tls.free(buf)
  net.close(fd)
  socket.onClose && socket.onClose()
  socket.closed = true
}

function onSocketEvent (fd, event) {
  const socket = sockets[fd]
  const { buf, secured, handshake, context } = socket
  if (event & EPOLLERR || event & EPOLLHUP) {
    closeSocket(socket)
    return
  }
  if (!handshake) {
    let r
    if (!secured) {
      net.setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, 1)
      net.setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, 1)
      r = tls.connectSocket(fd, context, buf)
      socket.secured = true
    } else {
      r = tls.handshake(buf)
    }
    if (r === 1) {
      socket.handshake = true
      const parser = createParser(buf, HTTP_RESPONSE)
      parser.onResponses = count => {
        for (const res of parser.get(count)) {
          socket.onResponse(res)
        }
      }
      socket.parser = parser
      socket.onSecure()
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
    const bytes = tls.read(buf, buf.byteLength - buf.offset, buf.offset)
    if (bytes > 0) {
      if (socket.onData) socket.onData(bytes)
      if (socket.parser) socket.parser.parse(bytes)
      return
    }
    if (bytes < 0) {
      const err = tls.error(buf, bytes)
      if (err === tls.SSL_ERROR_WANT_READ) {
        const errno = sys.errno()
        if (errno !== EAGAIN) {
          just.print(`tls read error: ${sys.errno()}: ${sys.strerror(sys.errno())}`)
          net.shutdown(fd)
        }
      } else {
        just.print('uhu')
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

function parseUrl (url) {
  const protocolEnd = url.indexOf(':')
  const protocol = url.slice(0, protocolEnd)
  const hostnameEnd = url.indexOf('/', protocolEnd + 3)
  const hostname = url.slice(protocolEnd + 3, hostnameEnd)
  const path = url.slice(hostnameEnd)
  return { protocol, hostname, path }
}

function fetch (url, fileName) {
  const context = tls.clientContext(new ArrayBuffer(0))
  const { protocol, hostname, path } = parseUrl(url)
  const client = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  const buf = new ArrayBuffer(16384)
  const socket = {
    url,
    fileName,
    protocol,
    hostname,
    path,
    context,
    fd: client,
    buf,
    secured: false,
    handshake: false,
    closed: false,
    write: tls.write,
    close: () => closeSocket(socket)
  }
  sockets[client] = socket
  lookup(hostname, record => {
    const { message } = record
    const { ip } = message.answer[0]
    const r = net.connect(client, `${ip[0]}.${ip[1]}.${ip[2]}.${ip[3]}`, 443)
    if (r < 0) {
      const errno = sys.errno()
      if (errno !== 115) throw new Error(`connect failed: (${errno}) ${sys.strerror(errno)}`)
    }
    loop.add(client, onSocketEvent, EPOLLIN | EPOLLOUT)
  })
  return socket
}

const sockets = {}

module.exports = { fetch }
