const { net, sys, error } = just
const { read, write } = net
const { exit, strerror, errno, STDIN_FILENO, STDOUT_FILENO } = sys
const BUFSIZE = 65536

const buf = new ArrayBuffer(BUFSIZE)
let size = 0
let n = 0
const start = Date.now()
do {
  n = read(STDIN_FILENO, buf, 0, BUFSIZE)
  if (n <= 0) break
  size += n
  n = write(STDOUT_FILENO, buf, n, 0)
} while (n)
if (n < 0) {
  error(`read: ${strerror(errno())} (${errno()})`)
  exit(1)
}
const elapsed = (Date.now() - start) / 1000
const rate = Math.floor((size / elapsed) * 100) / 100
const GByte = Math.floor((rate / (1024 * 1024 * 1024) * 100) / 100)
const Gbit = Math.floor(GByte * 8)
error(`size: ${size} rate ${GByte} GB ${Gbit} Gbit`)
