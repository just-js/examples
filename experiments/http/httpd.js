const { print, require, setInterval, memoryUsage, cpuUsage } = just
const { HTTPStream } = require('./http.js')
const { createServer } = require('./net.js')

function onConnect (sock) {
  stats.conn++
  const stream = new HTTPStream(sock.buf, maxPipeline)
  const { buf, size } = responses[200]
  sock.onReadable = () => {
    const bytes = sock.pull(stream.offset)
    if (bytes <= 0) return
    const err = stream.parse(bytes, count => {
      stats.rps += count
      if (sock.write(buf, count * size) <= 0) return
      stats.bytes += bytes
    })
    if (err < 0) print(`error: ${err}`)
  }
  sock.onWritable = () => {}
  sock.onEnd = () => stats.conn--
}

const maxPipeline = 256
const stats = { rps: 0, bytes: 0, conn: 0 }
const last = { user: 0, system: 0 }
const r200 = 'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n'
const responses = {
  200: {
    buf: ArrayBuffer.fromString(r200.repeat(maxPipeline)),
    size: r200.length
  }
}

setInterval(() => {
  const { rss } = memoryUsage()
  const { user, system } = cpuUsage()
  const upc = ((user - last.user) / 1000000).toFixed(2)
  const spc = ((system - last.system) / 1000000).toFixed(2)
  const { conn, bytes, rps } = stats
  print(`mem ${rss} conn ${conn} rps ${rps} cpu ${upc} / ${spc} bytes ${bytes}`)
  last.user = user
  last.system = system
  stats.rps = stats.bytes = 0
}, 1000)

createServer(onConnect).listen()
