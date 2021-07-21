const { Peer } = require('./lib/grid.js')
const { createClient } = require('./lib/unix.js')
const { createContext, compileAndRunInContext } = just.vm
const { dump, ANSI } = require('@binary')
const config = require('grid.config.js')

const { AG, AM, AD, AR } = ANSI

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

function createPeer () {
  const sock = createClient()
  sock.connected = false
  const peer = new Peer(sock, config.block)
  const { buf } = peer
  sock.onReadable = () => peer.pull()
  sock.onWritable = () => {
    if (!sock.connected) just.net.writeString(just.sys.STDOUT_FILENO, `${AM}connection open${AD}\n`)
    just.net.writeString(just.sys.STDOUT_FILENO, `${AG}>${AD} `)
    sock.resume()
    sock.connected = true
  }
  sock.onClose = () => {
    sock.connected = false
    just.net.writeString(just.sys.STDOUT_FILENO, `${AM}connection closed, retrying...${AD}\n`)
    just.net.writeString(just.sys.STDOUT_FILENO, `${AG}>${AD} `)
    while (sock.connect('grid.sock') < 1) {
      const errno = just.sys.errno()
      just.print(`(${errno}) ${just.sys.strerror(errno)}`)
      just.net.writeString(just.sys.STDOUT_FILENO, `(${AR}${errno}}${AD} ${just.sys.strerror(errno)}\n`)
      just.sleep(1)
    }
  }
  peer.onHeader = header => {
    just.print('')
    just.print(stringify(header))
    just.net.writeString(just.sys.STDOUT_FILENO, `${AG}>${AD} `)
  }
  peer.onBlock = (header, off) => {
    just.print('')
    just.print(dump(new Uint8Array(buf, off, 256), 256, 0, 16, 0, true))
    just.net.writeString(just.sys.STDOUT_FILENO, `${AG}>${AD} `)
  }
  sock.connect('grid.sock')
  return peer
}

const peer = createPeer()
const get = index => peer.send(index, 1)
const put = (index, o) => {
  peer.send(index, 2)
  peer.json(o)
}

function newContext (opts = {}) {
  const ctx = new ArrayBuffer(0)
  const just = createContext(ctx)
  if (opts.args) {
    just.args = opts.args
  } else {
    delete just.args
  }
  just.get = get
  just.put = put
  if (!opts.print) delete just.print
  if (!opts.error) delete just.error
  if (!opts.exit) delete just.exit
  if (!opts.pid) delete just.pid
  if (!opts.memoryUsage) delete just.memoryUsage
  if (!opts.builtin) delete just.builtin
  if (!opts.load) delete just.load
  if (!opts.sleep) delete just.sleep
  if (!opts.chdir) delete just.chdir
  const scriptName = opts.scriptName || 'just.js'
  function execute (src) {
    return compileAndRunInContext(ctx, src, scriptName)
  }
  if (opts.main) compileAndRunInContext(ctx, opts.main, scriptName)
  return { just, execute, ctx }
}

const context = newContext()
require('repl').repl().onCommand = context.execute
