const { createServer } = just.require('./lib/transport.js')
const { createParser } = just.require('./lib/protocol.js')
const postgres = require('./lib/pg.js')

function onConnect (sock) {
  const parser = sock.parser = createParser(new ArrayBuffer(BUFSIZE))
  parser.onRequests = count => {
    let off = 0
    for (let i = 0; i < count; i++) {
      const url = parser.url(i)
      let response = r404
      if (url === '/json') {
        const json = JSON.stringify(message)
        response = `HTTP/1.1 200 OK\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json; charset=UTF-8\r\nContent-Length: ${json.length}\r\n\r\n${json}`
      } else if (url === '/plaintext') {
        const text = 'Hello, World!'
        response = `HTTP/1.1 200 OK\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: ${text.length}\r\n\r\n${text}`
      } else if (url === '/db') {
        const rows = executePrepared(handle, 'select * from World where id = $1;', 'find_world_by_id', [Math.ceil(Math.random() * 10000)], [INT4OID])
        if (rows.length) {
          const json = JSON.stringify(rows[0])
          response = `HTTP/1.1 200 OK\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n${json}`
        } else {
          response = `HTTP/1.1 404 Not Found\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: 0\r\n\r\n`
        }
      } else if (url === '/db2') {
        const rows = execute(handle, `select * from World where id = ${Math.ceil(Math.random() * 10000)};`)
        if (rows.length) {
          const json = JSON.stringify(rows[0])
          response = `HTTP/1.1 200 OK\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n${json}`
        } else {
          response = `HTTP/1.1 404 Not Found\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: 0\r\n\r\n`
        }
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

function connect () {
  handle = postgres.connect(connString)
  if (!handle) {
    just.error('could not connect')
    just.setTimeout(connect, 1000)
    return
  }
  server.listen()
}

function onClock () {
  Atomics.add(u32, 0, qps)
  qps = 0
  time = (new Date()).toUTCString()
  r404 = `HTTP/1.1 404 Not Found\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n`
}

function onStats () {
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const upc = ((user - last.user) / 1000000)
  const spc = ((system - last.system) / 1000000)
  last.user = user
  last.system = system
  just.print(`qps ${qps} mem ${rss} cpu (${upc.toFixed(2)}/${spc.toFixed(2)}) ${(upc + spc).toFixed(2)} qps/core ${(qps / (upc + spc)).toFixed(2)}`)
  r404 = `HTTP/1.1 404 Not Found\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n`
  qps = 0
}

const { execute, executePrepared } = postgres
const { INT4OID } = postgres.pg
const BUFSIZE = 65536
let qps = 0
const out = new ArrayBuffer(BUFSIZE)
const server = createServer('0.0.0.0', 8080)
const message = { message: 'Hello, World!' }
const connString = 'postgres://benchmarkdbuser:benchmarkdbpass@tfb-database/hello_world'
let handle
let time
let r404
let u32
const last = { user: 0, system: 0 }
server.onConnect = onConnect
connect()
if (just.buffer) {
  u32 = new Uint32Array(just.buffer)
  just.setInterval(onClock, 100)
} else {
  just.setInterval(onStats, 1000)
}
