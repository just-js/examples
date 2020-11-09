const { net, sys } = just
const { SOCK_RAW, AF_PACKET, PF_PACKET, ETH_P_ALL } = net
const { Parser, protocols } = require('lib/sniff.js')
const binary = require('lib/binary.js')
const { dump, ANSI, toMAC, b2ipv4, getFlags, htons16 } = binary
const { AD, AY, AM, AC, AG } = ANSI

class SystemError {
  constructor (syscall) {
    this.name = 'SystemError'
    this.message = `${syscall} (${sys.errno()}) ${sys.strerror(sys.errno())}`
    Error.captureStackTrace(this, this.constructor)
    this.stack = this.stack.split('\n').slice(0, -4).join('\n')
  }
}

function pad (n, p = 10) {
  return n.toString().padStart(p, ' ')
}

function tcpDump (packet) {
  const { frame, header, message } = packet // eth frame, ip header, tcp message
  const { seq, ack, flags } = message // get tcp fields
  const [source, dest] = [b2ipv4(header.source), b2ipv4(header.dest)] // convert source and dest ip to human-readable
  return `
${AM}Eth  ${AD}: ${AM}${toMAC(frame.source)}${AD} -> ${AM}${toMAC(frame.dest)}${AD}
${AG}${frame.protocol.padEnd(4, ' ')} ${AD}:  ${AG}${source}${AD} -> ${AG}${dest}${AD}
${AY}TCP  ${AD}:   ${AY}${pad(message.source, 5)}${AD} -> ${AY}${pad(message.dest, 5)}${AD} seq ${AY}${pad(seq)}${AD} ack ${AY}${pad(ack)}${AD} (${AC}${getFlags(flags).join(' ')}${AD})
`.trim()
}

function onPacket (packet) {
  const { offset, bytes, frame, header } = packet
  if (frame && frame.protocol === 'IPv4' && header && header.protocol === protocols.TCP) {
    // tcp frames
    just.print(tcpDump(packet))
    if (bytes > offset) just.print(dump(u8.slice(offset, bytes)), false)
    just.print('')
  } else if (frame && frame.protocol === 'IPv4' && header && header.protocol === protocols.UDP) {
    // ignore
  } else {
    // dump any others
  }
}

const { buf, u8, parse } = new Parser()

function main (args) {
  const iff = args[0]
  let i = 0
  const fd = net.socket(PF_PACKET, SOCK_RAW, htons16(ETH_P_ALL))
  if (fd < 0) throw new SystemError('socket')
  if (iff) {
    // bind to a specific interface
    const r = net.bindInterface(fd, iff, AF_PACKET, htons16(ETH_P_ALL))
    if (r < 0) throw new SystemError('bind')
  }
  while (1) {
    const bytes = net.recv(fd, buf)
    if (bytes === 0) break
    if (bytes < 0) throw new SystemError('recv')
    // hack to ignore duplicates on lo until we have recfrom: https://stackoverflow.com/questions/17194844/packetsocket-opened-on-loopback-device-receives-all-the-packets-twice-how-to-fi
    if (!(iff === 'lo' && ((i++ % 2) === 0))) onPacket(parse(bytes, true))
  }
  net.close(fd)
}

try {
  main(just.args.slice(2))
} catch (err) {
  just.error(err.stack)
}
  