class Parser {
  constructor () {
    this.chunks = []
  }

  execute (buf, len, callback) {
    const bytes = new Uint8Array(buf, 0, len)
    const chunks = this.chunks
    let start = 0
    for (let i = 0; i < len; i++) {
      if (bytes[i] === 0) {
        chunks.push(buf.readString(i - start, start))
        callback(chunks.join(''))
        chunks.length = 0
        start = i + 1
        continue
      }
    }
  }
}

module.exports = { Parser }
