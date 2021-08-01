const shared = just.buffer
const { fd } = just
const u32 = new Uint32Array(shared)
const buf = new ArrayBuffer(4096)
const { sys } = just.library('sys')
const { net } = just.library('net')
while (1) {
  Atomics.add(u32, 0, 1)
  const bytes = net.recv(fd, buf, 0, buf.byteLength)
  if (bytes > 0) {
    const message = sys.readString(buf, bytes)
    if (message === 'quit') break
    just.print(`thread recv: ${message}`)
  }
  sys.usleep(1000)
}
