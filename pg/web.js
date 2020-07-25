const { createServer } = just.require('./lib/transport.js')
const { createParser } = just.require('./lib/protocol.js')
const postgres = require('./lib/pg.js')

function onConnect (sock) {
  const parser = sock.parser = createParser(new ArrayBuffer(BUFSIZE))
  function onQuery (err, rows) {
    if (err) {
      const json = JSON.stringify({ stack: err.stack, message: err.message })
      sock.write(out, out.writeString(`HTTP/1.1 500 Server Error\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n${json}`))
      qps++
      return
    }
    if (rows.length) {
      const json = JSON.stringify(rows[0])
      sock.write(out, out.writeString(`HTTP/1.1 200 OK\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n${json}`))
    } else {
      sock.write(out, out.writeString(r404))
    }
    qps++
  }
  parser.onRequests = count => {
    for (let i = 0; i < count; i++) {
      const url = parser.url(i)
      if (url === '/db') {
        query.params[0] = Math.ceil(Math.random() * 10000)
        conn.submit(query, onQuery)
        return
      }
      sock.write(out, out.writeString(r404))
      qps++
    }
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
  try {
    conn = PGConnect(connString)
  } catch (err) {
    just.error(err.stack)
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
  qps = 0
}

const { PGConnect } = postgres
const { INT4OID } = postgres.pg
const query = {
  name: 'find_world_by_id',
  sql: 'select * from World where id = $1;',
  params: [Math.ceil(Math.random() * 10000)],
  types: [INT4OID]
}
const last = { user: 0, system: 0 }
const BUFSIZE = 65536
const out = new ArrayBuffer(BUFSIZE)
const server = createServer('0.0.0.0', 8080)
const connString = 'postgres://benchmarkdbuser:benchmarkdbpass@tfb-database/hello_world'
let conn
let qps = 0
let time
let r404
let u32
server.onConnect = onConnect
connect()
if (just.buffer) {
  u32 = new Uint32Array(just.buffer)
  just.setInterval(onClock, 100)
} else {
  just.setInterval(onStats, 1000)
}
