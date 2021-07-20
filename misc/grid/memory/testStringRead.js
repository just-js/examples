const { memory } = just.library('memory', './memory.so')
const b = ArrayBuffer.fromString('0'.repeat(4096))
const { readString } = memory

const id = memory.rawBuffer(b)
const runs = 1000000

function test1 () {
  const start = Date.now()
  for (let i = 0; i < runs; i++) readString(id)
  just.print(`1: ${(runs / ((Date.now() - start) / 1000))}`)
}

function test2 () {
  const start = Date.now()
  for (let i = 0; i < runs; i++) b.readString()
  just.print(`2: ${(runs / ((Date.now() - start) / 1000))}`)
}

while (1) {
  test1()
  test2()
}
