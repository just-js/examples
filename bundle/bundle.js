const { launch } = require('lib/process.js')
const { waitpid } = just.sys
const { isFile } = require('fs')

function compile (output, ...files) {
  return new Promise((resolve, reject) => {
    const ld = launch('ld', ['-s', '-shared', '--start-group', ...files, '--end-group', `-soname=${output}`, '-o', output])
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

function bundle (name) {
  return new Promise((resolve, reject) => {
    const cmdline = `g++ -s -rdynamic -pthread -Wl,--start-group .just/deps/v8/libv8_monolith.a .just/main.o .just/just.o .just/builtins.o .just/bundle.o -Wl,--end-group -ldl -lrt -o .just/${name}`
    const [cmd, ...args] = cmdline.split(' ')
    const gpp = launch(cmd, args)
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

function build () {
  return new Promise((resolve, reject) => {
    const ld = launch('just', ['build', 'runtime'])
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
    const ld = launch('cp', [src, dest])
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

async function run (name) {
  const config = require(`${name}/config.js`)
  const files = config.files.map(v => `${name}/${v}`)
  just.fs.mkdir('.just')
  await link('.just/bundle.o', ...[...files, `${name}/index.js`, `${name}/config.js`])
  await cp('just.js', '.just/just.js')
  await compile(`${name}.so`, '.just/bundle.o')
  if (!isFile('.just/just.o')) {
    await build()
  }
  await bundle(name)
}

run(just.args[2]).catch(err => just.error(err.stack))
