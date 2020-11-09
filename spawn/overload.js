const { launch, watch, setNonBlocking } = require('lib/process.js')
const { STDOUT_FILENO, STDERR_FILENO, errno, strerror } = just.sys
const { EAGAIN } = just.net

let total = 0

async function child () {
  const process = launch('just', ['child.js'])
  setNonBlocking(STDOUT_FILENO)
  setNonBlocking(STDERR_FILENO)
  process.onStdout = (buf, len) => just.net.write(STDOUT_FILENO, buf, len)
  process.onStderr = (buf, len) => just.net.write(STDERR_FILENO, buf, len)
  process.onClose = () => just.print('io closed')
  const buf = ArrayBuffer.fromString('0'.repeat(65536))
  process.onWritable = () => {
    let r = process.write(buf)
    while (r > 0) {
      total += r
      r = process.write(buf)
    }
    if (r === 0) {
      // child is dead?
      just.error('zero write')
      return
    }
    const err = errno()
    if (err === EAGAIN) {
      process.pause()
    } else {
      just.error(`unexepected error (${errno}) ${strerror(err)}`)
    }
  }
  const status = await watch(process)
  just.print(`exit ${status}`)
}

async function run () {
  await Promise.all([child(), child(), child(), child()])
  just.clearInterval(timer)
}

const timer = just.setInterval(() => {
  const mbits = Math.floor((total / (1024 * 1024)) * 8)
  just.print(`parent ${mbits} Mb`)
  total = 0
}, 1000)

run().catch(err => just.error(err.stack))
