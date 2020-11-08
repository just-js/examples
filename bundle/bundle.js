const { launch } = require('lib/process.js')
const { waitpid } = just.sys
const { isFile, isDir } = require('fs')

function compile (output, ...files) {
  return new Promise((resolve, reject) => {
    const ld = launch('ld', ['-s', '-shared', '--start-group', ...files, '--end-group', `-soname=${output}`, '-o', output])
    ld.onStderr = ld.onStdout = (buf, len) => just.net.write(just.sys.STDOUT_FILENO, buf, len)
    const timer = just.setInterval(() => {
      const [status, kpid] = waitpid(new Uint32Array(2), ld.pid)
      if (kpid === ld.pid) {
        if (status !== 0) return reject(new Error(`Bad Status ${status}`))
        resolve()
        just.sys.nextTick(() => just.clearInterval(timer))
      }
    }, 10)
  })
}

function bundle (name, ...files) {
  return new Promise((resolve, reject) => {
    const cmdline = `g++ -s -rdynamic -pthread -Wl,--start-group .just/deps/v8/libv8_monolith.a ${files.join(' ')} .just/main.o .just/just.o .just/builtins.o .just/bundle.o -Wl,--end-group -ldl -lrt -o .just/${name}`
    const [cmd, ...args] = cmdline.split(' ').filter(v => v)
    const gpp = launch(cmd, args)
    gpp.onStderr = gpp.onStdout = (buf, len) => just.net.write(just.sys.STDOUT_FILENO, buf, len)
    const timer = just.setInterval(() => {
      const [status, kpid] = waitpid(new Uint32Array(2), gpp.pid)
      if (kpid === gpp.pid) {
        if (status !== 0) return reject(new Error(`Bad Status ${status}`))
        resolve()
        just.sys.nextTick(() => just.clearInterval(timer))
      }
    }, 10)
  })
}

function link (output, ...files) {
  return new Promise((resolve, reject) => {
    const ld = launch('ld', ['-r', '-b', 'binary', '-o', output, ...files])
    ld.onStderr = ld.onStdout = (buf, len) => just.net.write(just.sys.STDOUT_FILENO, buf, len)
    const timer = just.setInterval(() => {
      const [status, kpid] = waitpid(new Uint32Array(2), ld.pid)
      if (kpid === ld.pid) {
        if (status !== 0) return reject(new Error(`Bad Status ${status}`))
        resolve()
        just.sys.nextTick(() => just.clearInterval(timer))
      }
    }, 10)
  })
}

function build (...args) {
  return new Promise((resolve, reject) => {
    const ld = launch('just', ['build', ...args])
    ld.onStderr = ld.onStdout = (buf, len) => just.net.write(just.sys.STDOUT_FILENO, buf, len)
    const timer = just.setInterval(() => {
      const [status, kpid] = waitpid(new Uint32Array(2), ld.pid)
      if (kpid === ld.pid) {
        if (status !== 0) return reject(new Error(`Bad Status ${status}`))
        resolve()
        just.sys.nextTick(() => just.clearInterval(timer))
      }
    }, 10)
  })
}

function cp (src, dest) {
  return new Promise((resolve, reject) => {
    const cp = launch('cp', [src, dest])
    cp.onStderr = cp.onStdout = (buf, len) => just.net.write(just.sys.STDOUT_FILENO, buf, len)
    const timer = just.setInterval(() => {
      const [status, kpid] = waitpid(new Uint32Array(2), cp.pid)
      if (kpid === cp.pid) {
        if (status !== 0) return reject(new Error(`Bad Status ${status}`))
        resolve()
        just.sys.nextTick(() => just.clearInterval(timer))
      }
    }, 10)
  })
}

async function run (name) {
  const config = require(`${name}/config.js`)
  const files = config.files.map(v => `${name}/${v}`)
  just.fs.mkdir('.just')
  await link('.just/bundle.o', ...[...files, `${name}/index.js`, `${name}/config.js`])
  await cp('just.js', '.just/just.js')
  await compile(`${name}.so`, '.just/bundle.o')
  if (!isFile('.just/just.o')) {
    just.print('building runtime')
    await build('runtime')
  }
  if (config.modules && config.modules.length) {
    just.print('building modules')
    if (!isDir('.just/modules')) {
      just.print('downloading modules')
      await build('modules')
    }
    let libs = []
    for (const module of config.modules) {
      if (!isFile(`.just/modules/${module.name}/${module.name}.o`)) {
        just.print(`building ${module.name} module`)
        await build(`MODULE=${module.name}`, 'module-static')
      }
      libs = libs.concat(module.obj.map(v => `.just/${v}`))
    }
    just.print(`building .just/${name}`)
    await bundle(name, ...libs)
    return
  }
  just.print(`building .just/${name}`)
  await bundle(name)
}

run(just.args[2]).catch(err => just.error(err.stack))
