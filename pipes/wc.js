const buf = new ArrayBuffer(65536)
let size = 0
let n = 0
while ((n = just.net.read(just.sys.STDIN_FILENO, buf))) size += n
if (n < 0) {
  just.error(`read: ${just.sys.strerror(just.sys.errno())} (${just.sys.errno()})`)
  just.sys.exit(1)
}
just.print(size)
