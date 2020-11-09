const { join, baseName } = require('path')
const _require = require

function loadSymbolFile (handle, path) {
  path = path.replace(/[./]/g, '_')
  const start = just.sys.dlsym(handle, `_binary_${path}_start`)
  if (!start) return
  const end = just.sys.dlsym(handle, `_binary_${path}_end`)
  if (!end) return
  return just.sys.readMemory(start, end)
}

function requireInternal (...args) {
  const [path, parent = { dirName: '' }] = args
  const ext = path.split('.').slice(-1)[0]
  if (ext === 'js' || ext === 'json') {
    const module = just.requireCache[join(parent.dirName, path)]
    if (!module) {
      return _require(...args)
    }
    return module.exports
  }
  return just.requireNative(path, parent)
}

function requireCache (handle, path) {
  const { vm } = just
  const params = ['exports', 'require', 'module']
  const exports = {}
  let dirName = baseName(path)
  dirName = dirName.slice(dirName.indexOf('/') + 1)
  const module = { exports, type: 'js', dirName }
  module.text = loadSymbolFile(handle, path).readString()
  const fun = vm.compile(module.text, path, params, [])
  module.function = fun
  const fileName = path.slice(path.indexOf('/') + 1)
  just.requireCache[fileName] = module
  fun.call(exports, exports, p => requireInternal(p, module), module)
}

async function run (name) {
  const handle = just.sys.dlopen(`.just/${name}.so`)
  function loadLibrary (path, name) {
    const ptr = just.sys.dlsym(handle, `_register_${name}`)
    if (!ptr) return
    return just.sys.library(ptr)
  }
  just.library = loadLibrary
  requireCache(handle, `${name}/config.js`)
  const config = requireInternal('config.js')
  const files = config.files.map(v => `${name}/${v}`)
  for (const file of files) {
    requireCache(handle, file)
  }
  const main = loadSymbolFile(handle, `${name}/index.js`).readString()
  global.require = requireInternal
  just.vm.runScript(main, `${name}/index.js`)
}

run(just.args[2]).catch(err => just.error(err.stack))
