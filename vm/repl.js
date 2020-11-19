const main = just.builtin('just.js')

function createContext () {
  const ctx = new ArrayBuffer(8)
  const contextJust = just.vm.createContext(ctx)
  const start = Date.now()
  contextJust.args = []
  function execute (src, scriptName = 'just.js') {
    return just.vm.runInContext(ctx, src, scriptName)
  }
  //just.vm.runInContext(ctx, main, 'just.js')
  Object.assign(contextJust, just)
  const time = Date.now() - start
  return { just: contextJust, execute, time, ctx }
}

const context = createContext()
context.just.foo = 'bar'
context.just.doSomething = (b) => {
  const u8 = new Uint8Array(b)
  for (let i = 0; i < b.byteLength; i++) {
    u8[i] = u8[i] + 1
  }
}
const repl = require('repl').repl()
repl.onCommand = command => {
  return context.execute(command)
}
while (1) {
  just.factory.loop.poll(10)
  just.sys.runMicroTasks()
}
