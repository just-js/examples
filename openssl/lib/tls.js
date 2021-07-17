const { net, sys } = just
const { tls } = just.library('tls', 'openssl.so')
const { SSL_OP_ALL, SSL_OP_NO_RENEGOTIATION, SSL_OP_NO_SSLv3, SSL_OP_NO_TLSv1, SSL_OP_NO_TLSv1_1, SSL_OP_NO_DTLSv1, SSL_OP_NO_DTLSv1_2 } = tls
const { AF_INET, SOCK_STREAM, SOCK_NONBLOCK, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, SOMAXCONN, IPPROTO_TCP, TCP_NODELAY, SO_KEEPALIVE, O_NONBLOCK, EAGAIN } = net
const { loop } = just.factory
const { EPOLLERR, EPOLLHUP, EPOLLIN, EPOLLOUT } = just.loop

class Socket {
  constructor (fd, context) {
    this.buf = new ArrayBuffer(16384)
    this.fd = fd
    this.secured = false
    this.handshake = false
    this.closed = false
    this.context = context
    loop.add(fd, (fd, event) => this.onEvent(event), EPOLLIN | EPOLLOUT | EPOLLERR | EPOLLHUP)
  }

  close () {
    if (this.closed) return
    loop.remove(this.fd)
    just.print('shutdown')
    tls.shutdown(this.buf)
    tls.free(this.buf)
    net.close(this.fd)
    this.closed = true
    this.onClose()
  }

  onClose () {}

  onSecure () {}

  onData () {}

  writeString (str) {
    return tls.write(this.buf, this.buf.writeString(str))
  }

  onEvent (event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      this.close()
      return
    }
    if (!this.handshake) {
      let r
      if (!this.secured) {
        r = tls.acceptSocket(this.fd, this.context, this.buf)
        this.secured = true
      } else {
        r = tls.handshake(this.buf)
      }
      if (r === 1) {
        this.handshake = true
        this.onSecure()
      }
    }
    if (event & EPOLLOUT) {
      loop.update(this.fd, EPOLLIN)
    }
    if (event & EPOLLIN) {
      const bytes = tls.read(this.buf)
      just.print(bytes)
      if (bytes > 0) {
        this.onData(bytes)
        return
      }
      if (bytes < 0) {
        const err = tls.error(this.buf, bytes)
        if (err === tls.SSL_ERROR_WANT_READ) {
          const errno = sys.errno()
          if (errno !== EAGAIN) {
            just.print(`tls read error: ${sys.errno()}: ${sys.strerror(sys.errno())}`)
            this.close()
          }
        } else {
          just.print(`tls read error: negative bytes:  ${tls.error(this.buf, err)}`)
          this.close()
        }
        return
      }
      const err = tls.error(this.buf, bytes)
      if (err === tls.SSL_ERROR_ZERO_RETURN) {
        just.print(`tls read error: ssl has been shut down:  ${tls.error(this.buf, err)}`)
      } else {
        just.print(`tls read error: connection has been aborted: ${tls.error(this.buf, err)}`)
      }
      this.close()
    }
  }
}

class Server {
  constructor (opts = {}) {
    opts.ssl = opts.ssl || {}
    this.opts = opts
    this.domain = opts.domain || AF_INET
    this.type = opts.type || (SOCK_STREAM | SOCK_NONBLOCK)
    this.protocol = opts.protocol || 0
    this.ssl = {}
    this.ssl.options = opts.ssl.options || BigInt(SSL_OP_ALL | SSL_OP_NO_RENEGOTIATION | SSL_OP_NO_SSLv3 | SSL_OP_NO_TLSv1 | SSL_OP_NO_TLSv1_1 | SSL_OP_NO_DTLSv1 | SSL_OP_NO_DTLSv1_2)
    this.cert = opts.cert || 'cert.pem'
    this.key = opts.key || 'key.pem'
    this.reuseAddress = true
    this.reusePort = true
    this.fd = 0
    this.address = opts.address || '127.0.0.1'
    this.port = opts.port || 3000
  }

  listen () {
    if (!this.context) {
      this.context = tls.serverContext(new ArrayBuffer(0), this.cert, this.key, this.ssl.options)
      // return code?
    }
    if (!this.fd) {
      this.fd = net.socket(this.domain, this.type, this.protocol)
      if (this.fd === -1) return this.fd
    }
    if (this.reuseAddress) net.setsockopt(this.fd, SOL_SOCKET, SO_REUSEADDR, 1)
    if (this.reusePort) net.setsockopt(this.fd, SOL_SOCKET, SO_REUSEPORT, 1)
    net.bind(this.fd, this.address, this.port)
    net.listen(this.fd, SOMAXCONN)
    const server = this
    loop.add(this.fd, (fd, event) => {
      const clientfd = net.accept(fd)
      net.setsockopt(clientfd, IPPROTO_TCP, TCP_NODELAY, 1)
      net.setsockopt(clientfd, SOL_SOCKET, SO_KEEPALIVE, 1)
      let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
      flags |= O_NONBLOCK
      sys.fcntl(clientfd, sys.F_SETFL, flags)
      const socket = new Socket(clientfd, server.context)
      server.onSocket(socket)
    })
  }

  onSocket () {}
}

function createServer (opts) {
  return new Server(opts)
}

module.exports = { createServer }
