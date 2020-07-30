const { PGConnect } = require('./lib/pgNative.js')
function onConnect (status) {
  const client = this
  function query () {
    client.query('select * from World limit 10;', res => {
      count++
      query()
    })
  }
  query()
}

PGConnect('127.0.0.1', 5432, 'benchmarkdbuser', 'benchmarkdbpass', 'hello_world', onConnect)
PGConnect('127.0.0.1', 5432, 'benchmarkdbuser', 'benchmarkdbpass', 'hello_world', onConnect)
PGConnect('127.0.0.1', 5432, 'benchmarkdbuser', 'benchmarkdbpass', 'hello_world', onConnect)
PGConnect('127.0.0.1', 5432, 'benchmarkdbuser', 'benchmarkdbpass', 'hello_world', onConnect)

const last = { user: 0, system: 0 }
let count = 0
let u32
if (just.buffer) {
  u32 = new Uint32Array(just.buffer)
}

just.setInterval(() => {
  if (u32) {
    Atomics.exchange(u32, 0, count)
  } else {
    const { user, system } = just.cpuUsage()
    const { rss } = just.memoryUsage()
    const upc = ((user - last.user) / 1000000)
    const spc = ((system - last.system) / 1000000)
    last.user = user
    last.system = system
    just.print(`qps ${count} mem ${rss} cpu (${upc.toFixed(2)}/${spc.toFixed(2)}) ${(upc + spc).toFixed(2)} qps/core ${(count / (upc + spc)).toFixed(2)}`)
  }
  count = 0
}, 1000)
