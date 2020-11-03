const { net, sys, print, error } = just
const { read } = net
const { exit, strerror, errno, STDIN_FILENO } = sys
const BUFSIZE = 65536

const buf = new ArrayBuffer(BUFSIZE)
let size = 0
let n = 0
while ((n = read(STDIN_FILENO, buf))) size += n
if (n < 0) {
  error(`read: ${strerror(errno())} (${errno()})`)
  exit(1)
}
print(`size: ${size}`)
