const src = just.builtin('just.js')

function createContext () {
  const ctx = new ArrayBuffer(8)
  const contextJust = just.vm.createContext(ctx)
  const start = Date.now()
  contextJust.args = []
  function execute (src, scriptName = 'just.js') {
    return just.vm.compileAndRunInContext(ctx, src, scriptName)
  }
  just.vm.compileAndRunInContext(ctx, src, 'just.js')
  Object.assign(contextJust, just)
  //just.vm.compileAndRunInContext(ctx, 'just.setInterval(() => {}, 10000)', 'just.js')
  const time = Date.now() - start
  return { just: contextJust, execute, time, ctx }
}

const contexts = []

function next () {
  const context = createContext()
  context.just.id = contexts.length
  contexts.push(context)
  if (contexts.length === 1000) {
    just.clearInterval(t)
    require('repl').repl()
  }
}

const t = just.setInterval(next, 1)
just.print(just.sys.pid())
let last = 0
just.setInterval(() => {
  const rss = just.memoryUsage().rss
  const total = BigInt(contexts.length)
  const average = rss / (total || 1n)
  const time = contexts.map(context => context.time).reduce((a, v) => v + a, 0)
  const avgTime = time / contexts.length
  const created = contexts.length - last
  last = contexts.length
  just.print(`rss ${rss.toString()} contexts ${total} average ${average.toString()} time ${avgTime.toFixed(2)} ${created}`)
}, 1000)

while (1) {
  just.factory.loop.poll(-1)
  just.sys.runMicroTasks()
}
