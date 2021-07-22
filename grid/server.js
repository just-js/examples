const { createBlockStore, createPeer, messages } = require('./lib/grid.js')
const { createServer } = require('./lib/unix.js')

function onConnect (sock) {
  const peer = createPeer(sock, config.block).alloc()
  sock.onReadable = () => peer.pull()
  sock.onWritable = () => sock.resume()
  peer.onHeader = () => {
    just.print(JSON.stringify(peer.header))
    const { op, index } = peer.header
    if (op === messages.GET) {
      const block = blockStore.get(index)
      if (!block) {
        peer.message(index, messages.NACK)
        return
      }
      just.print(JSON.stringify(block))
      const { bucket, start, size } = block
      peer.buffer(index, blockStore.buckets[bucket], size, start)
    }
  }
  peer.onBlock = () => {
    just.print(JSON.stringify(peer.header))
    const { index, size } = peer.header
    just.print(JSON.stringify({ start: peer.start, size }))
    if (!blockStore.put(index, peer.buf, peer.start, size)) return
    peer.message(index, messages.ACK)
  }
}

const config = require('grid.config.js')
const server = createServer()
server.onConnect = onConnect
const blockStore = createBlockStore(config).create()
server.bind('grid.sock')
server.listen()
