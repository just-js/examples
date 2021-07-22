const { dump, ANSI } = require('@binary')
const { createShell } = require('lib/shell.js')
const { stringify, parse } = require('lib/util.js')
const { createClient } = require('./lib/unix.js')
const { createPeer, translate, messages } = require('./lib/grid.js')

function showError (str) {
  just.print(str)
  shell.prompt()
}

function onHeader () {
  const { op, size, index } = peer.header
  if (headers) {
    just.print(`${AY}RECV${AD} ${ops[op]}${translate(op)}${AD} ${AG}index${AD} ${index} ${AG}size${AD} ${size}`)
  }
  if (op !== messages.PUT) shell.prompt()
}

function onBlock () {
  if (mode === 'text') {
    just.print(peer.buf.readString(peer.header.size, peer.start))
  } else if (mode === 'json') {
    const text = peer.buf.readString(peer.header.size, peer.start)
    const json = parse(text)
    if (!json) {
      just.print(`${AR}Invalid JSON${AD}\n${text}`)
    } else {
      just.print(stringify(json))
    }
  } else {
    just.print(dump(peer.readBlock()), false)
  }
  shell.prompt()
}

function onCommand (command) {
  const [action, ...args] = command.split(' ')
  if (action === 'mode') {
    if (args.length) {
      mode = args[0]
      just.print(`switch mode to ${modes[mode]}`)
    } else {
      just.print(`mode is ${modes[mode]}`)
    }
    shell.prompt()
    return
  }
  if (action === 'headers') {
    headers = !headers
    const status = headers ? `${AG}on${AD}` : `${AR}off${AD}`
    just.print(`display headers turned ${status}`)
    shell.prompt()
    return
  }
  const result = context.exec(command)
  if (!command.match(/grid./)) {
    just.sys.nextTick(() => shell.prompt())
    return result
  }
}

const api = {
  get: index => peer.get(index),
  put: (index, o) => {
    if (mode === 'json') {
      if (typeof o !== 'object') {
        showError(`mode is ${modes[mode]} and this is not an Object`)
        return
      }
      return peer.json(index, o)
    }
    if (mode === 'text') {
      if (!o.toString) {
        showError(`mode is ${modes[mode]} and this is not a String or string-like object`)
        return
      }
      return peer.text(index, o.toString())
    }
    if (mode === 'binary') {
      if (o.constructor.name !== 'ArrayBuffer') {
        showError(`mode is ${modes[mode]} and this is not an ArrayBuffer`)
        return
      }
      return peer.buffer(index, o)
    }
  },
  delete: index => peer.text(index, '')
}

const { AD, AY, AM, AC, AG, AR } = ANSI
const ops = [AD, AC, AM, AG, AR]
const modes = { json: `${AG}json${AD}`, text: `${AY}text${AD}`, binary: `${AM}binary${AD}` }
const config = require('grid.config.js')
let mode = 'binary'
let headers = false
const sock = createClient()
sock.connect('grid.sock')
const peer = createPeer(sock, config.block).alloc()
peer.onHeader = onHeader
peer.onBlock = onBlock
const { shell, context } = createShell(api, 'grid')
shell.onCommand = onCommand
