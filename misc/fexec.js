const { sys } = just.library('sys')
const { readFileBytes } = require('fs')
const { memory } = just.library('memory')
const { fexecve, fork, waitpid } = sys
const { memfdCreate, MFD_CLOEXEC } = memory

const u32 = new Uint32Array(2)
const env = []
let err
const args = ['true', ['true']]
const runs = 1000
let start

function exec (...args) {
  const pid = fork()
  if (pid === 0) {
    fexecve(fd, args, env)
    throw new just.SystemError('fexecve')
  }
  return waitpid(u32, pid, 0)
}

const fd = memfdCreate('true', MFD_CLOEXEC)
const buf = readFileBytes('/bin/true')
just.net.write(fd, buf, buf.byteLength)

while (!err) {
  start = Date.now()
  for (let i = 0; i < runs; i++) {
    err = exec(...args)[0]
    if (err !== 0) break
  }
  just.print((runs / ((Date.now() - start) / 1000)))
}
