const { memory } = just.library('memory')

function usage () {
  const mem = just.memoryUsage()
  return `rss      ${Math.floor(Number(mem.rss / BigInt(mega))).toString().padStart(16, ' ')} MB
bucksize ${(size / mega).toString().padStart(16, ' ')} MB
size     ${((size * bucketCount) / giga).toString().padStart(16, ' ')} GB
block    ${block.toString().padStart(16, ' ')} Bytes
buckets  ${buckets.length.toString().padStart(16, ' ')}
capacity ${(capacity / Number(mega)).toString().padStart(16, ' ')} million
total    ${(total / Number(mega)).toString().padStart(16, ' ')} million
external ${Math.floor(Number(mem.external_memory / BigInt(mega))).toString().padStart(16, ' ')} MB`
}

function lookup (index) {
  // note: this only works for numbers up to 2^31 - use Math.floor(index / capacity)
  // https://stackoverflow.com/questions/4228356/how-to-perform-an-integer-division-and-separately-get-the-remainder-in-javascr
  record.bucket = (index / capacity) >> 0
  record.slot = (index % capacity)
  record.start = record.slot * block
  record.end = record.start + block
  //just.print(`index ${index} bucket ${record.bucket} start ${record.start} end ${record.end}`)
}

function readBlock1 (index) {
  lookup(index)
  const from = start[record.bucket] + BigInt(record.start)
  const to = start[record.bucket] + BigInt(record.start)
  return memory.readMemory(from, to)
}

function readBlock2 (index) {
  lookup(index)
  return new Uint8Array(buckets[record.bucket], record.start, block)
}

function readBlock3 (index) {
  lookup(index)
  return buckets[record.bucket].slice(record.start, record.end)
}

function readBlock4 (index) {
  return lookup(index)
}

function baseline (index) {}

function readAllSequential (fun = readBlock1, todo = total) {
  const start = Date.now()
  for (let i = 0; i < todo; i++) fun(i)
  const elapsed = (Date.now() - start) / 1000
  const mem = just.memoryUsage()
  just.print(`${fun.name.padEnd(20, ' ')}: ${todo} blocks of ${block} size read in ${elapsed} seconds at ${Math.floor(todo / elapsed)} ops/sec and ${Math.floor(((todo * block) / elapsed) / giga)} GB/sec rss ${mem.rss / BigInt(mega)} MB external ${mem.external_memory / BigInt(mega)} MB`)
}

function bench () {
  while (1) {
    //readAllSequential(baseline)
    //readAllSequential(readBlock1)
    readAllSequential(readBlock2)
    //readAllSequential(readBlock3)
    readAllSequential(readBlock4)
  }
}

const bucketCount = 64
const kilo = 1024
const mega = kilo * kilo
const giga = mega * kilo
const size = 8 * giga
const block = 4096
const buckets = (new Array(bucketCount)).fill(0).map(() => just.sys.calloc(1, BigInt(size)))
const capacity = Math.floor(Number(size) / block)
const total = capacity * buckets.length
const start = buckets.map(b => b.getAddress())
const record = { bucket: 0, slot: 0, start: 0, end: 0 }

//require('repl').repl()
just.print(usage())
bench()
