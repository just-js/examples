const tcp = require('lib/tcp.js')
const http = require('lib/http.js')
const fs = require('fs') // fs builtin

const { SystemError } = just
const { createServer } = tcp
const { createParser, HTTP_REQUEST, createHTTPServer } = http
const { readFileBytes } = fs

function main () {
  const MAXHEADERS = 4096
  const server = createHTTPServer(createServer('127.0.0.1', 3000), 'my-server')
  const favicon = readFileBytes('favicon.ico')
  server.reusePort(true)
  server.reuseAddress(true)
  server.onConnect = sock => {
    // we should move this into lib/http.js but need to come up with a nicer
    // abstraction. this is just to show various bits of lower level plumbing
    const END = '\r\n\r\n'
    const buf = new ArrayBuffer(MAXHEADERS)
    const parser = createParser(buf, HTTP_REQUEST)
    parser.onRequests = count => {
      if (count === 1) {
        // we have a single request (i.e. non-pipelined)
        onRequest(parser.get(1)[0], sock)
        return
      }
      // if count > 1, we have multiple requests in the buffer we parsed
      for (const request of parser.get(count)) {
        onRequest(request, sock)
      }
    }
    sock.setNoDelay(true) // TCP Nodelay / Disable Nagle
    sock.setKeepalive(true) // TCP keepalive
    sock.onClose = () => {
      if (sock.timer) just.clearTimeout(sock.timer)
      parser.free()
    }
    sock.onData = bytes => parser.parse(bytes)
    sock.json = json => sock.writeString(`${server.rJSON}${json.length}${END}${json}`)
    sock.html = html => sock.writeString(`${server.rHTML}${html.length}${END}${html}`)
    sock.text = text => sock.writeString(`${server.rTEXT}${text.length}${END}${text}`)
    sock.error = err => sock.writeString(`${server.r500}${err.stack.length}${END}${err.stack}`)
    sock.favicon = favicon => {
      const bytes = sock.writeString(`${server.favicon}${favicon.byteLength}${END}`)
      if (bytes < 0) return bytes
      return sock.write(favicon)
    }
    return buf
  }
  const onRequest = (req, sock) => {
    if (req.method === 'GET') {
      if (req.url === '/json') {
        if (sock.json(JSON.stringify(req)) < 0) just.error((new SystemError('sock.json')).stack)
        return
      }
      if (req.url === '/async') {
        // this will work fine due to head of line blocking in HTTP/1.1.
        // we won't receive another request on this socket until we send a complete response.
        // doing async if we support pipelined requests means we will need to maintain ordering
        // of responses on the socket
        sock.timer = just.setTimeout(() => {
          if (sock.json(JSON.stringify(req)) < 0) just.error((new SystemError('sock.json')).stack)
        }, 1000)
        return
      }
      if (req.url === '/favicon.ico') {
        if (sock.favicon(favicon) < 0) just.error((new SystemError('sock.favicon')).stack)
        return
      }
    }
    if (sock.writeString(server.r404) < 0) just.error((new SystemError('sock.404')).stack)
  }
  let err = server.bind()
  if (err) throw new SystemError('server.bind')
  err = server.listen()
  if (err) throw new SystemError('server.listen')
  just.setInterval(() => {
    just.print(just.memoryUsage().rss)
  }, 1000)
}

try {
  main()
} catch (err) {
  just.error(err.stack)
}
