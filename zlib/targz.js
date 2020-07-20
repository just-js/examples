const { net, sys } = just
const { zlib } = just.library('../../modules/zlib/zlib.so', 'zlib')
const { socketpair, AF_UNIX, SOCK_STREAM } = net

function createPipe () {
  const fds = []
  const r = socketpair(AF_UNIX, SOCK_STREAM, fds)
  if (r !== 0) throw new Error(`socketpair ${r} errno ${sys.errno()} : ${sys.strerror(sys.errno())}`)
  return fds
}

function process (fd) {
  const buf = new ArrayBuffer(16 * 1024)
  const deflate = zlib.createDeflate(buf, 16 * 1024, zlib.Z_DEFAULT_COMPRESSION, 31)
  let written = 0
  let len = net.read(fd, buf)
  while (len > 0) {
    written = zlib.writeDeflate(deflate, len, zlib.Z_NO_FLUSH)
    if (written < 0) throw new Error(`writeDeflate: ${written}`)
    if (written > 0) {
      written = net.write(1, deflate, written)
      if (written < 0) throw new Error(`net.write: ${written} (${sys.errno()}) ${sys.strerror(sys.errno())}`)
    }
    len = net.read(fd, buf)
  }
  written = zlib.writeDeflate(deflate, 0, zlib.Z_FINISH)
  if (written < 0) throw new Error(`writeDeflate: ${written}`)
  if (written > 0) {
    written = net.write(1, deflate, written)
    if (written < 0) throw new Error(`net.write: ${written} (${sys.errno()}) ${sys.strerror(sys.errno())}`)
  }
  zlib.endDeflate(deflate, true)
}

const stdin = createPipe()
const stdout = createPipe()
const stderr = createPipe()

sys.spawn('tar', sys.cwd(), ['-cvO', just.args[2]], stdin[1], stdout[1], stderr[1])

process(stdout[0])
