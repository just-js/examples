const { sys } = just

const mega = 1024 * 1024
const giga = mega * 1024

const constants = {
  version: 1,
  messages: {
    GET: 1,
    PUT: 2,
    ACK: 3,
    NACK: 4
  },
  headerSize: 8
}

const { headerSize, messages, version } = constants

class Bitmap {
  constructor (size) {
    const bitmapSize = Math.ceil(size / 8)
    const buf = new ArrayBuffer(bitmapSize)
    this.bytes = new Uint8Array(buf)
  }

  set (id) {
    const { bytes } = this
    const byte = Math.floor(id / 8)
    const bit = id % 8
    bytes[byte] = bytes[byte] | (1 << bit)
  }

  unset (id) {
    const { bytes } = this
    const byte = Math.floor(id / 8)
    const bit = id % 8
    bytes[byte] = bytes[byte] & ~(1 << bit)
  }

  test (id) {
    const { bytes } = this
    const byte = Math.floor(id / 8)
    const bit = id % 8
    return bytes[byte] & (1 << bit)
  }
}

class BlockStore {
  constructor (config) {
    this.config = config
    this.block = { index: 0, bucket: 0, slot: 0, start: 0, end: 0, size: 0 }
    this.sizes = new Uint16Array(0)
  }

  alloc (size) {
    return sys.calloc(1, BigInt(size))
  }

  create () {
    const { bucket = 1, bucketSize = 1, block = 4096 } = this.config
    this.bucketSize = bucketSize * giga
    this.buckets = (new Array(bucket)).fill(0).map(() => this.alloc(bucketSize * giga))
    this.bucketSlots = Math.floor(this.bucketSize / block)
    this.totalSlots = this.bucketSlots * bucket
    this.blockSize = block
    this.totalSize = this.bucketSize * bucket
    this.start = this.buckets.map(b => b.getAddress())
    this.bitmap = new Bitmap(this.totalSlots)
    this.sizes = new Uint16Array(this.totalSlots)
    return this
  }

  destroy () {
    this.buckets = null
    return this
  }

/*
  set (i) {
    return this.bitmap.set(i)
  }

  clear (i) {
    return this.bitmap.unset(i)
  }

  exists (i) {
    return this.bitmap.test(i)
  }
*/

  put (i, buf, off, len) {
    const block = this.lookup(i)
    const { bucket, start, index } = block
    this.sizes[index] = len
    this.buckets[bucket].copyFrom(buf, start, len, off)
    this.bitmap.set(i)
    return true
  }

  get (i) {
    if (!this.bitmap.test(i)) return null
    return this.lookup(i)
  }

  lookup (i) {
    const { bucketSlots, blockSize, block } = this
    block.bucket = (i / bucketSlots) >> 0
    if (block.bucket > (this.config.bucket - 1)) return null
    block.index = i
    block.slot = (i % bucketSlots)
    block.start = block.slot * blockSize
    block.end = block.start + blockSize
    block.size = this.sizes[i]
    return block
  }
}

class Peer {
  constructor (sock, blockSize = 1024) {
    this.size = blockSize + headerSize
    this.blockSize = blockSize
    this.sock = sock
    this.error = 0
    this.onHeader = () => {}
    this.onBlock = () => {}
    this.wantHeader = true
    this.off = 0
    this.start = 0
    this.header = {}
    this.buf = null
    this.wbuf = null
    this.hbuf = null
    this.hdv = null
    this.dv = null
  }

  alloc () {
    this.buf = sys.calloc(1, this.size)
    if (!this.buf) return
    this.wbuf = sys.calloc(1, this.size)
    if (!this.wbuf) return
    this.hbuf = sys.calloc(1, constants.headerSize)
    if (!this.hbuf) return
    this.hdv = new DataView(this.hbuf)
    this.dv = new DataView(this.buf)
    return this
  }

  writeHeader (version, op, index, size) {
    const { hdv } = this
    hdv.setUint8(0, version)
    hdv.setUint8(1, op & 0xf)
    hdv.setUint16(2, size)
    hdv.setUint32(4, index)
    return headerSize
  }

  readHeader () {
    const { dv, start } = this
    const version = dv.getUint8(start)
    const op = dv.getUint8(start + 1) & 0xf
    const size = dv.getUint16(start + 2)
    const index = dv.getUint32(start + 4)
    return { version, op, index, size }
  }

  message (index, op = messages.GET, size = headerSize) {
    const len = this.writeHeader(version, op, index, size)
    const r = this.sock.write(this.hbuf, len, 0)
    if (r <= 0) {
      just.error((new just.SystemError('write')).stack)
      return false
    }
    return true
  }

  buffer (buf, len, off = 0) {
    const r = this.sock.write(buf, len, off)
    if (r <= 0) {
      just.error((new just.SystemError('write')).stack)
      return false
    }
    return true
  }

  json (index, o) {
    const { wbuf } = this
    const len = wbuf.writeString(JSON.stringify(o))
    if (!this.message(index, messages.PUT, len)) return false
    const r = this.sock.write(wbuf, len, 0)
    if (r <= 0) {
      just.error((new just.SystemError('write')).stack)
      return false
    }
    return true
  }

  consume (bytes) {
    while (bytes) {
      if (this.wantHeader) {
        const size = this.off - this.start
        if (size + bytes >= headerSize) {
          this.header = this.readHeader()
          this.onHeader()
          this.start += headerSize
          this.off = this.start
          if (this.header.op === messages.PUT) this.wantHeader = false
          bytes -= (headerSize - size)
        } else {
          this.off += bytes
          bytes = 0
        }
      } else {
        const size = this.off - this.start
        const { header } = this
        if (size + bytes >= header.size) {
          this.onBlock()
          this.start += header.size
          this.off = this.start
          this.wantHeader = true
          bytes -= (header.size - size)
        } else {
          this.off += bytes
          bytes = 0
        }
      }
    }
    if (this.start === this.off) this.off = this.start = 0
    return true
  }

  pull () {
    const { sock } = this
    this.error = 0
    const available = this.size - this.off
    if (available <= 0) {
      just.error(`No Space Left in Buffer len ${this.size} off ${this.off} start ${this.start} wantHeader ${this.wantHeader}`)
      sock.close()
      return false
    }
    const bytes = sock.read(this.buf, this.off, available)
    if (bytes > 0) {
      return this.consume(bytes)
    }
    if (bytes === 0) {
      sock.close()
      return false
    }
    if (sock.isEmpty()) return true
    sock.close()
    return false
  }
}

module.exports = Object.assign({
  createBlockStore: (...args) => new BlockStore(...args),
  createBitmap: (...args) => new Bitmap(...args),
  createPeer: (...args) => new Peer(...args)
}, constants)
