const { vm } = just.library('vm')

const getMethods = (obj) => {
  const properties = new Set()
  let currentObj = obj
  do {
    Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
  } while ((currentObj = Object.getPrototypeOf(currentObj)))
  return [...properties.keys()].filter(item => typeof obj[item] === 'function')
}

function createContext (api = {}, scriptName = 'just.js') {
  const ctx = new ArrayBuffer(0)
  const just = vm.createContext(ctx)
  const props = Object.getOwnPropertyNames(just)
  for (const prop of props) {
    if (prop !== 'version') delete just[prop]
  }
  Object.assign(just, api)
  just.getMethods = getMethods
  return { exec: src => vm.compileAndRunInContext(ctx, src, scriptName) }
}

module.exports = { createContext }
