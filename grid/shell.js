const { createPeer } = require('./lib/grid.js')
const { createClient } = require('./lib/unix.js')
const { createContext } = require('lib/shell.js')
const { dump, ANSI } = require('@binary')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

const { AG, AD } = ANSI
const config = require('grid.config.js')
const sock = createClient()
const peer = createPeer(sock, config.block).alloc()
sock.onReadable = () => peer.pull()
sock.onWritable = () => sock.resume()
peer.onHeader = () => {
  just.print('')
  just.print(stringify(peer.header))
  just.net.writeString(just.sys.STDOUT_FILENO, `${AG}>${AD} `)
}
peer.onBlock = () => {
  just.print('')
  just.print(dump(new Uint8Array(peer.buf, peer.start, peer.header.size)))
  just.net.writeString(just.sys.STDOUT_FILENO, `${AG}>${AD} `)
}
sock.connect('grid.sock')

require('repl').repl().onCommand = createContext({ peer }).exec
