
const { sys, net } = just
const { EPOLLIN, EPOLLERR, EPOLLHUP } = just.loop
const { IPPROTO_TCP, O_NONBLOCK, TCP_NODELAY, SO_KEEPALIVE, SOMAXCONN, AF_INET, SOCK_STREAM, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, SOCK_NONBLOCK } = net

const { loop } = just.factory
const BUFFER_SIZE = 16384

function createServer (host = '127.0.0.1', port = 3000) {
  const server = { host, port, stats: { conn: 0, rps: 0, wps: 0 } }
  const sockets = {}

  function closeSocket (sock) {
    const { fd } = sock
    sock.onClose()
    delete sockets[fd]
    net.close(fd)
    server.stats.conn--
  }

  function onConnect (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) return closeSocket({ fd })
    const clientfd = net.accept(fd)
    const socket = sockets[clientfd] = { fd: clientfd, stats: { in: 0, out: 0 } }
    net.setsockopt(clientfd, IPPROTO_TCP, TCP_NODELAY, 1)
    net.setsockopt(clientfd, SOL_SOCKET, SO_KEEPALIVE, 1)
    loop.add(clientfd, (fd, event) => {
      if (event & EPOLLERR || event & EPOLLHUP) return closeSocket(socket)
      const bytes = net.recv(fd, buffer, buffer.offset, BUFFER_SIZE - buffer.offset)
      if (bytes > 0) {
        server.stats.rps += bytes
        socket.onData(bytes)
        return
      }
      if (bytes < 0) {
        const errno = sys.errno()
        if (errno === net.EAGAIN) return
        just.print(`recv error: ${sys.strerror(errno)} (${errno})`)
      }
      closeSocket(socket)
    })
    let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
    flags |= O_NONBLOCK
    sys.fcntl(clientfd, sys.F_SETFL, flags)
    loop.update(clientfd, EPOLLIN)
    socket.write = (buf, len) => {
      const written = net.send(clientfd, buf, len)
      if (written > 0) {
        server.stats.wps += written
      }
      return written
    }
    const buffer = server.onConnect(socket)
    server.stats.conn++
    buffer.offset = 0
  }

  function listen (maxconn = SOMAXCONN) {
    net.listen(sockfd, maxconn)
    loop.add(sockfd, onConnect)
  }
  server.listen = listen

  const sockfd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, 1)
  net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEPORT, 1)
  net.bind(sockfd, host, port)

  return server
}

module.exports = { createServer }
