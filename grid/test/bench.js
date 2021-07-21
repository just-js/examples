const { createBlockStore } = require('../lib/grid.js')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)
const mega = 1024 * 1024
const giga = mega * 1024

const config = {
  bucket: 8,
  block: 65536,
  bucketSize: 8
}
const blockStore = createBlockStore(config)
blockStore.create()
just.print(stringify(blockStore))
function bench () {
  const start = Date.now()
  const todo = blockStore.totalSlots
  const runs = 400
  for (let x = 0; x < runs; x++) {
    for (let i = 0; i < todo; i++) blockStore.lookup(i)
  }
  const elapsed = (Date.now() - start) / 1000
  const mem = just.memoryUsage()
  just.print(`${todo * runs} blocks of ${blockStore.blockSize} size read in ${elapsed.toFixed(2)} seconds at ${Math.floor((todo * runs) / elapsed)} ops/sec and ${Math.floor((((todo * runs) * blockStore.blockSize) / elapsed) / giga)} GB/sec rss ${mem.rss / BigInt(mega)} MB external ${mem.external_memory / BigInt(giga)} GB`)
  if (blockStore.counter !== (todo * runs)) throw new Error(`Incorrect Ops Reported:  todo ${todo} done ${blockStore.counter}`)
  blockStore.counter = 0
}

while (1) bench()
