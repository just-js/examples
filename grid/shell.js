const { Peer } = require('./lib/grid.js')
const { createClient } = require('./lib/unix.js')
const { dump, ANSI } = require('@binary')
const { createContext, compileAndRunInContext } = just.vm

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

const { AG, AD } = ANSI

const sock = createClient()
const peer = new Peer(sock, 512)
const { buf } = peer
sock.onReadable = () => peer.pull()
sock.onWritable = () => sock.resume()
peer.onHeader = header => {
  just.print('')
  just.print(stringify(header))
  just.net.writeString(just.sys.STDOUT_FILENO, `${AG}>${AD} `)
}
peer.onBlock = (header, off) => {
  just.print('')
  just.print(dump(new Uint8Array(buf, off, header.recordSize), header.recordSize, 0, 16, 0, true))
  just.net.writeString(just.sys.STDOUT_FILENO, `${AG}>${AD} `)
}
sock.json = (index, o) => {
  peer.send(index, 2)
  peer.json(o)
}
sock.get = index => peer.send(index, 1)
sock.connect('grid.sock')

function newContext (opts = {}) {
  const ctx = new ArrayBuffer(0)
  const just = createContext(ctx)
  if (opts.args) {
    just.args = opts.args
  } else {
    delete just.args
  }
  just.get = sock.get
  just.json = sock.json
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
