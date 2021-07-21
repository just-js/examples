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
    const r = peer.send(random())
    if (r <= 0) just.error((new just.SystemError('send')).stack)
    hsend++
  }
  peer.onBlock = () => recv++
  sock.connect('grid.sock')
  const r = peer.send(random())
  if (r <= 0) just.error((new just.SystemError('send')).stack)
}

let recv = 0
let hrecv = 0
let hsend = 0
let peers = 10
while (peers--) newPeer()

just.setInterval(() => {
  const bw = Math.floor((recv * config.block) / (1024 * 1024))
  const bwb = bw * 8
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const perf = `mem ${rss} cpu (${user.toFixed(2)}/${system.toFixed(2)}) ${(user + system).toFixed(2)}`
  just.print(`block R ${recv} (${bw} MB ${bwb} Mb) head S ${hsend} R ${hrecv} ${perf}`)
  recv = hsend = hrecv = 0
}, 1000)
