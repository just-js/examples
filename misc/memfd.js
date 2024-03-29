const { sys } = just.library('sys')
const { readFileBytes } = require('fs')
const { memory } = just.library('memory')
const { fexecve, fork, waitpid } = sys
const { memfdCreate, MFD_CLOEXEC } = memory
const fd = memfdCreate('busybox', MFD_CLOEXEC)
let buf = just.builtin('busybox', 1)
if (!buf) {
  buf = readFileBytes('./busybox')
}
just.net.write(fd, buf, buf.byteLength)
const u32 = new Uint32Array(2)
const env = []
function exec (...args) {
  const pid = fork()
  if (pid === 0) {
    fexecve(fd, args, env)
    throw new just.SystemError('fexecve')
  }
  return waitpid(u32, pid, 0)
}
while (1) {
  const [status, pid] = exec('sleep', just.args[2] || '1')
  just.print(`sleep ${pid} : ${status} rss ${just.memoryUsage().rss}`)
}
