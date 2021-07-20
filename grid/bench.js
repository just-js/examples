const { createBlockStore } = require('./grid.js')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)
const mega = 1024 * 1024
const giga = mega * 1024

const blockStore = createBlockStore({ bucket: 256, block: 16384, bucketSize: 8 * giga })
blockStore.create()

function bench () {
  const start = Date.now()
  const todo = blockStore.totalSlots
  for (let i = 0; i < todo; i++) blockStore.lookup(i)
  const elapsed = (Date.now() - start) / 1000
  const mem = just.memoryUsage()
  just.print(`${todo} blocks of ${blockStore.blockSize} size read in ${elapsed.toFixed(2)} seconds at ${Math.floor(todo / elapsed)} ops/sec and ${Math.floor(((todo * blockStore.blockSize) / elapsed) / giga)} GB/sec rss ${mem.rss / BigInt(mega)} MB external ${mem.external_memory / BigInt(giga)} GB`)
  if (blockStore.counter !== todo) throw new Error(`Incorrect Ops Reported:  todo ${todo} done ${blockStore.counter}`)
  blockStore.counter = 0
}

while (1) bench()
