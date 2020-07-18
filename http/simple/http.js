
const MIN_REQUEST_SIZE = 16

function createHTTPStream (buf = new ArrayBuffer(4096), maxPipeline = 256, off = 0) {
  let offset = off
  const dv = new DataView(buf)
  const bufLen = buf.byteLength
  const offsets = new Uint16Array(Math.floor(buf.byteLength / MIN_REQUEST_SIZE))
  function parse (bytes, onRequests) {
    if (bytes === 0) return
    const size = offset + bytes
    const len = Math.min(size, bufLen)
    let off = 0
    let count = 0
    const end = len - 3
    for (; off < end; off++) {
      if (dv.getUint32(off, true) === 168626701) {
        offsets[count++] = off + 4
        off += 3
      }
    }
    offsets[count] = off
    if (count > 0) {
      onRequests(count)
      if (off < size) {
        offset = size - off
        buf.copyFrom(buf, 0, offset, off)
      } else {
        offset = 0
      }
    } else {
      if (size === buf.byteLength) {
        return -3
      }
      offset = size
    }
    return offset
  }
  function getHeaders (index) {
    if (index === 0) {
      return buf.readString(offsets[index], 0)
    }
    return buf.readString(offsets[index] - offsets[index - 1], offsets[index - 1])
  }
  return { parse, getHeaders }
}

module.exports = { createHTTPStream }
