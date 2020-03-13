const { compile, evaluate, createMemory } = just.require('wasm')

function assert (condition, message = 'Assertion Failed') {
  if (!condition) throw new Error(message)
}

function getUint32 (off) {
  return (u8[off + 3] << 24) + (u8[off + 2] << 16) + (u8[off + 1] << 8) + u8[off]
}

function runTests (parse, name = parse.name) {
  function testSimple (repeat = 1) {
    const request = 'GET / HTTP/1.1\r\nHost: foo\r\n\r\n'
    const len = buffer.writeString(request.repeat(repeat), startData)
    const requests = parse(startData, len + startData)
    assert(requests === repeat)
    let off = startData
    for (let i = 0; i < requests; i++) {
      const str = buffer.readString(offsets[i] - off + 4, off)
      assert(str === request)
      off = offsets[i] + 4
    }
  }

  function testOverlap (repeat = 1) {
    u8.fill(0)
    const request = 'GET / HTTP/1.1\r\nHost: foo\r\n\r\nGET / HTTP/1.1\r\nHost: foo\r\n\r\n'
    const len = buffer.writeString(request, startData)
    assert(len === 58)
    let requests = 0
    for (let i = 4; i < len; i++) {
      requests = parse(startData, startData + i)
      just.print(`${i}: ${requests} : ${offsets[0]} : ${offsets[1]}`)
      assert(offsets[requests] === i + startData)
    }
  }

  function stress (repeat = 1, runs = 1000) {
    const request = 'GET / HTTP/1.1\r\nHost: foo\r\n\r\n'
    const len = buffer.writeString(request.repeat(repeat), startData)
    let count = 0
    let bytes = 0
    const start = Date.now()
    let i = runs
    while (i--) {
      count += parse(startData, len + startData)
      bytes += len
    }
    const elapsed = Date.now() - start
    assert(count === repeat * runs)
    assert(bytes === len * runs)
    const rps = Math.floor(count / (elapsed / 1000))
    const bps = Math.floor(bytes / (elapsed / 1000))
    const gbps = Math.floor(bps * 8 / (10000000)) / 100
    just.print(`${count} ${rps} ${gbps}`)
  }

  function stressmax (repeat = 1, runs = 1000, runtime = 1000) {
    const request = 'GET / HTTP/1.1\r\nHost: foo\r\n\r\n'
    const len = buffer.writeString(request.repeat(repeat), startData)
    let count = 0
    let bytes = 0
    let start = Date.now()
    let i = runs
    while (i--) {
      count += parse(startData, len + startData)
      bytes += len
    }
    let elapsed = Date.now() - start
    const factor = Math.floor(runtime / elapsed) // 5 seconds
    runs = runs * factor
    count = 0
    bytes = 0
    i = runs
    start = Date.now()
    while (i--) {
      count += parse(startData, len + startData)
      bytes += len
    }
    elapsed = Date.now() - start
    assert(count === repeat * runs)
    assert(bytes === len * runs)
    const rps = Math.floor(count / (elapsed / 1000))
    const bps = Math.floor(bytes / (elapsed / 1000))
    const gbps = Math.floor(bps * 8 / (10000000)) / 100
    just.print(`${count} ${rps} ${gbps}`)
  }
  for (let i = 4; i < 65536; i *= 2) {
    just.print(`${name}.testSimple: ${i}`)
    testSimple(i)
  }
  for (let i = 4; i < 65536; i *= 2) {
    just.print(`${name}.stress: ${i}`)
    stress(i)
  }
  just.print(`${name}.stressmax: 16384`)
  stressmax(16384)
  testOverlap(parse)
}

function jsparse (off, end) {
  let count = 0
  for (; off < end; off++) {
    if (dv.getUint32(off, true) === 168626701) offsets[count++] = off
  }
  offsets[count] = off
  return count
}

function jsparse2 (off, end) {
  let count = 0
  for (; off < end; off++) {
    if (getUint32(off) === 168626701) offsets[count++] = off
  }
  offsets[count] = off
  return count
}

const initalMemory = 20
const memory = createMemory({ initial: initalMemory })
const { buffer } = memory
const startData = 262144
const startOffsets = 0
const offsets = new Uint32Array(buffer, startOffsets, startData - startOffsets)
const dv = new DataView(buffer)
const u8 = new Uint8Array(buffer)

async function main () {
  const { wasm } = await compile('parse.wat')
  const { parse } = evaluate(wasm, {}, memory)
  while (1) {
    //runTests(jsparse, 'js')
    //runTests(jsparse2, 'js2')
    runTests(parse, 'wasm')
    just.sys.runMicroTasks()
    just.print(just.memoryUsage().rss)
  }
}

main().catch(err => just.error(err.stack))
