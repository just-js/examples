function wrapHrtime (hrtime) {
  const time = new BigUint64Array(1)
  return () => {
    hrtime(time)
    return time[0]
  }
}

function truncate (val) {
  return Math.floor(val * 100) / 100
}

function wrapCpuUsage (cpuUsage) {
  const cpu = new Uint32Array(4)
  const result = { user: 0, system: 0, cuser: 0, csystem: 0 }
  const clock = cpuUsage(cpu)
  const last = { user: cpu[0], system: cpu[1], cuser: cpu[2], csystem: cpu[3], clock }
  return () => {
    const clock = cpuUsage(cpu)
    const elapsed = clock - last.clock
    result.user = truncate((cpu[0] - last.user) / elapsed)
    result.system = truncate((cpu[1] - last.system) / elapsed)
    result.cuser = truncate((cpu[2] - last.cuser) / elapsed)
    result.csystem = truncate((cpu[3] - last.csystem) / elapsed)
    last.user = cpu[0]
    last.system = cpu[1]
    last.cuser = cpu[2]
    last.csystem = cpu[3]
    last.clock = clock
    return result
  }
}

function wrapgetrUsage (getrUsage) {
  const res = new Float64Array(16)
  return () => {
    getrUsage(res)
    // todo. create this object above
    return {
      user: res[0],
      system: res[1],
      maxrss: res[2],
      ixrss: res[3],
      idrss: res[4],
      isrss: res[5],
      minflt: res[6],
      majflt: res[7],
      nswap: res[8],
      inblock: res[9],
      oublock: res[10],
      msgsnd: res[11],
      msgrcv: res[12],
      ssignals: res[13],
      nvcsw: res[14],
      nivcsw: res[15]
    }
  }
}

function wrapMemoryUsage (memoryUsage) {
  const mem = new Float64Array(16)
  return () => {
    memoryUsage(mem)
    return {
      rss: mem[0],
      total_heap_size: mem[1],
      used_heap_size: mem[2],
      external_memory: mem[3],
      heap_size_limit: mem[5],
      total_available_size: mem[10],
      total_heap_size_executable: mem[11],
      total_physical_size: mem[12]
    }
  }
}

function split (str, sym) {
  const at = str.indexOf(sym)
  return [str.slice(0, at), str.slice(at + 1)]
}

function wrapEnv (env) {
  return () => {
    return env()
      .map(entry => split(entry, '='))
      .reduce((e, pair) => { e[pair[0]] = pair[1]; return e }, {})
  }
}

function wrapHeapUsage (heapUsage) {
  const heap = (new Array(16)).fill(0).map(v => new Float64Array(4))
  return () => {
    const usage = heapUsage(heap)
    usage.spaces = Object.keys(usage.heapSpaces).map(k => {
      const space = usage.heapSpaces[k]
      return {
        name: k,
        size: space[2],
        used: space[3],
        available: space[1],
        physicalSize: space[0]
      }
    })
    delete usage.heapSpaces
    return usage
  }
}

function wrapRequireNative (cache = {}) {
  function require (path) {
    if (cache[path]) return cache[path].exports
    const { vm } = just
    const params = ['exports', 'require', 'module']
    const exports = {}
    const module = { exports, type: 'native' }
    module.text = vm.builtin(path)
    if (!module.text) return
    const fun = vm.compile(module.text, path, params, [])
    module.function = fun
    cache[path] = module
    fun.call(exports, exports, p => require(p, module), module)
    return module.exports
  }
  return { cache, require }
}

function setTimeout (callback, timeout, repeat = 0, loop = just.factory.loop) {
  const buf = new ArrayBuffer(8)
  const fd = just.sys.timer(repeat, timeout)
  loop.add(fd, (fd, event) => {
    callback()
    just.net.read(fd, buf)
    if (repeat === 0) {
      loop.remove(fd)
      just.net.close(fd)
    }
  })
  return fd
}

function setInterval (callback, timeout, loop = just.factory.loop) {
  return setTimeout(callback, timeout, timeout, loop)
}

function clearTimeout (fd, loop = just.factory.loop) {
  loop.remove(fd)
  just.net.close(fd)
}

function runScript (script, name) {
  return just.vm.runScript(`(function() {${script}})()`, name)
}

function loadLibrary (path, name) {
  const handle = just.sys.dlopen()
  if (!handle) return
  const ptr = just.sys.dlsym(handle, `_register_${name}`)
  if (!ptr) return
  return just.sys.library(ptr)
}

function loadSymbolFile (handle, path) {
  path = path.replace(/[./]/g, '_')
  const start = just.sys.dlsym(handle, `_binary_${path}_start`)
  if (!start) return
  const end = just.sys.dlsym(handle, `_binary_${path}_end`)
  if (!end) return
  return just.sys.readMemory(start, end)
}

function requireInternal (path, parent = { dirName: '' }) {
  const ext = path.split('.').slice(-1)[0]
  if (ext === 'js' || ext === 'json') {
    return just.requireCache[just.path.join(parent.dirName, path)].exports
  }
  return just.requireNative(path, parent)
}

function cacheModule (handle, path) {
  const { vm } = just
  const params = ['exports', 'require', 'module']
  const exports = {}
  let dirName = just.path.baseName(path)
  dirName = dirName.slice(dirName.indexOf('/') + 1)
  const module = { exports, type: 'js', dirName }
  module.text = loadSymbolFile(handle, path).readString()
  const fun = vm.compile(module.text, path, params, [])
  module.function = fun
  const fileName = path.slice(path.indexOf('/') + 1)
  just.requireCache[fileName] = module
  fun.call(exports, exports, p => requireInternal(p, module), module)
}

function main () {
  delete global.console
  const { sys } = just
  ArrayBuffer.prototype.writeString = function(str, off = 0) { // eslint-disable-line
    return sys.writeString(this, str, off)
  }
  ArrayBuffer.prototype.readString = function (len = this.byteLength, off = 0) { // eslint-disable-line
    return sys.readString(this, len, off)
  }
  ArrayBuffer.prototype.getAddress = function () { // eslint-disable-line
    return sys.getAddress(this)
  }
  ArrayBuffer.prototype.copyFrom = function (ab, off = 0, len = ab.byteLength, off2 = 0) { // eslint-disable-line
    return sys.memcpy(this, ab, off, len, off2)
  }
  ArrayBuffer.fromString = str => sys.calloc(1, str)
  String.byteLength = sys.utf8Length
  just.setTimeout = setTimeout
  just.setInterval = setInterval
  just.clearTimeout = just.clearInterval = clearTimeout
  just.memoryUsage = wrapMemoryUsage(sys.memoryUsage)
  just.cpuUsage = wrapCpuUsage(sys.cpuUsage)
  just.rUsage = wrapgetrUsage(sys.getrUsage)
  just.hrtime = wrapHrtime(sys.hrtime)
  just.env = wrapEnv(sys.env)
  just.requireCache = {}
  just.requireNative = wrapRequireNative(just.requireCache).require
  just.heapUsage = wrapHeapUsage(sys.heapUsage)
  if (just.sys.dlopen) just.library = loadLibrary
  just.path = just.requireNative('path')
  const { factory } = just.requireNative('loop')
  just.factory = factory
  const loop = factory.create(1024)
  just.factory.loop = loop
  const { args } = just
  const name = just.path.fileName(args[0])
  const handle = just.sys.dlopen()
  cacheModule(handle, `${name}/config.js`)
  const config = requireInternal('config.js')
  const files = config.files.map(v => `${name}/${v}`)
  for (const file of files) {
    cacheModule(handle, file)
  }
  const main = loadSymbolFile(handle, `${name}/index.js`).readString()
  just.sys.dlclose(handle)
  global.require = just.require = requireInternal
  runScript(main, `${name}/index.js`)
  factory.run()
}

main()
