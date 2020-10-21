const { net, sys } = just
const { AF_INET, SOCK_RAW, IPPROTO_TCP, IPPROTO_ICMP, IPPROTO_UDP, IPPROTO_RAW, IPPROTO_IGMP, PF_PACKET } = net
const { Parser, protocols } = require('lib/sniff.js')
const { dump } = require('lib/binary.js')

function localHTTP80Handler (packet, bytes) {
  const { offset, remaining, header, message } = packet
  if (header.protocol === protocols.TCP && header.source === '127.0.0.1' && header.dest === '127.0.0.1') {
    if (message && (message.source === 8080 || message.dest === 8080)) {
      just.print(JSON.stringify(packet, null, '  '))
      if (remaining > 0) {
        dump(u8.slice(offset, bytes))
      }
    }
  }
}

function udpHandler (packet, bytes) {
  just.print(JSON.stringify(packet, null, '  '))
  dump(u8.slice(packet.offset, bytes))
}

function prettyHandler (packet, bytes) {
  const { offset } = packet
  just.print(JSON.stringify(packet, null, '  '))
  dump(u8.slice(offset, bytes))
}

const fd = net.socket(AF_INET, SOCK_RAW, IPPROTO_TCP)
if (fd < 0) throw new Error(`socket (${sys.errno()}) ${sys.strerror(sys.errno())}`)

const { buf, u8, parse } = new Parser()

while (1) {
  const bytes = net.recv(fd, buf)
  if (bytes === 0) break
  if (bytes < 0) {
    just.error(`recv (${sys.errno()}) ${sys.strerror(sys.errno())}`)
    break
  }
  const packet = parse(bytes)
  //localHTTP80Handler(packet, bytes)
  prettyHandler(packet, bytes)
  //udpHandler(packet, bytes)
}

net.close(fd)
