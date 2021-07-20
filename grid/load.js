const { Peer } = require('./lib/grid.js')
const { createClient } = require('./lib/unix.js')

const config = require('grid.config.js')

function createPeer () {
  const sock = createClient()
  const peer = new Peer(sock, config.block)
  sock.onReadable = () => peer.pull()
  sock.onWritable = () => sock.resume()
  peer.onBlock = (header, off) => {
    recv++
    peer.send(1)
  }
  sock.connect('grid.sock')
  peer.send(1)
}

let recv = 0
let peers = 10
while (peers--) createPeer()

just.setInterval(() => {
  const bw = Math.floor((recv * config.block) / (1024 * 1024))
  const bwb = bw * 8
  const { user, system } = just.cpuUsage()
  const { rss } = just.memoryUsage()
  const perf = `mem ${rss} cpu (${user.toFixed(2)}/${system.toFixed(2)}) ${(user + system).toFixed(2)}`
  just.print(`recv ${recv} bw ${bw} MByte ${bwb} Mbit ${perf}`)
  recv = 0
}, 1000)
