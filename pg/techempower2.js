const { createServer } = just.require('./lib/transport.js')
const { createParser } = just.require('./lib/protocol.js')
const { PGConnect } = require('./lib/pgNative.js')

const clients = []
const POOLSIZE = 8

function install (sock) {
  function jsonHandler () {
    const json = JSON.stringify(message)
    sock.write(out, out.writeString(`HTTP/1.1 200 OK\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json; charset=UTF-8\r\nContent-Length: ${json.length}\r\n\r\n${json}`, 0))
    qps++
  }
  function plaintextHandler () {
    const text = 'Hello, World!'
    sock.write(out, out.writeString(`HTTP/1.1 200 OK\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: ${text.length}\r\n\r\n${text}`, 0))
    qps++
  }
  function dbHandler () {
    clients[sock.fd % POOLSIZE].query(`select * from World where id = ${Math.ceil(Math.random() * 10000)};`, res => {
      const json = JSON.stringify(res.rows[0])
      sock.write(out, out.writeString(`HTTP/1.1 200 OK\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n${json}`, 0))
      qps++
    })
  }
  function notFoundHandler () {
    sock.write(out, out.writeString(r404, 0))
    qps++
  }
  return { '/db': dbHandler, '/json': jsonHandler, '/plaintext': plaintextHandler, notFoundHandler }
}

function onConnect (sock) {
  const parser = sock.parser = createParser(new ArrayBuffer(BUFSIZE))
  const handlers = install(sock)
  parser.onRequests = count => {
    for (let i = 0; i < count; i++) (handlers[parser.url(i)] || handlers.notFoundHandler)()
  }
  sock.onData = bytes => parser.parse(bytes)
  sock.onClose = () => parser.free()
  return parser.buffer
}

function onStats () {
  time = (new Date()).toUTCString()
  r404 = `HTTP/1.1 404 Not Found\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n`
  if (u32) {
    Atomics.exchange(u32, 0, qps)
  } else {
    const { user, system } = just.cpuUsage()
    const { rss } = just.memoryUsage()
    const upc = ((user - last.user) / 1000000)
    const spc = ((system - last.system) / 1000000)
    last.user = user
    last.system = system
    const pending = clients.reduce((a, v) => a + v.pending.length, 0)
    just.print(`qps ${qps} mem ${rss} cpu (${upc.toFixed(2)}/${spc.toFixed(2)}) ${(upc + spc).toFixed(2)} qps/core ${(qps / (upc + spc)).toFixed(2)} pending ${pending}`)
    r404 = `HTTP/1.1 404 Not Found\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n`
  }
  qps = 0
}

const BUFSIZE = 4096
let qps = 0
const out = new ArrayBuffer(BUFSIZE)
const server = createServer('0.0.0.0', 8080)
const message = { message: 'Hello, World!' }
let time
let r404
let u32
const last = { user: 0, system: 0 }
server.onConnect = onConnect
let listening = false
function onPGConnect (status) {
  if (!listening) {
    server.listen()
    listening = true
  }
}
for (let i = 0; i < POOLSIZE; i++) clients.push(PGConnect('127.0.0.1', 5432, 'benchmarkdbuser', 'benchmarkdbpass', 'hello_world', onPGConnect))
just.setInterval(onStats, 1000)
if (just.buffer) {
  u32 = new Uint32Array(just.buffer)
}
