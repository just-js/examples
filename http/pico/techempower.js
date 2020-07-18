const { createServer } = just.require('./transport.js')
const { createParser } = just.require('./protocol.js')

function onConnect (sock) {
  const parser = sock.parser = createParser(new ArrayBuffer(BUFSIZE))
  parser.onRequests = count => {
    let off = 0
    for (let i = 0; i < count; i++) {
      const url = parser.url(i)
      let response = r404
      if (url === '/json') {
        const json = JSON.stringify(message)
        response = `HTTP/1.1 200 OK\r\nServer: V\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n${json}`
      } else if (url === '/plaintext') {
        const text = 'Hello, World!'
        response = `HTTP/1.1 200 OK\r\nServer: V\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: ${text.length}\r\n\r\n${text}`
      }
      if (response.length + off > out.byteLength) {
        sock.write(out, off)
        off = 0
      }
      off += out.writeString(response, off)
    }
    qps += count
    if (off > 0) sock.write(out, off)
  }
  const { buffer } = parser
  sock.buffer = buffer
  sock.onData = bytes => parser.parse(bytes)
  sock.onClose = () => {
    parser.free()
  }
  return buffer
}

let time = (new Date()).toUTCString()
let r404 = `HTTP/1.1 404 Not FOund\r\nServer: V\r\nDate: ${time}\r\nContent-Type: text.plain\r\nContent-Length: 0\r\n\r\n`
const BUFSIZE = 65536
let qps = 0
const out = new ArrayBuffer(BUFSIZE)
const server = createServer('0.0.0.0', 8088)
const message = { message: 'Hello, World!' }

server.onConnect = onConnect
server.listen()

const last = { user: 0, system: 0 }

just.setInterval(() => {
  const bw = 1000 * 1000 * 1000
  const { rss } = just.memoryUsage()
  const { user, system } = just.cpuUsage()
  const upc = ((user - last.user) / 1000000).toFixed(2)
  const spc = ((system - last.system) / 1000000).toFixed(2)
  const { conn, rps, wps } = server.stats
  just.print(`rps ${qps} mem ${rss} conn ${conn} cpu ${upc} / ${spc} Gbps  r ${((rps * 8) / bw).toFixed(2)} w ${((wps * 8) / bw).toFixed(2)}`)
  last.user = user
  last.system = system
  last.user = user
  last.system = system
  server.stats.rps = server.stats.wps = 0
  qps = 0
}, 1000)

just.setInterval(() => {
  time = (new Date()).toUTCString()
  r404 = `HTTP/1.1 404 Not FOund\r\nServer: V\r\nDate: ${time}\r\nContent-Type: text.plain\r\nContent-Length: 0\r\n\r\n`
}, 100)
