const { net } = just.library('net')
const { sys } = just.library('sys')
const { vm } = just.library('vm')
const { SystemError, print, error } = just
const { read, write } = net
const { readString, fork, waitpid, exec, usleep } = sys
const { STDIN_FILENO, STDOUT_FILENO } = sys
const { runScript } = vm

const AG = '\u001b[32m'
const AY = '\u001b[33m'
const AD = '\u001b[0m'

let mode = 'sh'

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

function prompt () {
  const color = (mode === 'sh' ? AG : AY)
  write(STDOUT_FILENO, ArrayBuffer.fromString(`${color}>${AD} `))
}

/*
handle pipes and redirects
handle sending to background
*/

function launch (program, ...args) {
  const child = fork()
  if (child === 0) {
    const r = exec(program, args)
    throw new SystemError(`exec ${r}`)
  } else if (child < 0) {
    throw new SystemError(`fork ${child}`)
  } else {
    let [status, kpid] = waitpid(new Uint32Array(2))
    while (kpid !== child) {
      [status, kpid] = waitpid(new Uint32Array(2))
      usleep(1000)
    }
    print(`${program} (${kpid}) ${status}`)
  }
}

function handleInternal (str) {
  const [program, ...args] = str.split(' ')
  if (program === 'mode') {
    mode = args[0]
    print(`mode switched to ${mode}`)
    return true
  }
  if (mode === 'js') {
    if (str[0] === '!') return
    const result = runScript(str, 'jsh')
    print(stringify(result))
    return true
  }
}

function run (str) {
  try {
    if (!handleInternal(str)) {
      let [program, ...args] = str.split(' ')
      if (!program) return
      program = program.replace('!', '')
      launch(program, ...args)
    }
  } catch (err) {
    error(err.message)
  }
}

function poll () {
  const buf = new ArrayBuffer(4096)
  let bytes = read(STDIN_FILENO, buf)
  while (bytes > 0) {
    run(readString(buf, bytes).trim())
    prompt()
    bytes = read(STDIN_FILENO, buf)
  }
  if (bytes < 0) throw new SystemError('read')
}

prompt()
poll()
