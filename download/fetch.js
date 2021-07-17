const { net, sys } = just
const path = require('path')
const { tls } = just.library('tls', 'openssl.so')
const { AF_INET, SOCK_STREAM, SOCK_NONBLOCK, SOL_SOCKET, IPPROTO_TCP, TCP_NODELAY, SO_KEEPALIVE, EAGAIN } = net
const { EPOLLERR, EPOLLHUP, EPOLLIN, EPOLLOUT } = just.loop
const { loop } = just.factory
const { lookup } = require('@dns')
const { createParser, HTTP_RESPONSE, HTTP_CHUNKED } = require('@http')

function closeSocket (socket, err) {
  const { fd, buf, closed } = socket
  if (closed) return
  loop.remove(fd)
  delete sockets[fd]
  tls.shutdown(buf)
  tls.free(buf)
  net.close(fd)
  socket.onComplete && socket.onComplete(err)
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
      socket.parser = createParser(buf, HTTP_RESPONSE)
      socket.parser.onResponses = count => {
        for (const res of socket.parser.get(count)) {
          socket.onResponse(res)
          if (res.statusCode === 200) {
            const contentLength = parseInt(res.headers['Content-Length'] || 0, 10)
            let total = 0
            if (contentLength === 0) {
              res.chunked = true
              delete socket.parser
              const parser = createParser(buf, HTTP_CHUNKED)
              parser.onData = bytes => {
                total += bytes
                socket.onBody && socket.onBody(bytes)
              }
              parser.onEnd = () => {
                socket.close()
              }
              socket.onData = bytes => {
                parser.parse(bytes)
              }
              if (buf.offset > 0) {
                buf.copyFrom(buf, 0, buf.remaining, buf.offset)
                buf.offset = 0
                parser.parse(buf.remaining)
                buf.remaining = 0
              }
            } else {
              res.chunked = false
              socket.onData = (bytes) => {
                total += bytes
                socket.onBody && socket.onBody(bytes)
                if (total === contentLength) {
                  socket.close()
                }
                buf.offset = 0
              }
              if (buf.offset > 0) {
                socket.onBody && socket.onBody(buf.remaining)
                total += buf.remaining
              }
              delete socket.parser
            }
            buf.offset = 0
          } else if (res.statusCode === 302) {
            const { location } = res.headers
            just.print(`redirect ${location}`)
          }
        }
      }
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
    buf.offset = 0
    const bytes = tls.read(buf, buf.byteLength - buf.offset, buf.offset)
    if (bytes > 0) {
      if (socket.onData) socket.onData(bytes)
      if (socket.parser) {
        socket.parser.parse(bytes)
      }
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
        just.print(`tls error ${err}: ${sys.errno()}: ${sys.strerror(sys.errno())}`)
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

function get (url) {
  const context = tls.clientContext(new ArrayBuffer(0))
  const { protocol, hostname, path } = parseUrl(url)
  const client = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  const buf = new ArrayBuffer(65536)
  const socket = {
    url,
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
    close: err => closeSocket(socket, err)
  }
  sockets[client] = socket
  lookup(hostname, (err, ip) => {
    if (err) {
      just.error(err.stack)
      return
    }
    const r = net.connect(client, ip, 443)
    if (r < 0) {
      const errno = sys.errno()
      if (errno !== 115) throw new Error(`connect failed: (${errno}) ${sys.strerror(errno)}`)
    }
    loop.add(client, onSocketEvent, EPOLLIN | EPOLLOUT)
  })
  return socket
}

function download (url, fileName) {
  return new Promise((resolve, reject) => {
    const socket = get(url)
    const { buf } = socket
    socket.onSecure = () => {
      socket.write(buf, buf.writeString(`GET ${socket.path} HTTP/1.1\r\nUser-Agent: curl/7.58.0\r\nAccept: */*\r\nHost: ${socket.hostname}\r\n\r\n`))
    }
    socket.onResponse = res => {
      if (res.statusCode === 200) {
        if (!fileName) {
          const disposition = res.headers['Content-Disposition']
          if (disposition) {
            const [key, value] = disposition.split(';').map(v => v.trim())
            if (key === 'attachment') {
              const [, fName] = value.split('=')
              fileName = fName
            }
          }
        }
        if (!fileName) {
          fileName = path.fileName(url)
          // todo: check Content-Type header for file extension if we don't have a fileName
        }
        const file = { size: 0, fileName }
        res.file = file
        file.fd = just.fs.open(fileName, just.fs.O_WRONLY | just.fs.O_CREAT | just.fs.O_TRUNC)
        if (file.fd < 3) return socket.close(new Error(`failed to open output file ${fileName}`))
        socket.onBody = bytes => {
          just.net.write(file.fd, buf, bytes, buf.offset)
          res.file.size += bytes
        }
        socket.onComplete = err => {
          if (err) return reject(err)
          resolve(res)
        }
        return
      }
      reject(new Error('Bad Status Code'), res)
    }
  })
}

function fetch (url) {
  return new Promise((resolve, reject) => {
    const socket = get(url)
    const { buf } = socket
    socket.onSecure = () => {
      socket.write(buf, buf.writeString(`GET ${socket.path} HTTP/1.1\r\nUser-Agent: curl/7.58.0\r\nAccept: */*\r\nHost: ${socket.hostname}\r\n\r\n`))
    }
    socket.onResponse = res => {
      const parts = []
      res.size = 0
      res.contentType = res.headers['Content-Type']
      socket.onBody = bytes => {
        parts.push(buf.readString(bytes, buf.offset))
        res.size += bytes
      }
      socket.onComplete = err => {
        if (err) return reject(err)
        res.text = () => parts.join('')
        res.json = () => JSON.parse(parts.join(''))
        resolve(res)
      }
    }
  })
}

const sockets = {}

module.exports = { fetch, download }
