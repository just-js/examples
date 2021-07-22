const { createBlockStore, createPeer, messages } = require('./lib/grid.js')
const { createServer } = require('./lib/unix.js')

function onConnect (sock) {
  const peer = createPeer(sock, config.block).alloc()
  peer.onHeader = () => {
    const { op, index } = peer.header
    if (op === messages.GET) {
      const block = blockStore.get(index)
      if (!block) {
        peer.message(index, messages.NACK)
        return
      }
      const { bucket, start, size } = block
      just.print(JSON.stringify({ bucket, start, size }))
      peer.buffer(index, blockStore.buckets[bucket], size, start)
    }
  }
  peer.onBlock = () => {
    const { index, size } = peer.header
    if (!blockStore.put(index, peer.buf, peer.start, size)) return
    peer.message(index, messages.ACK)
  }
}

const config = require('grid.config.js')
const blockStore = createBlockStore(config).create()
just.print(require('lib/util.js').stringify(blockStore))
const server = createServer()
server.onConnect = onConnect
server.bind('grid.sock')
server.listen()
