const { HTTPStream } = just.require('./http.js')
const { parseRequest, getRequest } = just.http

const BUFSIZE = 1 * 1024
const payload = 'GET / HTTP/1.1\r\nHost: foo\r\n\r\n'
const repeat = Math.floor(BUFSIZE / payload.length)
const buf = ArrayBuffer.fromString(payload.repeat(repeat))
const stream = new HTTPStream(buf, 256)
stream.index = 0

function onRequest (req) {
  just.print(JSON.stringify(req))
}

const err = stream.parse(buf.byteLength, count => {
  just.print(count)
  const { offsets } = stream
  for (let i = 0; i < count; i++) {
    const len = i ? offsets[i] - offsets[i - 1] : offsets[i]
    const off = i ? offsets[i - 1] : 0
    parseRequest(buf, len, off)
    onRequest(Object.assign({ index: stream.index++, buf, off, len, rawHeaders: stream.getHeaders(i) }, getRequest()))
  }
})
just.print(err)
