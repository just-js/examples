const postgres = require('./lib/pg.js')
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

let u32
if (just.buffer) {
  u32 = new Uint32Array(just.buffer)
  just.setInterval(() => {
    Atomics.add(u32, 0, qps)
    qps = 0
  }, 10)
}
const handle = connect('postgres://benchmarkdbuser:benchmarkdbpass@tfb-database/hello_world')
if (!handle) throw new Error('Could Not Connect')
const stmt = 'select id, randomnumber from World where id = $1'
const stmtName = 'find_world_by_id'
let qps = 0
const tests = { raw: stressRaw, prepared: stressPrepared }
just.print(JSON.stringify(just.args))
tests[just.args[2] || 'prepared']()
