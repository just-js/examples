const { createServer } = require('@tcp')
const { createParser } = require('@http')

const server = createServer('127.0.0.1', 3000)

server.onConnect = sock => {
  const buf = new ArrayBuffer(65536)
  const parser = createParser(buf)
  sock.onData = bytes => {
    return parser.parse(bytes)
  }
  sock.onClose = () => parser.free()
  parser.onRequests = count => {
    sock.writeString('HTTP/1.1 200 OK\r\nServer: foo\r\nContent-Length: 0\r\n\r\n'.repeat(count))
  }
  return buf
}

server.listen()

just.setInterval(() => {
  just.print(just.memoryUsage().rss)
}, 1000)
