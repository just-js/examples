const { dump, ANSI } = require('@binary')
const { createShell } = require('lib/shell.js')
const { stringify } = require('lib/util.js')
const { createClient } = require('./lib/unix.js')
const { createPeer, translate, messages } = require('./lib/grid.js')

const { AD, AY, AM, AC, AG, AR } = ANSI
const ops = [AD, AC, AM, AG, AR]
const modes = { json: AG, text: AY, binary: AM }

function onHeader () {
  const { op, size, index } = peer.header
  just.print(`${AY}RECV${AD} ${ops[op]}${translate(op)}${AD} ${AG}index${AD} ${index} ${AG}size${AD} ${size}`)
  if (op !== messages.PUT) shell.prompt()
}

function onBlock () {
  try {
    if (mode === 'text') {
      just.print(peer.buf.readString(peer.header.size, peer.start))
    } else if (mode === 'json') {
      just.print(stringify(JSON.parse(peer.buf.readString(peer.header.size, peer.start))))
    } else {
      just.print(dump(peer.readBlock()), false)
    }
  } catch (err) {
    just.error(err.stack)
  }
  shell.prompt()
}

function onCommand (command) {
  const [action, ...args] = command.split(' ')
  if (action === 'mode') {
    mode = args[0]
    just.print(`switch mode to ${modes[mode]}${mode}${AD}`)
    shell.prompt()
    return
  }
  context.exec(command)
}

const config = require('grid.config.js')
let mode = 'binary'
const sock = createClient()
sock.onReadable = () => peer.pull()
sock.onWritable = () => sock.resume()
const peer = createPeer(sock, config.block).alloc()
peer.onHeader = onHeader
peer.onBlock = onBlock
sock.connect('grid.sock')
const api = { peer }
const { shell, context } = createShell(api, 'grid')
shell.onCommand = onCommand
