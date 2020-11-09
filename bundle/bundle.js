const { launch } = require('lib/process.js')
const { waitpid } = just.sys
const { isFile, isDir } = require('fs')

function watch (p) {
  return new Promise((resolve, reject) => {
    p.onStderr = p.onStdout = (buf, len) => just.net.write(just.sys.STDOUT_FILENO, buf, len)
    const timer = just.setInterval(() => {
      const [status, kpid] = waitpid(new Uint32Array(2), p.pid)
      if (kpid === p.pid) {
        just.sys.nextTick(() => just.clearInterval(timer))
        if (status !== 0) return reject(new Error(`Bad Status ${status}`))
        resolve()
      }
    }, 10)
  })
}

function library (name, obj = [], lib = []) {
  lib = lib.map(v => `-l${v}`).join(' ')
  const cmdline = `g++ -s -shared -flto -pthread -Wl,--start-group ${obj.join(' ')} .just/bundle.o -Wl,--end-group -Wl,-soname=${name}.so -ldl -lrt ${lib} -o .just/${name}.so`
  const [cmd, ...args] = cmdline.split(' ').filter(v => v)
  return watch(launch(cmd, args))
}

function bundle (name, obj = [], lib = []) {
  lib = lib.map(v => `-l${v}`).join(' ')
  const cmdline = `g++ -s -rdynamic -pthread -Wl,--start-group .just/deps/v8/libv8_monolith.a ${obj.join(' ')} .just/main.o .just/just.o .just/builtins.o .just/bundle.o -Wl,--end-group -ldl -lrt ${lib} -o .just/${name}`
  const [cmd, ...args] = cmdline.split(' ').filter(v => v)
  return watch(launch(cmd, args))
}

function link (output, ...files) {
  return watch(launch('ld', ['-r', '-b', 'binary', '-o', output, ...files]))
}

function build (...args) {
  return watch(launch('just', ['build', ...args]))
}

function cp (src, dest) {
  return watch(launch('cp', [src, dest]))
}

async function bundleExecutable (name) {
  const config = require(`${name}/config.js`)
  const files = config.files.map(v => `${name}/${v}`)
  just.fs.mkdir('.just')
  await link('.just/bundle.o', ...[...files, `${name}/index.js`, `${name}/config.js`])
  await cp('just.js', '.just/just.js')
  if (!isFile('.just/just.o')) {
    just.print('building runtime')
    await build('runtime')
  }
  if (config.modules && config.modules.length) {
    if (!isDir('.just/modules')) {
      just.print('downloading modules')
      await build('modules')
    }
    let obj = []
    let lib = []
    for (const module of config.modules) {
      const missing = module.obj.some(obj => {
        return !isFile(`.just/${obj}`)
      })
      if (missing) {
        just.print(`building ${module.name} module`)
        await build(`MODULE=${module.name}`, 'module-static')
      }
      obj = obj.concat(module.obj.map(v => `.just/${v}`))
      if (module.lib && module.lib.length) lib = lib.concat(module.lib)
    }
    just.print(`building .just/${name}`)
    await bundle(name, obj, lib)
    return
  }
  just.print(`building .just/${name}`)
  await bundle(name)
}

async function bundleLibrary (name) {
  const config = require(`${name}/config.js`)
  const files = config.files.map(v => `${name}/${v}`)
  just.fs.mkdir('.just')
  await link('.just/bundle.o', ...[...files, `${name}/index.js`, `${name}/config.js`])
  if (config.modules && config.modules.length) {
    if (!isDir('.just/modules')) {
      just.print('downloading modules')
      await build('modules')
    }
    let obj = []
    let lib = []
    for (const module of config.modules) {
      const missing = module.obj.some(obj => {
        return !isFile(`.just/${obj}`)
      })
      if (missing) {
        just.print(`building ${module.name} module`)
        await build(`MODULE=${module.name}`, 'module')
      }
      obj = obj.concat(module.obj.map(v => `.just/${v}`))
      if (module.lib && module.lib.length) lib = lib.concat(module.lib)
    }
    just.print(`building .just/${name}.so`)
    await library(name, obj, lib)
    return
  }
  just.print(`building .just/${name}.so`)
  await library(name)
}

const shared = just.args.slice(1).some(arg => (arg === '--shared'))
if (shared) {
  bundleLibrary(just.args[2]).catch(err => just.error(err.stack))
} else {
  bundleExecutable(just.args[2]).catch(err => just.error(err.stack))
}
