const { thread } = just.library('thread')
const { readFile } = require('fs')

const main = just.builtin('just.js')

const cores = [2, 3, 4, 5]
let current = 0
just.print(just.sys.pid())

function spawn (source) {
  const shared = new SharedArrayBuffer(4)
  const u32 = new Uint32Array(shared)
  const tid = thread.spawn(source, main, just.args.slice(1), shared)
  thread.setAffinity(tid, cores[current++])
  const core = thread.getAffinity(tid)
  if (current === cores.length) current = 0
  const t = { tid, u32, core, shared }
  threads.push(t)
  return t
}

let last = 0
function onTimer () {
  const { user, system, elapsed } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  let total = 0
  for (const thread of threads) {
    total += Atomics.exchange(thread.u32, 0, 0)
  }
  const u = user / elapsed
  const s = system / elapsed
  const jitter = Math.abs(total - last) / total
  last = total
  just.print(`threads ${threads.length} total ${total} mem ${rss} cpu (${u.toFixed(2)}/${s.toFixed(2)}) ${(u + s).toFixed(2)} qps/core ${(total / (u + s)).toFixed(2)} mem/core ${(Number(rss) / threads.length).toFixed(0)} jitter ${jitter.toFixed(2)}`)
}

const source = readFile(just.args[2] || 'test.js')
const cpus = parseInt(just.env().CPUS || just.sys.cpus, 10)
const threads = []
for (let i = 0; i < cpus; i++) spawn(source)
just.setInterval(onTimer, 1000)
