const { createBlockStore, Peer } = require('./grid.js')
const { createServer, createClient } = require('./unix.js')
const { dump } = require('@binary')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

const server = createServer()
server.onConnect = sock => {
  server.sock = sock
  sock.onReadable = () => sock.parser.pull()
  sock.onWritable = () => sock.resume()
  sock.parser = new Peer(sock)
  sock.parser.onHeader = header => {
    just.print(stringify(header))
    const { op, index } = header
    if (op === 1) {
      const block = blockStore.lookup(header.index)
      const { bucket, start, end } = block
      sock.parser.send(index, 2)
      just.net.write(sock.fd, blockStore.buckets[bucket], end - start, start)
    }
  }
  sock.parser.onBlock = (header, off) => {
    just.print('')
    just.print(dump(new Uint8Array(sock.parser.buf, off, header.recordSize)))
    const block = blockStore.lookup(header.index)
    const { bucket, start, end } = block
    blockStore.buckets[bucket].copyFrom(sock.parser.buf, start, end - start, sock.parser.off)
  }
}

const sock = createClient()
sock.onReadable = () => sock.parser.pull()
sock.onWritable = () => sock.resume()
sock.parser = new Peer(sock)
sock.parser.onHeader = header => {
  just.print(stringify(header))
}
sock.parser.onBlock = (header, off) => {
  just.print('')
  just.print(dump(new Uint8Array(sock.parser.buf, off, header.recordSize)))
}
const b = just.sys.calloc(1, 1024)
sock.sendJSON = (index, json) => {
  b.writeString(JSON.stringify(json))
  sock.parser.send(index, 2)
  just.net.write(sock.fd, b, b.byteLength, 0)
}

const blockStore = createBlockStore({ bucket: 1, block: 1024, bucketSize: 1 * (1024 * 1024 * 1024) })
blockStore.create()
server.bind('grid.sock')
server.listen()
sock.connect('grid.sock')
require('repl').repl()
