const { zlib, net } = just

const fd = 0

const BUFSIZE = 65536
const buf = new ArrayBuffer(BUFSIZE)
const state = [0, 0]
const inflate = zlib.createInflate(buf, BUFSIZE, 31)

let written = 0
let err = 0
let len = net.read(fd, buf)
let off = 0
while (len) {
  err = zlib.writeInflate(inflate, buf, off, len, state, zlib.Z_NO_FLUSH)
  const [read, write] = state
  if (write) {
    written += net.write(1, inflate, write)
    if (err === zlib.Z_STREAM_END) {
      just.error(`gunzip rss: ${just.memoryUsage().rss} written: ${written}`)
      zlib.endInflate(inflate, true)
      break
    }
    if (err !== 0) {
      throw new Error('Goo')
    }
  }
  if (read === len) {
    len = net.read(fd, buf)
    off = 0
    continue
  }
  if (read < len) {
    len -= read
    off += read
  }
}
