const protocols = {
  IP: 0,
  ICMP: 1,
  IGMP: 2,
  TCP: 6,
  UDP: 17,
  RDP: 27,
  IPv6: 41,
  'IPv6-ICMP': 58,
  ARP: 59,
  SCTP: 132
}

function Parser () {
  const buf = new ArrayBuffer(65536)
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)

  let offset = 0

  function parseUDPMessage (message) {
    const type = 'udp'
    const source = dv.getUint16(offset)
    const dest = dv.getUint16(offset + 2)
    const length = dv.getUint16(offset + 4)
    const checksum = dv.getUint16(offset + 6)
    offset += 8
    return { type, source, dest, length, checksum }
  }

  function parseTCPMessage (message) {
    const type = 'tcp'
    const source = dv.getUint16(offset)
    const dest = dv.getUint16(offset + 2)
    const seq = dv.getUint32(offset + 4)
    const ack = dv.getUint32(offset + 8)
    const field = dv.getUint16(offset + 12)
    const doff = field >> 12
    const flags = field & 0b111111111
    const [NS, CWR, ECE, URG, ACK, PSH, RST, SYN, FIN] = [
      (flags >> 8) & 0b1,
      (flags >> 7) & 0b1,
      (flags >> 6) & 0b1,
      (flags >> 5) & 0b1,
      (flags >> 4) & 0b1,
      (flags >> 3) & 0b1,
      (flags >> 2) & 0b1,
      (flags >> 1) & 0b1,
      flags & 0b1
    ]
    const window = dv.getUint16(offset + 14)
    const checksum = dv.getUint16(offset + 16)
    const urgent = dv.getUint16(offset + 18)
    const extra = (doff * 4) - 20
    const options = {}
    offset += 20
    if (extra > 0) {
      let i = extra
      while (i) {
        const kind = u8[offset]
        if (kind === 0) {
          offset++
          i--
          break
        }
        if (kind === 1) {
          offset++
          i--
          continue
        }
        if (kind === 2) {
          options.maxss = dv.getUint16(offset + 2)
          offset += 4
          i -= 4
          continue
        }
        if (kind === 3) {
          options.windowScale = u8[offset + 2]
          offset += 3
          i -= 3
          continue
        }
        if (kind === 4) {
          options.selAck = true
          offset += 2
          i -= 2
          continue
        }
        if (kind === 5) {
          const len = u8[offset + 1]
          options.sackSize = len - 2
          options.sack = new Uint8Array(buf, offset + 2, options.sackSize)
          offset += len
          i -= len
          continue
        }
        if (kind === 8) {
          options.timestamp = { tsval: dv.getUint32(offset + 2), tsecr: dv.getUint32(offset + 6), bytes: new Uint8Array(buf, offset + 2, 8) }
          offset += 10
          i -= 10
          continue
        }
        throw new Error(`Unknown Option Kind ${kind}`)
      }
    }
    return { type, options, source, dest, seq, ack, doff, flags: { NS, CWR, ECE, URG, ACK, PSH, RST, SYN, FIN }, window, checksum, urgent, extra }
  }

  function parse (bytes, ethernet = false) {
    offset = 0
    let frame
    if (ethernet) {
      const source = new Uint8Array(buf, offset, 6)
      const dest = new Uint8Array(buf, offset + 6, 6)
      const type = dv.getUint16(offset + 12)
      frame = { source, dest, type }
      if (type <= 1500) {
        frame.size = type
      }
      if (type >= 1536) {
        if (type === 0x0800) {
          // IPv4 Datagram
          frame.protocol = 'IPv4'
        } else if (type === 0x0806) {
          frame.protocol = 'ARP'
        }
      }
      offset += 14
    }
    let field = u8[offset]
    const version = field >> 4
    const ihl = field & 0b1111
    field = u8[offset + 1]
    const dscp = field >> 2
    const ecn = field & 0b11
    const len = dv.getUint16(offset + 2)
    const id = dv.getUint16(offset + 4)
    field = dv.getUint16(offset + 6)
    const flags = field >> 13
    const DF = flags >> 1 & 0b1
    const MF = flags >> 2 & 0b1
    const foff = field & 0b1111111111111
    const ttl = u8[offset + 8]
    const protocol = u8[offset + 9]
    const checksum = dv.getUint16(offset + 10)
    const source = dv.getUint32(offset + 12)
    const dest = dv.getUint32(offset + 16)
    const header = { version, ihl, dscp, ecn, id, flags, DF, MF, foff, ttl, protocol, checksum, source, dest }
    header.length = { header: ihl * 4, total: len }
    offset += header.length.header
    let message
    if (protocol === protocols.TCP) {
      message = parseTCPMessage()
    } else if (protocol === protocols.UDP) {
      message = parseUDPMessage()
    }
    const remaining = bytes - offset
    return { frame, header, message, offset, bytes, remaining }
  }

  return { u8, buf, parse }
}

module.exports = { Parser, protocols }
