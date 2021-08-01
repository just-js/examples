just.thread = just.library('thread').thread

function spawn (fn, cpu, onComplete) {
  let source = fn.toString()
  source = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
  const tid = just.thread.spawn(source)
  const thread = { tid, onComplete }
  just.thread.setAffinity(tid, cpu)
  threads.push(thread)
  return thread
}

let threads = []

const timer = just.setInterval(() => {
  for (const thread of threads) {
    const { tid, onComplete } = thread
    const answer = [0]
    const r = just.thread.tryJoin(tid, answer)
    if (r === 0n) {
      threads = threads.filter(t => !(t.tid === tid))
      onComplete(tid, answer[0])
    }
  }
  just.print(`${threads.length} running`)
}, 1000)

function threadOne () {
  const b = new ArrayBuffer(1000)
  const dv = new DataView(b)
  function next () {
    for (let i = 0; i < b.byteLength; i++) {
      dv.setUint8(i, Math.ceil(Math.random() * 255))
    }
    just.sys.nextTick(next)
  }
  next()
}

function onComplete (tid, rc) {
  just.print(`thread ${tid} completed with rc ${rc}`)
  just.print(`threads ${threads.length} rss: ${just.memoryUsage().rss}`)
  if (!threads.length) just.clearInterval(timer)
}

spawn(threadOne, 5, onComplete)
spawn(threadOne, 6, onComplete)
spawn(threadOne, 7, onComplete)
