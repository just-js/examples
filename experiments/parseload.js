const { createParser } = just.require('./http/parser.js')
const { loop } = just.factory

const requests = [
  'GET / HTTP/1.1\r\nHost: foo\r\n\r\n',
  'GET /foo HTTP/1.1\r\nHost: foo\r\n\r\n',
  'GET / HTTP/1.1\r\n\r\n',
  'GET /0123456789 HTTP/1.1\r\nHost: 0123456789\r\nCookie: 0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789\r\n\r\n'
]
const buf = ArrayBuffer.fromString(requests.join('').repeat(64))
just.print(buf.byteLength)
const parser = createParser(buf)
let total = 0
let bytes = 0

function onTimer () {
  just.print(`rps ${total} mem ${just.memoryUsage().rss} bytes ${bytes}`)
  total = bytes = 0
}
just.setInterval(onTimer, 1000)

// 10Gbps
function test () {
  for (let i = 0; i < 1000; i++) {
    for (let i = 0; i < 1000; i++) {
      const { count, off } = parser.parse()
      total += count
      bytes += off
    }
    loop.poll(0)
    just.sys.runMicroTasks()
  }
}

while (1) {
  test()
}
