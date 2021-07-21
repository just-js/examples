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
    just.print(size)
    just.print(BigInt(size))
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
  constructor (sock, blockSize = 1024, size = blockSize) {
    this.buf = just.sys.calloc(1, size)
    this.wbuf = just.sys.calloc(1, blockSize)
    this.wdv = new DataView(this.wbuf)
    this.dv = new DataView(this.buf)
    this.bufLen = this.buf.byteLength
    this.size = size
    this.blockSize = blockSize
    this.off = 0
    this.queue = []
    this.sock = sock
    this.error = false
    this.header = {}
    this.pending = 0
    this.onHeader = header => {}
    this.onBlock = (header, off) => {}
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
    const { dv, off } = this
    const version = dv.getUint8(off)
    const slot = dv.getUint8(off + 1)
    const op = dv.getUint8(off + 2)
    const flags = dv.getUint8(off + 3)
    const index = dv.getUint32(off + 4)
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

  pull () {
    this.error = false
    const available = this.bufLen - this.off
    if (available <= 0) return false
    let bytes = just.net.read(this.sock.fd, this.buf, this.off, this.bufLen - this.off)
    while (bytes > 0) {
      if (this.pending > 0) {
        if (bytes >= this.pending) {
          this.onBlock(this.header, this.off)
          bytes -= this.pending
          this.off += this.pending
          this.pending = 0
        } else {
          this.pending -= bytes
          this.off += bytes
          bytes = 0
          just.print(`one: bytes ${bytes} off ${this.off} pending ${this.pending} available ${available}`)
          bytes = just.net.read(this.sock.fd, this.buf, this.off, this.bufLen - this.off)
          continue
        }
      }
      while (bytes >= headerLength) {
        const header = this.readHeader()
        this.off += headerLength
        bytes -= headerLength
        this.onHeader(header)
        if (header.op === 2) {
          if (header.recordSize > bytes) {
            this.off += (bytes - headerLength)
            this.pending = header.recordSize - bytes
            this.header = header
            just.print(`two: bytes ${bytes} off ${this.off} pending ${this.pending} available ${available}`)
            bytes = just.net.read(this.sock.fd, this.buf, this.off, this.bufLen - this.off)
            just.print(bytes)
            continue
          } else {
            this.onBlock(header, this.off)
            this.off += header.recordSize
            bytes -= header.recordSize
            this.pending = 0
          }
        }
      }
      if (bytes > 0) {
        just.print('extra bytes')
        this.off = 0
      } else {
        this.off = 0
      }
      bytes = just.net.read(this.sock.fd, this.buf, this.off, this.bufLen - this.off)
    }
    if (bytes === 0) {
      return false
    }
    if (bytes < 0) {
      const errno = just.sys.errno()
      if (errno === just.net.EAGAIN) {
        return true
      }
      this.error = { errno, message: just.sys.strerror(errno) }
      return false
    }
    return true
  }
}

module.exports = { createBlockStore: config => new BlockStore(config), Peer }
