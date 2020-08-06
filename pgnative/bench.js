const pg = require('./pg.js')
const { connect } = pg
const { INT4OID } = pg.types

let qps = 0
let clients = 0
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
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const upc = ((user - last.user) / 1000000)
  const spc = ((system - last.system) / 1000000)
  last.user = user
  last.system = system
  just.print(`qps ${qps} clients ${clients} mem ${rss} cpu (${upc.toFixed(2)}/${spc.toFixed(2)}) ${(upc + spc).toFixed(2)} qps/core ${(qps / (upc + spc)).toFixed(2)}`)
  qps = 0
}, 1000)

function onConnect (err, client) {
  if (err) return just.error(err.stack)
  function onExec () {
    qps++
    args[0] = Math.ceil(Math.random() * 10000)
    client.bind(name, args, formats, bindCommand)
    client.flush()
  }
  function onExecBound () {
    qps++
    args[0] = Math.ceil(Math.random() * 10000)
    client.execBound(args, execBoundCommand)
  }
  function onBind () {
    client.exec(execBoundCommand)
    //client.exec(execCommand)
    client.flush()
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
    clients++
    client.prepare(sql, name, types, onPrepare)
    client.flush()
  }
  function onStartup (salt) {
    client.md5Auth(salt, onMd5Auth)
  }
  const bindCommand = { type: 'bind', callback: onBind }
  const execCommand = { type: 'exec', callback: onExec }
  const execBoundCommand = { type: 'exec', callback: onExecBound }
  client.startup(onStartup)
}

let todo = parseInt(just.args[2] || '1', 10)
while (todo--) connect(config, onConnect)
