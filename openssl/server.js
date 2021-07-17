const { createServer } = require('lib/tls.js')
const { createParser } = require('./http.js')

const server = createServer()

server.onSocket = sock => {
  const parser = createParser(sock.buf)
  sock.onClose = () => {
    parser.free()
  }
  sock.onData = bytes => {
    parser.parse(bytes)
  }
  parser.onRequests = count => {
    const r = sock.writeString('HTTP/1.1 200 OK\r\nServer: foo\r\nContent-Length: 0\r\n\r\n'.repeat(count))
    just.print(r)
  }
}

server.listen()

just.setInterval(() => {
  just.print(just.memoryUsage().rss)
}, 1000)
