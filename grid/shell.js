const { createPeer, messages } = require('./lib/grid.js')
const { createClient } = require('./lib/unix.js')
const { createShell } = require('lib/shell.js')
const { dump } = require('@binary')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

const config = require('grid.config.js')
let mode = 'binary'

const sock = createClient()
sock.onReadable = () => peer.pull()
sock.onWritable = () => sock.resume()

const peer = createPeer(sock, config.block).alloc()
peer.onHeader = () => {
  if (peer.header.op === messages.PUT) return
  just.print('')
  just.print(stringify(peer.header))
  shell.prompt()
}
peer.onBlock = () => {
  just.print('')
  try {
    if (mode === 'text') {
      just.print(peer.buf.readString(peer.header.size, peer.start))
    } else if (mode === 'json') {
      just.print(stringify(JSON.parse(peer.buf.readString(peer.header.size, peer.start))))
    } else {
      just.print(dump(peer.readBlock()))
    }
  } catch (err) {
    just.error(err.stack)
  }
  shell.prompt()
}
sock.connect('grid.sock')

const api = { peer }

const { shell, context } = createShell(api, 'grid')
shell.onCommand = command => {
  const [action, ...args] = command.split(' ')
  if (action === 'mode') {
    mode = args[0]
    just.print(`switch mode to ${mode}`)
    return
  }
  return context.exec(command)
}
