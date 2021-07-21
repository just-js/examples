const { createBlockStore, createPeer } = require('./lib/grid.js')
const { createServer } = require('./lib/unix.js')

const config = require('grid.config.js')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? Number(v) : v, sp)

const server = createServer()
server.onConnect = sock => {
  const peer = createPeer(sock, config.block).alloc()
  const { buf } = peer
  const { buckets } = blockStore
  sock.onReadable = () => peer.pull()
  sock.onWritable = () => sock.resume()
  peer.onHeader = () => {
    const { op, index } = peer.header
    if (op === 1) {
      const block = blockStore.lookup(index)
      if (!block) {
        const r = peer.send(index, 3)
        if (r <= 0) just.error((new just.SystemError('send')).stack)
        return
      }
      const { bucket, start, end } = block
      let r = peer.send(index, 2)
      if (r <= 0) just.error((new just.SystemError('send')).stack)
      r = just.net.write(sock.fd, buckets[bucket], end - start, start)
      if (r <= 0) just.error((new just.SystemError('write')).stack)
      send++
    }
  }
  peer.onBlock = () => {
    const { header, off } = peer
    const block = blockStore.lookup(header.index)
    if (!block) {
      just.print('block not found')
      return
    }
    const { bucket, start, end } = block
    buckets[bucket].copyFrom(buf, start, end - start, off)
    recv++
    const r = peer.send(header.index, 1)
    if (r <= 0) just.error((new just.SystemError('send')).stack)
  }
}

const blockStore = createBlockStore(config)
blockStore.create()
server.bind('grid.sock')
server.listen()
just.print(stringify(blockStore))
let send = 0
let recv = 0
just.setInterval(() => {
  const bw = Math.floor((send * config.block) / (1024 * 1024))
  const bwb = bw * 8
  const bwr = Math.floor((recv * config.block) / (1024 * 1024))
  const bwrb = bwr * 8
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const perf = `mem ${rss} cpu (${user.toFixed(2)}/${system.toFixed(2)}) ${(user + system).toFixed(2)}`
  just.print(`send ${send} (${bw} MB ${bwb} Mb) recv ${recv} (${bwr} MB ${bwrb} Mb) ${perf})`)
  send = recv = 0
}, 1000)
