const { print, require, setInterval, memoryUsage, cpuUsage } = just
const { createHTTPStream } = require('./http.js')
const { createServer } = require('./net.js')

function onConnect (sock) {
  stats.conn++
  const stream = createHTTPStream(sock.buf, maxPipeline)
  const { buf, size } = responses[200]
  sock.onReadable = () => {
    const bytes = sock.pull(stream.offset)
    if (bytes <= 0) return
    const err = stream.parse(bytes, count => {
      qps += count
      stats.rps += bytes
      if (sock.write(buf, count * size) <= 0) return
      stats.wps += (count * size)
    })
    if (err < 0) print(`error: ${err}`)
  }
  sock.onWritable = () => {}
  sock.onEnd = () => stats.conn--
}

const maxPipeline = 256
const stats = { rps: 0, wps: 0, conn: 0 }
const last = { user: 0, system: 0 }
const bw = 1000 * 1000 * 1000
let qps = 0
const r200 = 'HTTP/1.1 200 OK\r\nContent-Length: 13\r\n\r\nHello, World!'
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
  const { conn, rps, wps } = stats
  print(`rps ${qps} mem ${rss} conn ${conn} cpu ${upc} / ${spc} Gbps  r ${((rps * 8) / bw).toFixed(2)} w ${((wps * 8) / bw).toFixed(2)}`)
  last.user = user
  last.system = system
  stats.rps = stats.wps = qps = 0
}, 1000)

createServer(onConnect).listen()
