
const { createContext, compileAndRunInContext, enterContext, exitContext } = just.vm
const { AM, AD } = require('@binary').ANSI

function newContext (opts = {}) {
  const ctx = new ArrayBuffer(0)
  const just = createContext(ctx)
  just.args = opts.args || []
  if (!opts.builtin) delete just.builtin
  if (!opts.load) delete just.load
  if (!opts.sleep) delete just.sleep
  if (!opts.chdir) delete just.chdir
  const scriptName = opts.scriptName || 'just.js'
  function execute (src) {
    return compileAndRunInContext(ctx, src, scriptName)
  }
  if (opts.main) compileAndRunInContext(ctx, opts.main, scriptName)
  return { just, execute, ctx }
}

/*
// run a full just.js runtime with args. same as running from shell
const full = newContext({
  main: just.builtin('just.js'),
  load: true,
  builtin: true,
  args: ['just', '--freeze', 'eval', "require('repl').repl()"]
})

// create the simplest possible context and run a repl in current
// context to evaluate code in the new context
const context = newContext()
require('repl').repl().onCommand = context.execute
*/

const full = newContext({
  main: just.builtin('just.js'),
  load: true,
  builtin: true,
  args: ['just', '--freeze', 'eval', '']
})
const mini = newContext()

const dumpScript = `
just.print(JSON.stringify(Object.getOwnPropertyNames(global), null, '  '))
just.print(JSON.stringify(Object.getOwnPropertyNames(just), null, '  '))
just.foo = 'bar'
`

just.print(`${AM}full${AD}`)
full.execute(dumpScript)
just.print(`${AM}mini${AD}`)
mini.execute(dumpScript)

//enterContext(full)
//just.print('hello')
//exitContext(full)
