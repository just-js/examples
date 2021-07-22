const { vm } = just.library('vm')

function createContext (api, globalName, script) {
  const ctx = new ArrayBuffer(0)
  const globalObject = vm.createContext(ctx, globalName)
  const props = Object.getOwnPropertyNames(globalObject)
  for (const prop of props) {
    if (prop !== 'version') delete globalObject[prop]
  }
  Object.assign(globalObject, api)
  return { exec: src => vm.compileAndRunInContext(ctx, src, script) }
}

function createShell (api = {}, name = 'just', script = 'just.js') {
  const shell = require('repl').repl()
  const context = createContext(api, name, script)
  shell.onCommand = context.exec
  return { shell, context }
}

module.exports = { createShell }
