const { http } = just.library('http.so', 'http')
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
      const len = remaining
      buffer.offset = start
      buffer.remaining = remaining
      if (count > 0) {
        parser.onResponses(count)
      }
      if (start > offset) {
        buffer.copyFrom(buffer, 0, len, start)
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

const [HTTP_REQUEST, HTTP_RESPONSE] = [0, 1]
const create = { [HTTP_REQUEST]: requestParser, [HTTP_RESPONSE]: responseParser }

function createParser (buffer, type = HTTP_REQUEST) {
  return create[type](buffer)
}

module.exports = { createParser, HTTP_RESPONSE, HTTP_REQUEST }
