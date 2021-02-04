const { loop } = just.factory
const { EPOLLERR, EPOLLHUP, EPOLLIN } = just.loop
const { close, read } = just.net
const pid = just.sys.pid()

just.setInterval(() => {
  just.print(`child (${pid}) timer`)
}, 1000)

const buf = new ArrayBuffer(4096)

loop.add(just.sys.STDIN_FILENO, (fd, event) => {
  if (event & EPOLLERR || event & EPOLLHUP) {
    loop.remove(fd)
    close(fd)
    return
  }
  if (event & EPOLLIN) just.print(buf.readString(read(fd, buf)))
})
