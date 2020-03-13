const { net, sys } = just
const { socketpair, AF_UNIX, SOCK_STREAM } = net

function createPipe () {
  const fds = []
  const r = socketpair(AF_UNIX, SOCK_STREAM, fds)
  if (r !== 0) throw new Error(`socketpair ${r} errno ${sys.errno()} : ${sys.strerror(sys.errno())}`)
  return fds
}

function readInput (fd) {
  const chunks = []
  let bytes = net.recv(fd, buf)
  while (bytes > 0) {
    chunks.push(buf.readString(bytes))
    bytes = net.recv(fd, buf)
  }
  return chunks.join('')
}

const stdin = createPipe()
const stdout = createPipe()
const stderr = createPipe()
const buf = new ArrayBuffer(16 * 1024)

const pid = sys.spawn(just.args[2] || '/bin/ls', sys.cwd(), just.args.length > 2 ? just.args.slice(3) : ['-lah'], stdin[1], stdout[1], stderr[1])

just.print(`spawned: ${pid}`)
just.print(`stdout:\n${readInput(stdout[0])}`)
just.print(`stderr:\n${readInput(stderr[0])}`)
