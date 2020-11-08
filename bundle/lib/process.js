const { cwd, errno, strerror, spawn } = just.sys
const { socketpair, AF_UNIX, SOCK_STREAM, write, close, read } = just.net
const { EPOLLERR, EPOLLHUP, EPOLLIN } = just.loop
const { loop } = just.factory

function createPipe () {
  const fds = []
  const r = socketpair(AF_UNIX, SOCK_STREAM, fds)
  if (r !== 0) throw new Error(`socketpair ${r} errno ${errno()} : ${strerror(errno())}`)
  return fds
}

function launch (program, args, workDir = cwd()) {
  const stdin = createPipe()
  const stdout = createPipe()
  const stderr = createPipe()
  const pid = spawn(program, workDir, args, stdin[1], stdout[1], stderr[1])
  close(stdin[0])
  const buf = new ArrayBuffer(4096)
  let closed = false
  loop.add(stdout[0], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      process.onClose && closed && process.onClose()
      just.factory.loop.remove(fd)
      closed = true
      close(fd)
      return
    }
    if (event & EPOLLIN) {
      process.onStdout && process.onStdout(buf, read(fd, buf))
    }
  })
  loop.add(stderr[0], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      process.onClose && closed && process.onClose()
      just.factory.loop.remove(fd)
      closed = true
      close(fd)
      return
    }
    if (event & EPOLLIN) {
      process.onStderr && process.onStderr(buf, read(fd, buf))
    }
  })
  const process = { pid, stdin, stdout, stderr }
  process.write = (b = buf, len = b.byteLength) => {
    write(stdin[0], b, len, 0)
  }
  return process
}

module.exports = { launch }
