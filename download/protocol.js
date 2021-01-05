const { http } = just.library('http', 'http.so')
const {
  parseResponses,
  getResponses,
  parseRequests,
  getStatusCode,
  getStatusMessage,
  getHeaders,
  getRequests,
  getUrl
} = http

const free = []

function chunkedParser (buf) {
  let inHeader = true
  let offset = 0
  let chunkLen = 0
  let ending = false
  const digits = []
  const u8 = new Uint8Array(buf)
  function parse (bytes) {
    offset = buf.offset
    while (bytes) {
      if (inHeader) {
        const c = u8[offset]
        offset++
        bytes--
        if (c === 13) {
          continue
        } else if (c === 10) {
          if (ending) {
            buf.offset = offset
            parser.onEnd()
            ending = false
            continue
          }
          if (digits.length) {
            chunkLen = parseInt(`0x${digits.join('')}`)
            if (chunkLen > 0) {
              inHeader = false
            } else if (chunkLen === 0) {
              ending = true
            }
            digits.length = 0
          }
          continue
        } else if ((c > 47 && c < 58)) {
          digits.push(String.fromCharCode(c))
          continue
        } else if ((c > 96 && c < 103)) {
          digits.push(String.fromCharCode(c))
          continue
        } else if ((c > 64 && c < 71)) {
          digits.push(String.fromCharCode(c))
          continue
        } else {
          just.print('BAD_CHAR')
        }
        just.print('OOB:')
        just.print(`c ${c}`)
        just.print(`bytes ${bytes}`)
        just.print(`offset ${offset}`)
        just.print(`chunkLen ${chunkLen}`)
        throw new Error('OOB')
      } else {
        if (bytes >= chunkLen) {
          buf.offset = offset
          parser.onData(chunkLen)
          inHeader = true
          offset += chunkLen
          bytes -= chunkLen
          chunkLen = 0
        } else {
          buf.offset = offset
          parser.onData(bytes)
          chunkLen -= bytes
          bytes = 0
        }
      }
      buf.offset = offset
    }
  }
  function reset () {

  }
  const parser = { parse, reset }
  return parser
}

function requestParser (buffer) {
  if (free.length) {
    const parser = free.shift()
    parser.buffer.offset = 0
    return parser
  }
  const answer = [0]
  const parser = { buffer }
  function parse (bytes, off = 0) {
    const { offset } = buffer
    const count = parseRequests(buffer, offset + bytes, off, answer)
    if (count > 0) {
      parser.onRequests(count)
    }
    const [remaining] = answer
    if (remaining > 0) {
      const start = offset + bytes - remaining
      const len = remaining
      if (start > offset) {
        buffer.copyFrom(buffer, 0, len, start)
      }
      buffer.offset = len
      return
    }
    buffer.offset = 0
  }
  buffer.offset = 0
  parser.parse = parse
  parser.get = count => getRequests(count)
  parser.url = index => getUrl(index)
  parser.headers = index => getHeaders(index)
  parser.free = () => free.push(parser)
  return parser
}

function responseParser (buffer) {
  if (free.length) {
    const parser = free.shift()
    parser.buffer.offset = 0
    return parser
  }
  const answer = [0]
  const parser = { buffer }
  function parse (bytes, off = 0) {
    const count = parseResponses(buffer, buffer.offset + bytes, buffer.offset, answer)
    const { offset } = buffer
    const [remaining] = answer
    if (remaining > 0) {
      const start = offset + bytes - remaining
      buffer.offset = start
      buffer.remaining = remaining
      if (count > 0) {
        parser.onResponses(count)
      }
    } else {
      if (count > 0) {
        parser.onResponses(count)
      }
    }
    buffer.offset = 0
  }
  buffer.offset = 0
  parser.parse = parse
  parser.get = count => getResponses(count)
  parser.status = index => ({ code: getStatusCode(index), message: getStatusMessage(index) })
  parser.headers = index => getHeaders(index)
  parser.free = () => free.push(parser)
  return parser
}

const [HTTP_REQUEST, HTTP_RESPONSE, HTTP_CHUNKED] = [0, 1, 2]
const create = { [HTTP_CHUNKED]: chunkedParser, [HTTP_REQUEST]: requestParser, [HTTP_RESPONSE]: responseParser }

function createParser (buffer, type = HTTP_REQUEST) {
  return create[type](buffer)
}

module.exports = { createParser, HTTP_RESPONSE, HTTP_REQUEST, HTTP_CHUNKED }
