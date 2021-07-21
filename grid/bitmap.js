const size = 1 * 1024 * 1024

const bitmapSize = Math.ceil(size / 8)

const buf = new ArrayBuffer(bitmapSize)
const u8 = new Uint8Array(buf)

just.print(size)

function set (id) {
  const byte = Math.floor(id / 8)
  const bit = id % 8
  u8[byte] = u8[byte] | (1 << bit)
}

function unset (id) {
  const byte = Math.floor(id / 8)
  const bit = id % 8
  u8[byte] = u8[byte] & ~(1 << bit)
}

function test (id) {
  const byte = Math.floor(id / 8)
  const bit = id % 8
  return Math.min((u8[byte] & (1 << bit)), 1)
}

//require('repl').repl()

let x = 0

function fTest () {
  x += test(Math.floor(Math.random() * size))
}

function fSet () {
  set(Math.floor(Math.random() * size))
}

function fUnset () {
  unset(Math.floor(Math.random() * size))
}

function bench (fn) {
  const runs = 1000 * 1000000
  const start = Date.now()
  for (let i = 0; i < runs; i++) {
    fn()
  }
  const elapsed = (Date.now() - start) / 1000
  just.print(`${fn.name}: time ${Date.now() - start} runs ${runs / (1000000)}m rate ${Math.floor((runs / elapsed) / 1000000)}m/sec ${x}`)
}

while (1) {
  bench(fTest)
  bench(fSet)
  bench(fUnset)
}
