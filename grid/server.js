const { createBlockStore, Peer } = require('./lib/grid.js')
const { createServer } = require('./lib/unix.js')

const config = require('grid.config.js')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? Number(v) : v, sp)

const stats = { send: 0, recv: 0 }

const server = createServer()
server.onConnect = sock => {
  const peer = new Peer(sock, blockStore.blockSize)
  const { buf } = peer
  const { buckets } = blockStore
  sock.onReadable = () => peer.pull()
  sock.onWritable = () => sock.resume()
  peer.onHeader = header => {
    const { op, index } = header
    if (op === 1) {
      const block = blockStore.lookup(index)
      if (!block) {
        peer.send(index, 3)
        return
      }
      const { bucket, start, end } = block
      peer.send(index, 2)
      just.net.write(sock.fd, buckets[bucket], end - start, start)
      send++
    }
  }
  peer.onBlock = (header, off) => {
    const block = blockStore.lookup(header.index)
    if (!block) return
    const { bucket, start, end } = block
    buckets[bucket].copyFrom(buf, start, end - start, off)
  }
}

const blockStore = createBlockStore(config)
blockStore.alloc = (index, size) => {
  just.print(`allocate ${size} for ${index}`)
  return new ArrayBuffer(size)
}
blockStore.create()
server.bind('grid.sock')
server.listen()
just.print(stringify(blockStore))
let send = 0
just.setInterval(() => {
  const bw = Math.floor((send * config.block) / (1024 * 1024))
  const bwb = bw * 8
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const perf = `mem ${rss} cpu (${user.toFixed(2)}/${system.toFixed(2)}) ${(user + system).toFixed(2)}`
  just.print(`send ${send} bw ${bw} MByte ${bwb} Mbit ${perf}`)
  send = 0
}, 1000)
