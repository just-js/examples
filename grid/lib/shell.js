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
  const repl = require('repl').repl()
  repl.onCommand = createContext(api, name, script).exec
  return repl
}

module.exports = { createShell }
