const { sys, net } = just
const { EPOLLIN, EPOLLERR, EPOLLHUP, EPOLLOUT } = just.loop
const { IPPROTO_TCP, O_NONBLOCK, TCP_NODELAY, SO_KEEPALIVE, SOMAXCONN, AF_INET, SOCK_STREAM, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, SOCK_NONBLOCK, SO_ERROR } = net

class Server {
  constructor (fd) {
    this.fd = fd
  }
}

function createTCPServerSocket (opts) {
  const fd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  net.setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, 1)
  net.setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, 1)
  return fd
}

function createServer (host = '127.0.0.1', port = 3000) {
  const fd = createTCPServerSocket()
  net.bind(fd, host, port)
  return new Server(fd)
}

const server = createServer()
just.print(JSON.stringify(server))
