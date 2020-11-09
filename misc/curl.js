const { cwd, errno, strerror, spawn, STDERR_FILENO, STDOUT_FILENO } = just.sys
const { socketpair, AF_UNIX, SOCK_STREAM, write, close, read } = just.net
const { EPOLLERR, EPOLLHUP, EPOLLIN } = just.loop

function createPipe () {
  const fds = []
  const r = socketpair(AF_UNIX, SOCK_STREAM, fds)
  if (r !== 0) throw new Error(`socketpair ${r} errno ${errno()} : ${strerror(errno())}`)
  return fds
}

global.onUnhandledRejection = (...args) => {
  just.print(JSON.stringify(args))
}

function curl (args) {
  const stdin = createPipe()
  const stdout = createPipe()
  const stderr = createPipe()
  const pid = spawn('curl', cwd(), args, stdin[1], stdout[1], stderr[1])
  close(stdin[0])
  return { pid, stdin, stdout, stderr }
}

function eventHandler (outfd, buf) {
  return (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      just.factory.loop.remove(fd)
      close(fd)
      return
    }
    if (event && EPOLLIN) {
      write(outfd, buf, read(fd, buf), 0)
    }
  }
}

async function main () {
  const { loop } = just.factory
  const { stdout, stderr } = curl(just.args.slice(2))
  const buf = new ArrayBuffer(4096)
  loop.add(stdout[0], eventHandler(STDOUT_FILENO, buf))
  loop.add(stderr[0], eventHandler(STDERR_FILENO, buf))
}

main().catch(err => just.error(err.stack))
