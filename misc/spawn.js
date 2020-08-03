const { readFile } = require('fs')

function spawn (source) {
  const shared = new SharedArrayBuffer(4)
  const u32 = new Uint32Array(shared)
  const tid = just.thread.spawn(source, just.args.slice(1), shared)
  const thread = { tid, u32 }
  threads.push(thread)
  return thread
}

function onTimer () {
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const upc = ((user - last.user) / 1000000)
  const spc = ((system - last.system) / 1000000)
  last.user = user
  last.system = system
  let total = 0
  for (const thread of threads) {
    total += Atomics.exchange(thread.u32, 0, 0)
  }
  just.print(`total ${total} mem ${rss} cpu (${upc.toFixed(2)}/${spc.toFixed(2)}) ${(upc + spc).toFixed(2)} qps/core ${(total / (upc + spc)).toFixed(2)}`)
}

const last = { user: 0, system: 0 }
const source = readFile(just.args[2] || 'test.js')
const cpus = parseInt(just.env().CPUS || just.sys.cpus, 10)
const threads = []
for (let i = 0; i < cpus; i++) spawn(source)
just.setInterval(onTimer, 1000)
