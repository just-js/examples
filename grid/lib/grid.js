const mega = 1024 * 1024
const giga = mega * 1024

const headerLength = 8

class BlockStore {
  constructor (config) {
    this.config = config
    this.index = { bucket: 0, slot: 0, start: 0, end: 0 }
    this.counter = 0
  }

  alloc (index, size) {
    return just.sys.calloc(1, BigInt(size))
  }

  create () {
    const { bucket = 1, bucketSize = 1, block = 4096 } = this.config
    this.buckets = (new Array(bucket)).fill(0).map((v, i) => this.alloc(i, bucketSize * giga))
    this.bucketSlots = Math.floor((bucketSize * giga) / block)
    this.totalSlots = this.bucketSlots * bucket
    this.blockSize = block
    this.totalSize = (bucketSize * giga) * bucket
    this.start = this.buckets.map(b => b.getAddress())
    return this
  }

  destroy () {
    this.buckets = null
    return this
  }

  lookup (i) {
    const { bucketSlots, blockSize, index } = this
    index.bucket = (i / bucketSlots) >> 0
    if (index.bucket > (this.config.bucket - 1)) return null
    index.slot = (i % bucketSlots)
    index.start = index.slot * blockSize
    index.end = index.start + blockSize
    this.counter++
    return index
  }
}

class Peer {
  constructor (sock, blockSize = 1024, size = blockSize * 2) {
    this.size = size
    this.blockSize = blockSize
    this.sock = sock
    this.bufLen = size
    this.error = 0
    this.onHeader = () => {}
    this.onBlock = () => {}
    this.wantHeader = true
    this.off = 0
    this.start = 0
    this.header = {}
  }

  alloc () {
    this.buf = just.sys.calloc(1, this.size)
    if (!this.buf) return
    this.wbuf = just.sys.calloc(1, this.blockSize)
    if (!this.wbuf) return
    this.wdv = new DataView(this.wbuf)
    this.dv = new DataView(this.buf)
    return this
  }

  writeHeader (version, slot, op, index, recordSize, extraKeys) {
    const { wdv } = this
    wdv.setUint8(0, version)
    wdv.setUint8(1, slot)
    wdv.setUint8(2, op)
    wdv.setUint8(3, (Math.log2(recordSize) - 8) | (extraKeys << 4))
    wdv.setUint32(4, index)
    return headerLength
  }

  readHeader () {
    const { dv, start } = this
    const version = dv.getUint8(start)
    const slot = dv.getUint8(start + 1)
    const op = dv.getUint8(start + 2)
    const flags = dv.getUint8(start + 3)
    const index = dv.getUint32(start + 4)
    const recordSize = Math.pow(2, (flags & 0xff) + 8)
    const extraKeys = flags >> 4
    return { version, slot, op, index, flags, recordSize, extraKeys }
  }

  send (index, op = 1, size = this.blockSize, slot = 0) {
    return just.net.write(this.sock.fd, this.wbuf, this.writeHeader(1, slot, op, index, size, 0), 0)
  }

  json (o) {
    this.wbuf.writeString(JSON.stringify(o))
    return just.net.write(this.sock.fd, this.wbuf, this.blockSize, 0)
  }

  consume (bytes) {
    const { blockSize } = this
    while (bytes) {
      if (this.wantHeader) {
        const size = this.off - this.start
        if (size + bytes >= headerLength) {
          this.header = this.readHeader()
          this.onHeader()
          this.off += headerLength
          this.start = this.off
          if (this.header.op === 2) this.wantHeader = false
          bytes -= headerLength
        } else {
          this.off += bytes
          bytes = 0
        }
      } else {
        const size = this.off - this.start
        if (size + bytes >= blockSize) {
          this.onBlock()
          this.off += blockSize
          this.start = this.off
          this.wantHeader = true
          bytes -= blockSize
        } else {
          this.off += bytes
          bytes = 0
        }
      }
    }
    if (this.start === this.off) this.off = this.start = 0
  }

  pull () {
    this.error = 0
    const available = this.bufLen - this.off
    if (available <= 0) {
      just.error(`No Space Left in Buffer len ${this.bufLen} off ${this.off}`)
      return false
    }
    const wanted = this.bufLen - this.off
    const bytes = just.net.read(this.sock.fd, this.buf, this.off, wanted)
    if (bytes > 0) {
      return this.consume(bytes)
    }
    if (bytes === 0) {
      just.net.close(this.sock.fd)
      return false
    }
    this.error = just.sys.errno()
    if (this.error === just.net.EAGAIN) {
      this.error = 0
      return true
    }
    just.net.close(this.sock.fd)
    return false
  }
}

module.exports = {
  createBlockStore: (...args) => new BlockStore(...args),
  createPeer: (...args) => new Peer(...args)
}
