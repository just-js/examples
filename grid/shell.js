const { createPeer } = require('./lib/grid.js')
const { createClient } = require('./lib/unix.js')
const { createShell } = require('lib/shell.js')
const { dump } = require('@binary')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

const config = require('grid.config.js')

const sock = createClient()
sock.onReadable = () => peer.pull()
sock.onWritable = () => sock.resume()

const peer = createPeer(sock, config.block).alloc()
peer.onHeader = () => {
  just.print('')
  just.print(stringify(peer.header))
  shell.prompt()
}
peer.onBlock = () => {
  just.print('')
  just.print(dump(new Uint8Array(peer.buf, peer.start, peer.header.size)))
  shell.prompt()
}
sock.connect('grid.sock')

const shell = createShell({ peer }, 'grid')
