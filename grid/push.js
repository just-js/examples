const { createPeer } = require('./lib/grid.js')
const { createClient } = require('./lib/unix.js')

const config = require('grid.config.js')

const max = (config.bucketSize / config.block) * config.bucket

const random = () => {
  return Math.floor(Math.random() * max)
}

function newPeer () {
  const sock = createClient()
  const peer = createPeer(sock, config.block).alloc()
  sock.onReadable = () => peer.pull()
  sock.onWritable = () => sock.resume()
  peer.onHeader = header => {
    hrecv++
    const index = random()
    let r = peer.send(index, 2)
    if (r <= 0) just.error((new just.SystemError('send')).stack)
    hsend++
    r = peer.json({ index })
    if (r <= 0) just.error((new just.SystemError('json')).stack)
    send++
  }
  sock.connect('grid.sock')
  const index = random()
  let r = peer.send(index, 2)
  if (r <= 0) just.error((new just.SystemError('send')).stack)
  hsend++
  r = peer.json({ index })
  if (r <= 0) just.error((new just.SystemError('json')).stack)
  send++
}

let send = 0
let hrecv = 0
let hsend = 0
let peers = 10
while (peers--) newPeer()

just.setInterval(() => {
  const bw = Math.floor((send * config.block) / (1024 * 1024))
  const bwb = bw * 8
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const perf = `mem ${rss} cpu (${user.toFixed(2)}/${system.toFixed(2)}) ${(user + system).toFixed(2)}`
  just.print(`block S ${send} (${bw} MB ${bwb} Mb) head S ${hsend} R ${hrecv} ${perf}`)
  send = hsend = hrecv = 0
}, 1000)
