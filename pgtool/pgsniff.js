const binary = require('@binary')
const packet = require('@packet')
const { signal } = just.library('signal')

const { net, SystemError } = just
const { SOCK_RAW, AF_PACKET, PF_PACKET, ETH_P_ALL } = net
const { dump, toMAC, htons16, tcpDump } = binary
const { Parser, protocols } = packet
const { reset, sigaction, SIGINT, SIGTERM } = signal

const clients = {}

function onPacket (packet, u8) {
  const { offset, bytes, frame, header } = packet
  if (frame && frame.protocol === 'IPv4' && header && header.protocol === protocols.TCP) {
    if (packet.message && (packet.message.source === port || packet.message.dest === port)) {
      if (packet.message.source !== port && !clients[packet.message.source]) {
        clients[packet.message.source] = { in: [], out: [] }
      }
      const payload = u8.slice(offset, bytes)
      if (packet.message.source !== port) {
        clients[packet.message.source].out.push({ packet, payload })
      } else {
        clients[packet.message.dest].in.push({ packet, payload })
      }
      just.print(tcpDump(packet))
      if (bytes > offset) just.print(dump(payload), false)
      just.print('')
    }
  }
}

const port = parseInt(just.args[3] || 5432, 10)

function main (iff = 'lo') {
  const { buf, u8, parse } = new Parser()
  const fd = net.socket(PF_PACKET, SOCK_RAW, htons16(ETH_P_ALL))
  if (fd < 0) throw new SystemError('socket')
  if (iff) {
    const mac = new ArrayBuffer(6)
    let r = net.getMacAddress(fd, iff, mac)
    if (r < 0) throw new SystemError('getMacAddress')
    r = net.bindInterface(fd, iff, AF_PACKET, htons16(ETH_P_ALL))
    if (r < 0) throw new SystemError('bindInterface')
    just.print(`bound to interface ${iff} (${toMAC(new Uint8Array(mac))})`)
  }
  while (1) {
    const bytes = net.recv(fd, buf, 0, buf.byteLength)
    if (bytes === 0) break
    if (bytes < 0) {
      const errno = just.sys.errno()
      if (errno === just.net.EINTR) {
        just.print('read interrupted')
        break
      }
      throw new SystemError('recv')
    }
    onPacket(parse(bytes, true), u8)
  }
  net.close(fd)
}

sigaction(SIGINT, signum => {
  require('fs').writeFile('dump.json', ArrayBuffer.fromString(JSON.stringify(clients)))
})

main(just.args[2])
