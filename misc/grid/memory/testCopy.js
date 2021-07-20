const { memory } = just.library('memory', './memory.so')
const { copy } = memory
const { memcpy } = just.sys

const source = ArrayBuffer.fromString('0'.repeat(4096))
const dest = ArrayBuffer.fromString('0'.repeat(4096))
const sid = memory.rawBuffer(source)
const did = memory.rawBuffer(dest)
const runs = 1000000

function formatNumber (number) {
  return `${Math.floor(number)}`.padStart(20, ' ')
}

function test1 () {
  const start = Date.now()
  for (let i = 0; i < runs; i++) copy(did, sid)
  just.print(`1: ${formatNumber(runs / ((Date.now() - start) / 1000))} ${just.memoryUsage().rss}`)
}

function test2 () {
  const start = Date.now()
  for (let i = 0; i < runs; i++) memcpy(dest, source)
  just.print(`2: ${formatNumber(runs / ((Date.now() - start) / 1000))} ${just.memoryUsage().rss}`)
}

while (1) {
  test1()
  test2()
}
