const binary = require('@binary')
const dump = require(`${just.args[2] || 'dump'}.json`)
const direction = just.args[3] || 'out'
const connection = parseInt(just.args[4] || '0', 10)
const ports = Object.keys(dump)
const port = dump[ports[connection]]
const packets = port
for (const { packet, payload } of packets[direction]) {
  const keys = Object.keys(payload)
  if (!keys.length) continue
  just.print(packet.bytes)
  just.print(packet.message.options.timestamp.tsval)
  just.print(binary.tcpDump(packet))
  just.print(binary.dump(Uint8Array.from(keys.map(k => payload[k]))))
}
