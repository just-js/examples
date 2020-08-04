const { blake3 } = just.library('blake3.so', 'blake3')
const { create, update, finish, BLAKE3_OUT_LEN } = blake3
const { sys, net, encode } = just
const { strerror, errno } = sys
const { close, read } = net
const BUFSIZE = 65536
let total = 0
const stdin = sys.STDIN_FILENO
const buf = new ArrayBuffer(BUFSIZE)
function toGib (bytes) {
  return Math.floor((bytes * 8) / (1000 * 1000 * 10)) / 100
}
const start = Date.now()
const out = new ArrayBuffer(BLAKE3_OUT_LEN)
create(out)
while (1) {
  const bytes = read(stdin, buf)
  if (bytes < 0) {
    const err = errno()
    just.print(`read error: ${strerror(err)} (${err})`)
    close(stdin)
    break
  }
  if (bytes === 0) {
    finish(out)
    const seconds = (Date.now() - start) / 1000
    const hexLength = encode.hexEncode(out, buf, BLAKE3_OUT_LEN)
    const str = sys.readString(buf, hexLength)
    just.print(`bytes ${total} blake3 ${str} ${toGib(total / seconds)} Gbit/sec rss ${just.memoryUsage().rss}`)
    close(stdin)
    break
  }
  total += bytes
  update(out, buf, 0, bytes)
}
