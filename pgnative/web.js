const { createServer } = just.require('./lib/transport.js')
const { createParser } = just.require('./lib/protocol.js')
const pg = require('./pg.js')
const { connect } = pg
const { INT4OID } = pg.types

let qps = 0
let rps = 0
const clients = []
const last = { user: 0, system: 0 }
const args = [1]
const formats = [1]
const sql = 'select * from World where id = $1;'
const types = [INT4OID]
const name = 'test'
const config = {
  address: '127.0.0.1',
  port: 5432,
  user: 'benchmarkdbuser',
  pass: 'benchmarkdbpass',
  db: 'hello_world'
}

just.setInterval(() => {
  time = (new Date()).toUTCString()
  if (u32) {
    Atomics.exchange(u32, 0, rps)
  } else {
    const { user, system } = just.cpuUsage()
    const { rss } = just.memoryUsage()
    const upc = ((user - last.user) / 1000000)
    const spc = ((system - last.system) / 1000000)
    last.user = user
    last.system = system
    just.print(`qps ${qps} rps ${rps} clients ${clients.length} mem ${rss} cpu (${upc.toFixed(2)}/${spc.toFixed(2)}) ${(upc + spc).toFixed(2)} qps/core ${(qps / (upc + spc)).toFixed(2)}`)
  }
  qps = 0
  rps = 0
}, 1000)

function onPGConnect (err, client) {
  if (err) return just.error(err.stack)
  client.call = (id, onComplete) => {
    args[0] = id
    execBoundCommand.callback = () => onComplete(client.rows)
    if (client.bound) {
      client.execBound(args, execBoundCommand)
      return
    }
    client.exec(execBoundCommand)
    client.flush()
  }
  function onBind () {
    clients.push(client)
    if (clients.length === connections) {
      startup()
    }
  }
  function onDescribe () {
    args[0] = Math.ceil(Math.random() * 10000)
    client.bind(name, args, formats, bindCommand)
    client.flush()
  }
  function onPrepare () {
    client.describe(name, 'S', onDescribe)
    client.flush()
  }
  function onMd5Auth () {
    client.prepare(sql, name, types, onPrepare)
    client.flush()
  }
  function onStartup (salt) {
    client.md5Auth(salt, onMd5Auth)
  }
  const bindCommand = { type: 'bind', callback: onBind }
  const execBoundCommand = { type: 'exec', callback: () => {} }
  client.startup(onStartup)
}

const connections = parseInt(just.args[2] || '1', 10)
let i = connections
while (i--) connect(config, onPGConnect)

const cache = {}

function install (sock) {
  const client = clients[sock.fd % connections]
  function onComplete () {
    qps++
    const [id, randomnumber] = client.rows[0]
    const json = JSON.stringify({ id, randomnumber })
    const response = `HTTP/1.1 200 OK\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n${json}`
    //cache[id] = response
    sock.write(out, out.writeString(response, 0))
    rps++
  }
  function dbHandler () {
    const id = Math.ceil(Math.random() * 10000)
    const response = cache[id]
    if (response) {
      sock.write(out, out.writeString(response, 0))
      rps++
      return
    }
    client.call(id, onComplete)
  }
  function notFoundHandler () {
    const r404 = `HTTP/1.1 404 Not Found\r\nServer: just-js\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n`
    sock.write(out, out.writeString(r404, 0))
  }
  return { '/db': dbHandler, notFoundHandler }
}

function onConnect (sock) {
  const parser = sock.parser = createParser(new ArrayBuffer(4096))
  const handlers = install(sock)
  parser.onRequests = count => {
    for (let i = 0; i < count; i++) (handlers[parser.url(i)] || handlers.notFoundHandler)()
  }
  sock.onData = bytes => parser.parse(bytes)
  sock.onClose = () => parser.free()
  return parser.buffer
}

const out = new ArrayBuffer(4096)
let time = (new Date()).toUTCString()
let u32

function startup () {
  just.print(`startup ${clients.length}`)
  const server = createServer('0.0.0.0', 8080)
  server.onConnect = onConnect
  server.listen()
}
if (just.buffer) {
  u32 = new Uint32Array(just.buffer)
}
