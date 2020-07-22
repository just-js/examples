const postgres = require('./pg.js')
const { connect, execute, executePrepared } = postgres
const { INT4OID } = postgres.pg

function stressRaw () {
  for (let i = 0; i < 20; i++) {
    JSON.stringify(execute(handle, `select id, randomnumber from World where id = ${Math.ceil(Math.random() * 10000)}`))
    qps++
  }
  just.setTimeout(stressRaw, 1)
}

function stressPrepared () {
  for (let i = 0; i < 20; i++) {
    JSON.stringify(executePrepared(handle, stmt, stmtName, [Math.ceil(Math.random() * 10000)], [INT4OID]))
    qps++
  }
  just.setTimeout(stressPrepared, 1)
}

function onTimer () {
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const upc = ((user - last.user) / 1000000)
  const spc = ((system - last.system) / 1000000)
  last.user = user
  last.system = system
  just.print(`total ${qps} mem ${rss} cpu (${upc.toFixed(2)}/${spc.toFixed(2)}) ${(upc + spc).toFixed(2)} qps/core ${(qps / (upc + spc)).toFixed(2)}`)
  if (u32) {
    Atomics.exchange(u32, 0, qps)
  }
  qps = 0
}

let u32
if (just.buffer) {
  u32 = new Uint32Array(just.buffer)
}
const handle = connect('postgres://benchmarkdbuser:benchmarkdbpass@tfb-database/hello_world')
if (!handle) throw new Error('Could Not Connect')
const stmt = 'select id, randomnumber from World where id = $1'
const stmtName = 'find_world_by_id'
let qps = 0
const tests = { raw: stressRaw, prepared: stressPrepared }
just.setInterval(onTimer, 1000)
const last = { user: 0, system: 0 }
tests[just.args[2] || 'prepared']()
just.print(just.sys.pid())
