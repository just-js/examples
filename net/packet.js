const binary = require('lib/binary.js')
const sniff = require('lib/sniff.js')

function onPacket (packet, u8) {
  const { offset, bytes, frame, header } = packet
  if (frame && frame.protocol === 'IPv4' && header && header.protocol === protocols.TCP) {
    // tcp frames
    just.print(tcpDump(packet))
    if (bytes > offset) just.print(dump(u8.slice(offset, bytes)), false)
    just.print('')
  } else if (frame && frame.protocol === 'IPv4' && header && header.protocol === protocols.UDP) {
    // handle a udp message
    just.print(udpDump(packet))
    if (bytes > offset) just.print(dump(u8.slice(offset, bytes)), false)
    just.print('')
  }
}

const { net, SystemError } = just
const { SOCK_RAW, AF_PACKET, PF_PACKET, ETH_P_ALL } = net
const { Parser, protocols } = sniff
const { dump, toMAC, htons16, tcpDump, udpDump } = binary

function main (args) {
  const { buf, u8, parse } = new Parser()
  const iff = args[0]
  let i = 0
  const fd = net.socket(PF_PACKET, SOCK_RAW, htons16(ETH_P_ALL))
  if (fd < 0) throw new SystemError('socket')
  if (iff) {
    // bind to a specific interface
    const mac = new ArrayBuffer(6)
    let r = net.getMacAddress(fd, iff, mac)
    if (r < 0) throw new SystemError('getMacAddress')
    r = net.bindInterface(fd, iff, AF_PACKET, htons16(ETH_P_ALL))
    if (r < 0) throw new SystemError('bindInterface')
    just.print(`bound to interface ${iff} (${toMAC(new Uint8Array(mac))})`)
  }
  while (1) {
    // this is synchronous - no need for the event loop
    const bytes = net.recv(fd, buf)
    if (bytes === 0) break
    if (bytes < 0) throw new SystemError('recv')
    // hack to ignore duplicates on lo until we have recvfrom: https://stackoverflow.com/questions/17194844/packetsocket-opened-on-loopback-device-receives-all-the-packets-twice-how-to-fi
    if (!(iff === 'lo' && ((i++ % 2) === 0))) onPacket(parse(bytes, true), u8)
  }
  net.close(fd)
}

main(just.args.slice(2))
