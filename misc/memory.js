const size = 8
const buffers = new Array(size)
const block = 8n * 1024n * 1024n * 1024n
const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)
const million = 1024n * 1024n

function memoryUsage () {
  const mem = just.memoryUsage()
  return { rss: Math.floor(Number(mem.rss / million)), external: Math.floor(Number(mem.external_memory / million)) }
}

for (let i = 0; i < size; i++) {
  buffers[i] = just.sys.calloc(1, block)
}

const edge = 8
const depth = 5
const cellsPerLevel = Math.pow(edge, 2)
const maxCells = Math.pow(cellsPerLevel, depth)

const indices = []
const levels = []
for (let d = depth; d > 0; d--) {
  levels.push(Math.pow(cellsPerLevel, d - 1))
}

just.print(`block size: ${cellsPerLevel} cells: ${maxCells} depth: ${depth}`)
just.print(`levels: ${JSON.stringify(levels)}`)

function getSlot (index) {
  let i = 0
  for (let d = depth; d > 0; d--) {
    if (index < levels[i]) {
      indices[i++] = 0
      continue
    }
    indices[i] = (Math.floor(index / levels[i])) % cellsPerLevel
    i++
  }
  return indices
}

const randoms = []
const randomLen = 10000
for (let i = 0; i < randomLen; i++) {
  randoms[i] = Math.floor(Math.random() * maxCells)
}

function run () {
  const start = Date.now()
  const runs = 100 * 1000000
  for (let i = 0; i < runs; i++) {
    getSlot(randoms[i % randomLen])
  }
  const elapsed = (Date.now() - start) / 1000
  just.print(`time ${elapsed} rate ${Math.floor(runs / elapsed)}\nmem ${stringify(memoryUsage())}`)
  just.setTimeout(run, 100)
}

run()
//require('repl').repl()

/*
just.setInterval(() => {
  just.print(stringify(memoryUsage()))
}, 1000)
*/
