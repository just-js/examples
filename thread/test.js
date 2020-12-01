const { thread } = just.library('thread', 'thread.so')
const { send, recv, socketpair, AF_UNIX, SOCK_STREAM } = just.net
const { errno, strerror } = just.sys

function main () {
  just.load('vm').vm.runScript(just.workerSource, 'foo.js')
}

function getSource (fn) {
  let source = fn.toString()
  source = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
  return source
}

function createPipe () {
  const fds = []
  const r = socketpair(AF_UNIX, SOCK_STREAM, fds)
  if (r !== 0) throw new Error(`socketpair ${r} errno ${errno()} : ${strerror(errno())}`)
  return fds
}

function threadMain () {
  const shared = just.buffer
  const { fd } = just
  const u32 = new Uint32Array(shared)
  const buf = new ArrayBuffer(4096)
  const { sys } = just.load('sys')
  const { net } = just.load('net')
  while (1) {
    Atomics.add(u32, 0, 1)
    const bytes = net.recv(fd, buf)
    just.print(`thread recv: ${sys.readString(buf, bytes)}`)
    sys.usleep(1000000)
  }
}

const ipc = createPipe()
const shared = new SharedArrayBuffer(4)
const u32 = new Uint32Array(shared)
const buf = new ArrayBuffer(128)
thread.spawn(getSource(threadMain), getSource(main), [], shared, ipc[1])
just.setInterval(() => {
  const counter = Atomics.load(u32, 0)
  send(ipc[0], buf, buf.writeString(`counter ${counter} rss ${just.memoryUsage().rss}`))
}, 1000)
