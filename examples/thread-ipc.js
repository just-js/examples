const { net, sys, path, args } = just
const { socketpair, AF_UNIX, SOCK_STREAM } = net

function ipcTest () {
  const { net } = just
  const fd = just.fd
  const shared = just.buffer
  const buf = new ArrayBuffer(4096)
  const u8 = new Uint8Array(shared)
  let bytes = net.recv(fd, buf)
  while (bytes > 0) {
    just.print(buf.readString(bytes))
    just.print(Atomics.load(u8, 0))
    bytes = net.recv(fd, buf)
  }
  net.close(fd)
}

const fds = []
socketpair(AF_UNIX, SOCK_STREAM, fds)
const shared = new SharedArrayBuffer(1024)
const u8 = new Uint8Array(shared)
const buf = new ArrayBuffer(4096)
let source = ipcTest.toString()
source = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
const threadName = `${path.join(sys.cwd(), args[1])}#ipcTest`
const tid = just.thread.spawn(source, shared, fds[1], threadName)
let counter = 10
do {
  const len = buf.writeString(`counter: ${counter}`)
  Atomics.store(u8, 0, counter)
  net.send(fds[0], buf, len)
  sys.sleep(1)
} while (--counter)
net.close(fds[0])
just.thread.join(tid)
