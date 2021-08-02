const { net } = just.library('net')
const { thread } = just.library('thread')
const { AF_UNIX, SOCK_STREAM } = net
const pipes = require('ipc.js')

const emptyFn = () => {}

class Parser {
  constructor (buffer) {
    this.buffer = buffer
    this.inBody = false
    this.off = 0
    this.size = 4
    this.bytes = new Array(4)
    this.dv = new DataView(buffer)
  }

  onMessage () {}

  parse (bytes) {
    while (bytes) {
      if (this.inBody) {
        if (bytes + this.off >= this.size) {
          this.chunks.push(this.buffer.readString(this.size - this.off))
          bytes -= (this.size - this.off)
          just.onMessage(this.chunks.join(''))
          this.chunks.length = 0
          this.size = 4
          this.off = 0
          this.inBody = false
          continue
        }
        this.chunks.push(this.buffer.readString(bytes))
        this.off += bytes
        bytes = 0
      } else {
        if (bytes + this.off >= this.size) {
          for (let i = this.off; i < this.size; i++) {
            this.bytes[this.off] = dv.getUint8(this.off)
            this.off++
          }
          this.size = dv.getUint32()
          continue
        }
        this.bytes[this.off] = 
      }
    }
    just.onMessage(pipe.buffer.readString(bytes))

  }
}
function mainFn () {
  just.load('vm').vm.runScript(just.builtin('just.js'), 'just.js')
  const pipes = require('lib/ipc.js')
  const pipe = pipes.create(just.fd)
  const parser = new Parser(pipe.buffer)
  parser.onMessage = message => (just.onMessage || emptyFn)(message)
  pipe.onReadable = () => parser.parse(pipe.read())
  pipe.onWritable = () => pipe.resume()
  pipe.resume()
  just.send = str => pipe.write(pipe.buffer.writeString(str))
  just.vm.runScript(just.workerSource, 'foo.js')
  delete just.buffer
  delete just.fd
  delete just.workerSource
  just.factory.loop.count--
  just.factory.run()
}

const main = getSource(mainFn)

function getSource (fn) {
  const source = fn.toString()
  return source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
}

function createPipe (fds = []) {
  if (net.socketpair(AF_UNIX, SOCK_STREAM, fds) !== 0) throw new just.SystemError('socketpair')
  return fds
}

class Thread {
  constructor (appSrc, args) {
    this.src = getSource(appSrc)
    this.ipc = createPipe()
    this.args = args
    this.shared = new SharedArrayBuffer(4)
    this.buffer = new ArrayBuffer(4096)
    this.id = 0
    this.status = []
    const pipe = pipes.create(this.ipc[0], this.buffer)
    this.pipe = pipe
    const t = this
    const parser = new Parser(pipe.buffer)
    parser.onMessage = message => (t.onMessage || emptyFn)(message)
    pipe.onReadable = () => parser.parse(pipe.read())
    this.pipe.onReadable = () => parser.parse(pipe.read())
    this.pipe.onWritable = () => this.pipe.resume()
    this.pipe.resume()
    just.factory.loop.count--
  }

  send (str) {
    return this.pipe.write(this.buffer.writeString(str))
  }

  spawn () {
    this.id = thread.spawn(this.src, main, this.args, this.shared, this.ipc[1])
    just.print(this.id)
    const t = this
    return new Promise((resolve, reject) => {
      running.set(t.id, { thread: t, promise: { resolve, reject } })
    })
  }

  isComplete () {
    const r = thread.tryJoin(this.id, this.status)
    if (r === 0) return true
    return false
  }
}

let watcher
const running = new Map()

function pollThreads () {
  for (const [id, instance] of running) {
    if (instance.thread.isComplete()) {
      running.delete(id)
      if (!running.length) {
        just.clearTimeout(watcher)
        watcher = null
      }
      if (instance.thread.status[0] === 0) {
        instance.promise.resolve()
        continue
      }
      instance.promise.reject(new Error(`Thread Status ${instance.thread.status[0]}`))
    }
  }
}

function create (threadMain, args = [], mainSrc) {
  const t = new Thread(threadMain, args, mainSrc)
  if (!watcher) watcher = just.setInterval(pollThreads, 100)
  return t
}

module.exports = { create, Thread }
