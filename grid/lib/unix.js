const { sys, net } = just
const { EPOLLIN, EPOLLERR, EPOLLHUP, EPOLLOUT } = just.loop
const { O_NONBLOCK, SOMAXCONN, SOCK_STREAM, AF_UNIX, SOCK_NONBLOCK } = net
const { loop } = just.factory
const { unlink } = just.fs

const readableMask = EPOLLIN | EPOLLERR | EPOLLHUP
const readableWritableMask = EPOLLIN | EPOLLERR | EPOLLHUP | EPOLLOUT

function createServer () {
  function closeSocket (sock) {
    if (sock.closing) return
    const { fd } = sock
    sock.closing = true
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
    const socket = sockets[clientfd] = { fd: clientfd, onReadable: () => {}, onWritable: () => {} }
    loop.add(clientfd, (fd, event) => {
      if (event & EPOLLERR || event & EPOLLHUP) {
        closeSocket(socket)
        return
      }
      if (event & EPOLLIN) {
        socket.onReadable()
        return
      }
      if (event & EPOLLOUT) {
        socket.onWritable()
        return
      }
      socket.onSpurious && socket.onSpurious(fd, event)
    })
    const flags = sys.fcntl(clientfd, sys.F_GETFL, 0) | O_NONBLOCK
    sys.fcntl(clientfd, sys.F_SETFL, flags)
    loop.update(clientfd, readableWritableMask)
    socket.close = () => closeSocket(socket)
    socket.pause = () => loop.update(socket.fd, readableWritableMask)
    socket.resume = () => loop.update(socket.fd, readableMask)
    socket.read = (buf, off, bytes) => {
      return net.read(socket.fd, buf, off, bytes)
    }
    socket.write = (buf, bytes, off) => {
      return net.write(socket.fd, buf, bytes, off)
    }
    socket.isEmpty = () => {
      return (sys.errno() === net.EAGAIN)
    }
    server.onConnect(socket)
  }

  const server = {}
  const sockets = {}

  server.listen = (maxconn = SOMAXCONN) => {
    const r = net.listen(server.fd, maxconn)
    if (r !== 0) return r
    return loop.add(server.fd, onConnect)
  }

  server.close = () => net.close(server.fd)

  server.bind = path => {
    server.fd = net.socket(AF_UNIX, SOCK_STREAM | SOCK_NONBLOCK, 0)
    if (server.fd < 0) return
    unlink(path)
    return net.bind(server.fd, path)
  }

  return server
}

function createClient () {
  function closeSocket () {
    if (socket.closing) return
    socket.closing = true
    socket.onClose && socket.onClose()
    loop.remove(socket.fd)
    net.close(socket.fd)
  }

  function onEvent (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      closeSocket()
      return
    }
    if (event & EPOLLIN) {
      socket.onReadable()
      return
    }
    if (event & EPOLLOUT) {
      socket.onWritable()
      return
    }
    socket.onSpurious && socket.onSpurious(fd, event)
  }

  const socket = { fd: 0, onReadable: () => {}, onWritable: () => {} }

  socket.connect = path => {
    socket.closing = false
    socket.fd = net.socket(AF_UNIX, SOCK_STREAM | SOCK_NONBLOCK, 0)
    if (socket.fd <= 0) return socket.fd
    const flags = sys.fcntl(socket.fd, sys.F_GETFL, 0) | O_NONBLOCK
    sys.fcntl(socket.fd, sys.F_SETFL, flags)
    loop.add(socket.fd, onEvent, readableWritableMask)
    return net.connect(socket.fd, path)
  }

  socket.pause = () => loop.update(socket.fd, readableWritableMask)
  socket.resume = () => loop.update(socket.fd, readableMask)
  socket.read = (buf, off, bytes) => {
    return net.read(socket.fd, buf, off, bytes)
  }
  socket.isEmpty = () => {
    return (sys.errno() === net.EAGAIN)
  }
  socket.write = (buf, bytes, off) => {
    return net.write(socket.fd, buf, bytes, off)
  }
  socket.close = () => closeSocket()

  return socket
}

module.exports = { createServer, createClient }
