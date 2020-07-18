const { sys, net } = just
const { EPOLLERR, EPOLLIN, EPOLLOUT, EPOLLHUP } = just.loop
const { IPPROTO_TCP, O_NONBLOCK, TCP_NODELAY, SO_KEEPALIVE, SOMAXCONN, AF_INET, SOCK_STREAM, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, SOCK_NONBLOCK } = net
const { loop } = just.factory

const config = { BUFFER_SIZE: 65536 }

function createSocket (fd, buf, onClose) {
  const socket = { fd, buf }
  socket.pull = (off = 0) => {
    const bytes = net.recv(fd, buf, off)
    if (bytes > 0) return bytes
    if (bytes < 0) {
      const errno = sys.errno()
      if (errno !== net.EAGAIN) {
        just.print(sys.strerror(errno))
        onClose(fd)
      }
      return bytes
    }
    onClose(fd)
    return 0
  }
  socket.pause = () => loop.update(fd, EPOLLOUT)
  socket.write = (buf, len) => {
    const r = net.send(fd, buf, len)
    if (r < 0) {
      const errno = sys.errno()
      if (errno === net.EAGAIN) {
        socket.pause()
        return 0
      }
      just.print(`write: (${errno}) ${sys.strerror(errno)}`)
      socket.close()
      return r
    }
    if (r === 0) {
      just.print('zero bytes')
      socket.close()
      return -1
    }
    return r
  }
  socket.onReadable = socket.onWritable = socket.onEnd = () => {}
  socket.close = () => net.close(fd)
  return socket
}

function createServer (onConnect, opts = { bufSize: config.BUFFER_SIZE }) {
  function closeSocket (fd) {
    clients[fd].onEnd()
    delete clients[fd]
    net.close(fd)
  }
  function onSocketEvent (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      closeSocket(fd)
      return
    }
    if (event & EPOLLIN) {
      clients[fd].onReadable()
      return
    }
    if (event & EPOLLOUT) {
      loop.update(fd, EPOLLIN)
      clients[fd].onWritable()
    }
  }
  function onListenEvent (fd, event) {
    const clientfd = net.accept(fd)
    net.setsockopt(clientfd, IPPROTO_TCP, TCP_NODELAY, 1)
    net.setsockopt(clientfd, SOL_SOCKET, SO_KEEPALIVE, 1)
    let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
    flags |= O_NONBLOCK
    sys.fcntl(clientfd, sys.F_SETFL, flags)
    loop.add(clientfd, onSocketEvent)
    const sock = createSocket(clientfd, new ArrayBuffer(opts.bufSize), closeSocket)
    clients[clientfd] = sock
    onConnect(sock)
  }
  const clients = {}
  const server = Object.assign({
    maxPipeline: 256,
    reuseAddress: true,
    reusePort: true
  }, opts)
  const fd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  if (fd <= 0) throw new Error(`Failed Creating Socket: ${sys.strerror(sys.errno())}`)
  if (server.reuseAddress && net.setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, 1) !== 0) throw new Error(`Failed Setting Reuse Address Socket Option: ${sys.strerror(sys.errno())}`)
  if (server.reusePort && net.setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, 1) !== 0) throw new Error(`Failed Setting Reuse Port Socket Option: ${sys.strerror(sys.errno())}`)
  server.listen = (address = '127.0.0.1', port = 3000, maxconn = SOMAXCONN) => {
    if (net.bind(fd, address, port) !== 0) throw new Error(`Failed Binding Socket: ${sys.strerror(sys.errno())}`)
    if (net.listen(fd, maxconn) !== 0) throw new Error(`Failed Listening on Socket: ${sys.strerror(sys.errno())}`)
    loop.add(fd, onListenEvent)
    return server
  }
  return server
}

function createClient (onConnect, opts = { bufSize: config.BUFFER_SIZE }) {
  const fd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  if (fd <= 0) throw new Error(`Failed Creating Socket: ${sys.strerror(sys.errno())}`)
  const sock = { fd, connected: false }
  function onSocketEvent (fd, event) {
    if (event & EPOLLOUT) {
      if (!sock.connected) {
        sock.connected = true
        onConnect(sock)
      }
      loop.update(fd, EPOLLIN)
      sock.onWritable()
    }
    if (event & EPOLLERR || event & EPOLLHUP) {
      just.print('err')
      return net.close(fd)
    }
    if (event & EPOLLIN) return sock.onReadable()
  }
  sock.connect = (address = '127.0.0.1', port = 3000) => {
    const r = net.connect(fd, address, port)
    if (r !== 0) {
      const errno = sys.errno()
      if (errno !== 115) {
        throw new Error(`Failed Connecting: ${sys.strerror(errno)}`)
      }
    }
    net.setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, 1)
    net.setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, 1)
    loop.add(fd, onSocketEvent, EPOLLOUT)
    return Object.assign(sock, createSocket(fd, new ArrayBuffer(opts.bufSize), () => net.close(fd)))
  }
  return sock
}

module.exports = { createServer, createClient, config }
