const { launch, watch } = require('lib/process.js')
const { isFile, isDir } = require('fs')

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
  let status = await link('.just/bundle.o', ...[...files, `${name}/index.js`, `${name}/config.js`])
  just.print(`link ${status}`)
  status = await cp('just.js', '.just/just.js')
  just.print(`cp ${status}`)
  if (!isFile('.just/just.o')) {
    just.print('building runtime')
    status = await build('runtime')
    just.print(`build ${status}`)
  }
  if (config.modules && config.modules.length) {
    if (!isDir('.just/modules')) {
      just.print('downloading modules')
      status = await build('modules')
      just.print(`build ${status}`)
    }
    let obj = []
    let lib = []
    for (const module of config.modules) {
      const missing = module.obj.some(obj => {
        return !isFile(`.just/${obj}`)
      })
      if (missing) {
        just.print(`building ${module.name} module`)
        status = await build(`MODULE=${module.name}`, 'module-static')
        just.print(`build ${module.name} module-static ${status}`)
      }
      obj = obj.concat(module.obj.map(v => `.just/${v}`))
      if (module.lib && module.lib.length) lib = lib.concat(module.lib)
    }
    just.print(`building .just/${name}`)
    status = await bundle(name, obj, lib)
    just.print(`bundle ${status}`)
    return
  }
  just.print(`building .just/${name}`)
  status = await bundle(name)
  just.print(`bundle ${status}`)
}

async function bundleLibrary (name) {
  const config = require(`${name}/config.js`)
  const files = config.files.map(v => `${name}/${v}`)
  just.fs.mkdir('.just')
  let status = await link('.just/bundle.o', ...[...files, `${name}/index.js`, `${name}/config.js`])
  just.print(`link ${status}`)
  if (config.modules && config.modules.length) {
    if (!isDir('.just/modules')) {
      just.print('downloading modules')
      status = await build('modules')
      just.print(`build modules ${status}`)
    }
    let obj = []
    let lib = []
    for (const module of config.modules) {
      const missing = module.obj.some(obj => {
        return !isFile(`.just/${obj}`)
      })
      if (missing) {
        just.print(`building ${module.name} module`)
        status = await build(`MODULE=${module.name}`, 'module')
        just.print(`build ${module.name} ${status}`)
      }
      obj = obj.concat(module.obj.map(v => `.just/${v}`))
      if (module.lib && module.lib.length) lib = lib.concat(module.lib)
    }
    just.print(`building .just/${name}.so`)
    status = await library(name, obj, lib)
    just.print(`library ${status}`)
    return
  }
  just.print(`building .just/${name}.so`)
  status = await library(name)
  just.print(`library ${status}`)
}
const shared = just.args.slice(1).some(arg => (arg === '--shared'))
if (shared) {
  bundleLibrary(just.args[2]).catch(err => just.error(err.stack))
} else {
  bundleExecutable(just.args[2]).catch(err => just.error(err.stack))
}
