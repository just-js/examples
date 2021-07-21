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
    hrecv++
    if (op === 1) { // GET
      if (!blockStore.exists(index)) {
        const r = peer.send(index, 3)
        if (r <= 0) just.error((new just.SystemError('send')).stack)
        hsend++
        return
      }
      const block = blockStore.lookup(index)
      const { bucket, start, end } = block
      let r = peer.send(index, 2)
      if (r <= 0) just.error((new just.SystemError('send')).stack)
      hsend++
      r = just.net.write(sock.fd, buckets[bucket], end - start, start)
      if (r <= 0) just.error((new just.SystemError('write')).stack)
      send++
    }
  }
  peer.onBlock = () => {
    const { header, off } = peer
    const { index } = header
    const block = blockStore.lookup(index)
    if (!block) {
      just.print('block not found')
      return
    }
    const { bucket, start, end } = block
    buckets[bucket].copyFrom(buf, start, end - start, off)
    blockStore.set(index)
    recv++
    const r = peer.send(index, 1)
    if (r <= 0) just.error((new just.SystemError('send')).stack)
    hsend++
  }
}

const blockStore = createBlockStore(config)
blockStore.create()
server.bind('grid.sock')
server.listen()
just.print(stringify(blockStore))
let send = 0
let recv = 0
let hsend = 0
let hrecv = 0
just.setInterval(() => {
  const bw = Math.floor((send * config.block) / (1024 * 1024))
  const bwb = bw * 8
  const bwr = Math.floor((recv * config.block) / (1024 * 1024))
  const bwrb = bwr * 8
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const perf = `mem ${rss} cpu (${user.toFixed(2)}/${system.toFixed(2)}) ${(user + system).toFixed(2)}`
  just.print(`block S ${send} (${bw} MB ${bwb} Mb) R ${recv} (${bwr} MB ${bwrb} Mb) head S ${hsend} R ${hrecv} ${perf}`)
  send = recv = hsend = hrecv = 0
}, 1000)
