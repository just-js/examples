const { net, sys, print, error } = just
const { read, O_NONBLOCK } = net
const { exit, strerror, errno, STDIN_FILENO } = sys
const BUFSIZE = 65536
const buf = new ArrayBuffer(BUFSIZE)
const flags = sys.fcntl(STDIN_FILENO, sys.F_GETFL, 0) | O_NONBLOCK
sys.fcntl(STDIN_FILENO, sys.F_SETFL, flags)
let size = 0
function next () {
  let n = read(STDIN_FILENO, buf)
  while (n > 0) {
    size += n
    n = read(STDIN_FILENO, buf)
  }
  just.setTimeout(next, 1)
}
next()
