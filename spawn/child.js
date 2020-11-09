const { loop } = just.factory
const { EPOLLERR, EPOLLHUP, EPOLLIN } = just.loop
const { close, read } = just.net
const { setNonBlocking } = require('lib/process.js')
const buf = new ArrayBuffer(4096)
setNonBlocking(just.sys.STDIN_FILENO)
let total = 0
loop.add(just.sys.STDIN_FILENO, (fd, event) => {
  if (event & EPOLLERR || event & EPOLLHUP) {
    loop.remove(fd)
    just.print('closing')
    close(fd)
    return
  }
  if (event & EPOLLIN) {
    total += read(fd, buf)
  }
})
just.setInterval(() => {
  const mbits = Math.floor((total / (1024 * 1024)) * 8)
  just.print(`child  ${mbits} Mb`)
  total = 0
}, 1000)
