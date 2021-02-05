const { sys } = just.library('sys')
const { readFileBytes } = require('fs')
const { memfd_create, fexecve, MFD_CLOEXEC, fork, waitpid, usleep } = sys
const fd = memfd_create('busybox', MFD_CLOEXEC)
let buf = just.builtin('busybox', 1)
if (!buf) {
  buf = readFileBytes('./busybox')
}
just.net.write(fd, buf)
const u32 = new Uint32Array(2)
function exec (...args) {
  if (fork() === 0) {
    fexecve(fd, args)
    throw new just.SystemError('fexecve')
  }
  return waitpid(u32, -1, 0)
}
while (1) {
  const [status, pid] = exec('sleep', '10')
  just.print(`sleep ${pid} : ${status}`)
}
