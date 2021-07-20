const { createBlockStore } = require('./grid.js')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)
function memoryUsage () {
  const mem = just.memoryUsage()
  return { rss: Math.floor(Number(mem.rss / BigInt(mega))), external: Math.floor(Number(mem.external_memory / BigInt(mega))) }
}

const mega = 1024 * 1024
const giga = mega * 1024

const blockStore = createBlockStore({ bucket: 1, block: 1024, bucketSize: 1 * giga })
blockStore.create()
just.print(stringify(blockStore))

const o = blockStore.lookup(100)
just.print(stringify(o))
just.print(stringify(memoryUsage()))

require('repl').repl()
