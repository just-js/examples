const { launch, watch } = require('lib/process.js')
const { STDOUT_FILENO, STDERR_FILENO } = just.sys
const pid = just.sys.pid()

async function run () {
  const process = launch('just', ['timer.js'])
  process.onStdout = (buf, len) => just.net.write(STDOUT_FILENO, buf, len)
  process.onStderr = (buf, len) => just.net.write(STDERR_FILENO, buf, len)
  process.onClose = () => just.print('io closed')
  let timer
  process.onWritable = () => {
    timer = just.setInterval(() => {
      just.print(`parent (${pid}) timer`)
      process.write(ArrayBuffer.fromString(`hello from ${pid}`))
    }, 1000)
  }
  const status = await watch(process)
  just.print(`exit ${status}`)
  if (timer) just.clearInterval(timer)
}

run().catch(err => just.error(err.stack))
