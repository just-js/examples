const { createClient } = just.require('./net.js')
const { loop } = just.factory
const { sys, setTimeout, setInterval } = just
const { runMicroTasks, nextTick } = sys

function onComplete () {
  running = false
}

function onStats () {
  const { rss } = just.memoryUsage()
  const { user, system } = just.cpuUsage()
  const upc = (user - last.user) / 1000000
  const spc = (system - last.system) / 1000000
  just.print(`mem ${rss} cpu ${upc.toFixed(2)} / ${spc.toFixed(2)}`)
  last.user = user
  last.system = system
}

function onConnect (sock) {
  sock.onReadable = () => sock.pull(0)
  sock.onWritable = () => {
    sockets[sock.fd] = sock
  }
  sock.onEnd = () => {
    delete sockets[sock.fd]
  }
}

function shutdown () {
  for (const fd of Object.keys(sockets)) {
    sockets[fd].close()
  }
}

function run () {
  for (const fd of Object.keys(sockets)) {
    if (sockets[fd].write(buf, buf.byteLength) === 0) delete sockets[fd]
  }
  loop.poll(0)
  runMicroTasks()
  if (running) return nextTick(run)
  shutdown()
}

let numclients = parseInt(just.args[2] || '1', 10)
const maxPipeline = parseInt(just.args[3] || '1', 10)
const duration = parseInt(just.args[4] || '10', 10)
const sockets = {}
const buf = ArrayBuffer.fromString('GET / HTTP/1.1\r\n\r\n'.repeat(maxPipeline))
while (numclients--) createClient(onConnect).connect()
let running = true
setTimeout(onComplete, duration * 1000)
setInterval(onStats, 1000)
const last = { user: 0, system: 0 }
run()
