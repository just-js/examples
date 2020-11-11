const { cwd, errno, strerror, spawn, fcntl, waitpid, FD_CLOEXEC } = just.sys
const { pipe, write, close, read, O_NONBLOCK, O_CLOEXEC } = just.net
const { EPOLLERR, EPOLLHUP, EPOLLIN, EPOLLOUT } = just.loop
const { loop } = just.factory

function setNonBlocking (fd) {
  let flags = fcntl(fd, just.sys.F_GETFL, 0)
  if (flags < 0) return flags
  flags |= O_NONBLOCK
  return fcntl(fd, just.sys.F_SETFL, flags)
}

function createPipe () {
  const fds = []
  const r = pipe(fds, O_CLOEXEC | O_NONBLOCK)
  if (r !== 0) throw new Error(`pipe ${r} errno ${errno()} : ${strerror(errno())}`)
  return fds
}

const READABLE = 0
const WRITABLE = 1

function launch (program, args, workDir = cwd(), buf = new ArrayBuffer(4096)) {
  const stdin = createPipe()
  const stdout = createPipe()
  const stderr = createPipe()
  // pass in the sides of the pipe to be used for STDIN, STDOUT and STDERR by child process
  const pid = spawn(program, workDir, args, stdin[READABLE], stdout[WRITABLE], stderr[WRITABLE])
  // close the child sides of the pipes in this process
  close(stdin[READABLE])
  close(stdout[WRITABLE])
  close(stderr[WRITABLE])
  let closed = false
  // listen for close of stdin
  loop.add(stdin[WRITABLE], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      process.onClose && !closed && process.onClose()
      just.factory.loop.remove(fd)
      closed = true
      close(fd)
      return
    }
    if (event & EPOLLOUT) {
      loop.update(fd, EPOLLIN)
      process.onWritable && process.onWritable()
    }
  }, EPOLLOUT)
  // listen to our side of the stdout pipe
  // todo: emit onReadable and onWritable and let consumer do the reading
  loop.add(stdout[READABLE], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      process.onClose && !closed && process.onClose()
      just.factory.loop.remove(fd)
      closed = true
      close(fd)
      return
    }
    if (event & EPOLLIN) {
      process.onStdout && process.onStdout(buf, read(fd, buf))
    }
  })
  // listen to our side of the stderr pipe
  loop.add(stderr[READABLE], (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      process.onClose && !closed && process.onClose()
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
  process.pause = () => {
    loop.update(stdin[WRITABLE], EPOLLOUT)
  }
  process.write = (b = buf, len = b.byteLength) => {
    // write to our side of the stdin pipe
    return write(stdin[WRITABLE], b, len, 0)
  }
  return process
}

function watch (p) {
  return new Promise((resolve) => {
    const timer = just.setInterval(() => {
      const [status, kpid] = waitpid(new Uint32Array(2), p.pid)
      if (kpid === p.pid) {
        resolve(status)
        just.clearInterval(timer)
      }
    }, 10)
  })
}

module.exports = { launch, watch, setNonBlocking }
