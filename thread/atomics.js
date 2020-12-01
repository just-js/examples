just.thread = just.library('thread', 'thread.so').thread
const { net, sys, loop } = just
function threadMain () {
  const shared = just.buffer
  const u32 = new Uint32Array(shared)
  Atomics.add(u32, 0, 1)
  //just.setInterval(() => {}, 1000)
}
let source = threadMain.toString()
source = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
const mem = new Float64Array(16)
const EVENTS = 1024
const evbuf = new ArrayBuffer(EVENTS * 12)
const tbuf = new ArrayBuffer(8)
const events = new Uint32Array(evbuf)
const loopfd = loop.create(loop.EPOLL_CLOEXEC)
const timerfd = sys.timer(1000, 1000)
const shared = new SharedArrayBuffer(4)
const u32 = new Uint32Array(shared)
const main = just.builtin('just.js')
loop.control(loopfd, loop.EPOLL_CTL_ADD, timerfd, loop.EPOLLIN)
let r = 0
let rate = 0
let last = 0
const parallel = 8
let then = Date.now()
while (Atomics.load(u32, 0) < 10000) {
  const tids = []
  for (let j = 0; j < parallel; j++) {
    tids.push(just.thread.spawn(source, main, [], shared))
  }
  r = loop.wait(loopfd, evbuf, 0)
  let off = 0
  for (let i = 0; i < r; i++) {
    const fd = events[off + 1]
    const event = events[off]
    if (event & loop.EPOLLIN) {
      const rss = sys.memoryUsage(mem)[0]
      const diff = rss - last
      last = rss
      const now = Date.now()
      const elapsed = (now - then) / 1000
      just.print(`mem ${rss} diff ${diff} rate ${(rate / elapsed).toFixed(2)} counter ${Atomics.load(u32, 0)}`)
      net.read(fd, tbuf)
      rate = 0
      then = now
    }
    off += 3
  }
  tids.forEach(tid => just.thread.join(tid))
  rate += parallel
}
just.print(Atomics.load(u32, 0))
