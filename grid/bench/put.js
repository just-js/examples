const { createPeer } = require('../lib/grid.js')
const { createClient } = require('../lib/unix.js')

const config = require('../grid.config.js')

const max = ((config.bucketSize * 1024 * 1024 * 1024) / config.block) * config.bucket

const random = () => {
  return Math.floor(Math.random() * max)
}

const payload = '0'.repeat(config.block - 20)

function newPeer () {
  const sock = createClient()
  const peer = createPeer(sock, config.block).alloc()
  peer.onHeader = header => {
    hrecv++
    const index = random()
    const bytes = peer.text(index, `${index.toString().padEnd(17, ' ')} : ${payload}`)
    if (bytes > 0) send += bytes
    hsend++
  }
  sock.connect('../grid.sock')
  const index = random()
  const bytes = peer.text(index, `${index.toString().padEnd(17, ' ')} : ${payload}`)
  if (bytes > 0) send += bytes
  hsend++
}

let send = 0
let hrecv = 0
let hsend = 0
let peers = 10
while (peers--) newPeer()

just.setInterval(() => {
  const bw = Math.floor(send / (1024 * 1024))
  const bwb = bw * 8
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const perf = `mem ${rss} cpu (${user.toFixed(2)}/${system.toFixed(2)}) ${(user + system).toFixed(2)}`
  just.print(`block S ${send} (${bw} MB ${bwb} Mb) head S ${hsend} R ${hrecv} ${perf}`)
  send = hsend = hrecv = 0
}, 1000)
