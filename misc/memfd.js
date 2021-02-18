const { sys } = just.library('sys')
const { readFileBytes } = require('fs')
const { memory } = just.library('memory')
const { fexecve, MFD_CLOEXEC, fork, waitpid } = sys
const { memfdCreate } = memory
const fd = memfdCreate('busybox', MFD_CLOEXEC)
let buf = just.builtin('busybox', 1)
if (!buf) {
  buf = readFileBytes('./busybox')
}
just.net.write(fd, buf)
const u32 = new Uint32Array(2)
function exec (...args) {
  const pid = fork()
  if (pid === 0) {
    fexecve(fd, args)
    throw new just.SystemError('fexecve')
  }
  return waitpid(u32, pid, 0)
}
while (1) {
  const [status, pid] = exec('sleep', just.args[1] || '1')
  just.print(`sleep ${pid} : ${status} rss ${just.memoryUsage().rss}`)
}
