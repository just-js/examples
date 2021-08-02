const threads = require('lib/threads.js')
const { sys } = just.library('sys')

function threadMain () {
  const { sys } = just.library('sys')
  const u32 = new Uint32Array(just.buffer)
  just.onMessage = message => {
    just.print(`message from parent ${sys.pid()}\n${message}`)
    if (message === 'quit') just.clearTimeout(timer)
  }
  const timer = just.setInterval(() => {
    Atomics.add(u32, 0, 1)
    just.send(`hello from thread ${sys.tid()}`)
  }, 1000)
}

async function main () {
  const thread = threads.create(threadMain)
  const u32 = new Uint32Array(thread.shared)
  const timer = just.setInterval(() => {
    thread.send(`hello from process ${sys.pid()}`)
    const counter = Atomics.load(u32, 0)
    just.print(`counter ${counter}`)
    if (counter >= 3) {
      sys.nextTick(() => thread.send('quit'))
    }
  }, 1000)
  thread.onMessage = message => {
    just.print(`message from thread ${thread.id}\n${message}`)
  }
  await thread.spawn()
  just.clearTimeout(timer)
  just.print(`thread complete ${thread.id} status ${thread.status[0]}`)
}

main().catch(err => just.error(err.stack))
