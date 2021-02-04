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
while (1) {
  const child = fork()
  if (child === 0) {
    fexecve(fd, ['sleep', '1'])
  } else {
    let [status, kpid] = waitpid(u32)
    while (kpid !== child) {
      [status, kpid] = waitpid(u32)
      usleep(10000)
    }
    just.print(`sleep (${kpid}) ${status}`)
  }
}
