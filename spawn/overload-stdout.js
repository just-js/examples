const { fcntl } = just.sys
const { O_NONBLOCK } = just.net

function setNonBlocking (fd) {
  let flags = fcntl(fd, just.sys.F_GETFL, 0)
  if (flags < 0) return flags
  flags |= O_NONBLOCK
  return fcntl(fd, just.sys.F_SETFL, flags)
}

const buf = ArrayBuffer.fromString('0'.repeat(65536))
const fd = just.sys.STDOUT_FILENO
setNonBlocking(fd)
just.error(just.sys.pid())
while (1) {
  const r = just.net.write(fd, buf)
  if (r < 65536) {
    just.error(r)
    just.sys.exit(1)
  }
}
