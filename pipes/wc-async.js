const { net, sys, print, error } = just
const { read, O_NONBLOCK } = net
const { strerror, errno, STDIN_FILENO } = sys
const { EPOLLIN } = just.loop
const { loop } = just.factory
const BUFSIZE = 65536
const buf = new ArrayBuffer(BUFSIZE)
const flags = sys.fcntl(STDIN_FILENO, sys.F_GETFL, 0) | O_NONBLOCK
sys.fcntl(STDIN_FILENO, sys.F_SETFL, flags)
let blocks = 0
function onData (fd) {
  const n = read(fd, buf)
  if (n < 0) {
    error(`read: ${strerror(errno())} (${errno()})`)
    loop.remove(fd)
    return
  }
  if (n === 0) {
    print(`size: ${blocks * BUFSIZE}`)
    loop.remove(fd)
    return
  }
  blocks++
}
loop.add(STDIN_FILENO, onData, EPOLLIN)
