const { print, sys, net } = just
const { zlib } = just.library('../../modules/zlib/zlib.so', 'zlib')
const { strerror, errno } = sys
const { close, read } = net
const BUFSIZE = 65536
let total = 0
const stdin = 0
const buf = new ArrayBuffer(BUFSIZE)
function toGib (bytes) {
  return Math.floor((bytes * 8) / (1000 * 1000 * 10)) / 100
}
const start = Date.now()
let crc32a = BigInt(0)
while (1) {
  const bytes = read(stdin, buf)
  if (bytes < 0) {
    const err = errno()
    just.print(`read error: ${strerror(err)} (${err})`)
    close(stdin)
    break
  }
  total += bytes
  crc32a = zlib.crc32(buf, bytes, crc32a)
  if (bytes === 0) {
    close(stdin)
    just.print(`bytes ${total} crc32: ${crc32a.toString(16)}`)
    const seconds = (Date.now() - start) / 1000
    print(`${toGib(total / seconds)} Gbit/sec`)
    break
  }
}
