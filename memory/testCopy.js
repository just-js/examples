const { memory } = just.library('memory', './memory.so')
const { copy } = memory
const { memcpy } = just.sys
const { dump } = require('@binary')

const size = 4096
const source = ArrayBuffer.fromString('0'.repeat(size))
const dest = ArrayBuffer.fromString('0'.repeat(size))
const sid = memory.rawBuffer(source)
const did = memory.rawBuffer(dest)
const runs = 50000000

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

function mycopy (dest, source, off = 0, len = source.byteLength, start = 0) {
  new Uint8Array(dest).set(new Uint8Array(source, off, len), start)
}

function test3 () {
  const start = Date.now()
  for (let i = 0; i < runs; i++) mycopy(dest, source)
  just.print(`3: ${formatNumber(runs / ((Date.now() - start) / 1000))} ${just.memoryUsage().rss}`)
}

const du8 = new Uint8Array(dest)
const su8 = new Uint8Array(source)

function mycopy2 (du8, source, off = 0, len = source.byteLength, start = 0) {
  du8.set(new Uint8Array(source, off, len), start)
}

function test4 () {
  const start = Date.now()
  for (let i = 0; i < runs; i++) mycopy2(du8, source)
  just.print(`4: ${formatNumber(runs / ((Date.now() - start) / 1000))} ${just.memoryUsage().rss}`)
}

function test5 () {
  const start = Date.now()
  for (let i = 0; i < runs; i++) du8.set(su8)
  just.print(`5: ${formatNumber(runs / ((Date.now() - start) / 1000))} ${just.memoryUsage().rss}`)
}

function verify () {
  const s = new Uint8Array(source)
  const d = new Uint8Array(dest)

  just.print('memory.copy')
  for (let i = 0; i < source.byteLength; i++) {
    s[i] = Math.floor(Math.random() * 256)
  }
  copy(did, sid)
  for (let i = 0; i < dest.byteLength; i++) {
    if (s[i] !== d[i]) throw new Error('bytes dont match')
  }

  just.print('sys.memcpy')
  for (let i = 0; i < source.byteLength; i++) {
    s[i] = Math.floor(Math.random() * 256)
  }
  memcpy(dest, source)
  for (let i = 0; i < dest.byteLength; i++) {
    if (s[i] !== d[i]) throw new Error('bytes dont match')
  }

  just.print('native1')
  for (let i = 0; i < source.byteLength; i++) {
    s[i] = Math.floor(Math.random() * 256)
  }
  mycopy(dest, source)
  for (let i = 0; i < dest.byteLength; i++) {
    if (s[i] !== d[i]) throw new Error('bytes dont match')
  }

  just.print('native2')
  for (let i = 0; i < source.byteLength; i++) {
    s[i] = Math.floor(Math.random() * 256)
  }
  mycopy2(du8, source)
  for (let i = 0; i < dest.byteLength; i++) {
    if (s[i] !== d[i]) throw new Error('bytes dont match')
  }

  just.print('native3')
  for (let i = 0; i < source.byteLength; i++) {
    s[i] = Math.floor(Math.random() * 256)
  }
  du8.set(su8)
  for (let i = 0; i < dest.byteLength; i++) {
    if (s[i] !== d[i]) throw new Error('bytes dont match')
  }
}

verify()

while (1) {
  test1()
  //test2()
  //test3()
  //test4()
  test5()
}
