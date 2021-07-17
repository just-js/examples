const { sys, net } = just
const { EPOLLIN, EPOLLERR, EPOLLHUP, EPOLLOUT } = just.loop
const { IPPROTO_TCP, O_NONBLOCK, TCP_NODELAY, SO_KEEPALIVE, SOMAXCONN, AF_INET, SOCK_STREAM, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, SOCK_NONBLOCK, SO_ERROR } = net

class Server {
  constructor (fd, loop = just.factory.loop) {
    this.fd = fd
    this.loop = loop
  }

  listen () {
    return net.listen(this.fd, SOMAXCONN)
  }

  onPeer (callback) {
    if (this.loop.handles[this.fd]) {
      this.loop.remove(this.fd)
    }
    this.loop.add(this.fd, (fd, event) = {

    })
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
const r = server.listen()
just.print(r)
server.onPeer((fd, event) => {
  just.print('peer')
})
