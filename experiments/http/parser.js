const MAX_PIPELINE = 512
const EOH = 168626701 // CrLfCrLf as a 32 bit unsigned integer

function createParser (buf, maxPipeline = MAX_PIPELINE) {
  const bufLen = buf.byteLength
  const dv = new DataView(buf)
  const offsets = new Uint16Array(maxPipeline * 2)
  const state = { count: 0, off: 0 }
  function parse (len = bufLen) {
    len = Math.min(len, bufLen)
    let off = 0
    let count = 0
    for (let i = 0; i < len - 3; i++) {
      const next4 = dv.getUint32(i, true)
      if (next4 === EOH) {
        const index = count * 2
        offsets[index] = off
        offsets[index + 1] = i + 4 - off
        off = i + 4
        count++
        // todo: check for exceeding maxPipeline
      }
    }
    state.count = count
    state.off = off
    return state
  }
  return { offsets, state, parse }
}

module.exports = { createParser }
