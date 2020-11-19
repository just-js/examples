function byteLength3 (str) {
  let s = str.length
  for (let i = str.length - 1; i >= 0; i--) {
    const code = str.charCodeAt(i)
    if (code > 0x7f && code <= 0x7ff) s++
    else if (code > 0x7ff && code <= 0xffff) s += 2
  }
  return s
}

function getLength (str, i) {
  const code = str.charCodeAt(i)
  if (code <= 0x7f) return 0
  if (code > 0x7f && code <= 0x7ff) return 1
  if (code > 0x7ff && code <= 0xffff) return 2
}

function byteLength4 (str) {
  const len = str.length
  let s = len
  let i = 0
  while (i < len) s += getLength(str, i++)
  return s
}

function byteLength (str) {
  const len = str.length
  let s = len
  let code = 0
  let i = 0
  while (i < len) {
    code = str.charCodeAt(i++)
    if (code > 0x7f && code <= 0x7ff) s++
    else if (code > 0x7ff && code <= 0xffff) s += 2
  }
  return s
}

const buf = new ArrayBuffer(65536)
function byteLength2 (str) {
  return buf.writeString(str)
}

function bench (fun, str, num) {
  let total = 0
  while (num--) total += fun(str)
  return total
}

function runSmall (runs, fun) {
  const small = 'フレームワークのベンチマーク'
  const then = Date.now()
  const done = bench(fun, small, runs)
  if (done !== (runs * byteLength2(small))) throw new Error('bad result')
  const elapsed = Date.now() - then
  const rate = Math.ceil((runs / (elapsed / 1000)))
  just.print(`small.${fun.name}  ${rate}`)
}

function runLarge (runs, fun) {
  const large = 'フレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマークフレームワークのベンチマーク'
  const then = Date.now()
  const done = bench(fun, large, runs)
  if (done !== (runs * byteLength2(large))) throw new Error('bad result')
  const elapsed = Date.now() - then
  const rate = Math.ceil((runs / (elapsed / 1000)))
  just.print(`large.${fun.name}  ${rate}`)
}

function run () {
  runLarge(parseInt(just.args[2] || '1000000', 10), String.byteLength)
  runSmall(parseInt(just.args[3] || '100000000', 10), String.byteLength)
  just.setTimeout(run, 100)
}

run()
