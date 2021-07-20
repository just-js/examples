const { memory } = just.library('memory', './memory/memory.so')
const { createBlockStore } = require('./grid.js')
const { createServer, createClient } = require('./unix.js')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)
function memoryUsage () {
  const mem = just.memoryUsage()
  return { rss: Math.floor(Number(mem.rss / BigInt(mega))), external: Math.floor(Number(mem.external_memory / BigInt(mega))) }
}

const mega = 1024 * 1024
const giga = mega * 1024

const blockStore = createBlockStore({ bucket: 1, block: 1024, bucketSize: 1 * giga })
blockStore.create()
just.print(stringify(blockStore))

const o = blockStore.lookup(100)
just.print(stringify(o))
just.print(stringify(memoryUsage()))

const b = new ArrayBuffer(4096)
const server = createServer()
server.onConnect = sock => {
  sock.onReadable = () => {
    just.print(`server ${sock.fd} readable`)
    const bytes = just.net.read(sock.fd, b, 0, b.byteLength)
    just.print(`bytes read ${bytes}`)
    just.print(b.readString(bytes))
    just.net.write(sock.fd, b, bytes, 0)
  }
  sock.onWritable = () => {
    just.print(`server ${sock.fd} writable`)
    sock.resume()
  }
}
server.bind('grid.sock')
server.listen()

const sock = createClient('grid.sock')
sock.onReadable = () => {
  just.print(`client ${sock.fd} readable`)
  const bytes = just.net.read(sock.fd, b, 0, b.byteLength)
  just.print(`bytes read ${bytes}`)
  just.print(b.readString(bytes))
}
sock.onWritable = () => {
  just.print(`client ${sock.fd} writable`)
  sock.resume()
}
sock.connect('grid.sock')

require('repl').repl()
