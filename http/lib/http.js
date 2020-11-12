const { http } = just.library('http.so', 'http')
const {
  parseResponses,
  getResponses,
  parseRequests,
  getStatusCode,
  getStatusMessage,
  getHeaders,
  getRequests,
  getMethod,
  getUrl
} = http

const free = { request: [], response: [] }

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
    const parser = free.request.shift()
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
  parser.method = index => getMethod(index)
  parser.headers = index => getHeaders(index)
  parser.free = () => free.request.push(parser)
  return parser
}

function responseParser (buffer) {
  if (free.length) {
    const parser = free.response.shift()
    parser.buffer.offset = 0
    return parser
  }
  const answer = [0]
  const parser = { buffer }
  function parse (bytes, off = 0) {
    const { offset } = buffer
    const count = parseResponses(buffer, offset + bytes, offset, answer)
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
  parser.free = () => free.response.push(parser)
  return parser
}

function createHTTPServer (server, name = 'j') {
  if (server.timer) just.clearInterval(server.timer)
  let time = (new Date()).toUTCString()
  server.rHTML = `HTTP/1.1 200 OK\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: `
  server.rTEXT = `HTTP/1.1 200 OK\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: `
  server.rJSON = `HTTP/1.1 200 OK\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: `
  server.r404 = `HTTP/1.1 404 Not Found\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n`
  server.favicon = `HTTP/1.1 200 OK\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: image/vnd.microsoft.icon\r\nContent-Length: `
  server.timer = just.setInterval(() => {
    time = (new Date()).toUTCString()
    server.rHTML = `HTTP/1.1 200 OK\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: `
    server.rTEXT = `HTTP/1.1 200 OK\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: `
    server.rJSON = `HTTP/1.1 200 OK\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: application/json\r\nContent-Length: `
    server.r404 = `HTTP/1.1 404 Not Found\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: text/plain\r\nContent-Length: 0\r\n\r\n`
    server.favicon = `HTTP/1.1 200 OK\r\nServer: ${name}\r\nDate: ${time}\r\nContent-Type: image/vnd.microsoft.icon\r\nContent-Length: `
  }, 500)
  return server
}

const [HTTP_REQUEST, HTTP_RESPONSE, HTTP_CHUNKED] = [0, 1, 2]
const create = { [HTTP_CHUNKED]: chunkedParser, [HTTP_REQUEST]: requestParser, [HTTP_RESPONSE]: responseParser }

function createParser (buffer, type = HTTP_REQUEST) {
  return create[type](buffer)
}

module.exports = { createParser, createHTTPServer, HTTP_RESPONSE, HTTP_REQUEST, HTTP_CHUNKED }
