const { print, sys, net } = just
const { strerror, errno } = sys
const { close, read } = net
const BUFSIZE = 65536
let total = 0
const stdin = 0
const rbuf = new ArrayBuffer(BUFSIZE)
function toGib (bytes) {
  return Math.floor((bytes * 8) / (1000 * 1000 * 10)) / 100
}
const start = Date.now()
while (1) {
  const bytes = read(stdin, rbuf)
  if (bytes < 0) {
    const err = errno()
    just.print(`read error: ${strerror(err)} (${err})`)
    close(stdin)
    break
  }
  total += bytes
  if (bytes === 0) {
    close(stdin)
    const seconds = (Date.now() - start) / 1000
    print(`${toGib(total / seconds)} Gbit/sec`)
    print(JSON.stringify(just.memoryUsage(), null, '  '))
    break
  }
}
