const binary = require('@binary')
const dump = require('dump.json')
const ports = Object.keys(dump)
for (const port of ports) {
  const packets = dump[port]
  for (const { packet, payload } of packets.out) {
    just.print(binary.tcpDump(packet))
    just.print(binary.dump(Uint8Array.from(Object.keys(payload).map(k => payload[k]))))
  }
}
