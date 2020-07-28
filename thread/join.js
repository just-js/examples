function spawn (fn, onComplete) {
  let source = fn.toString()
  source = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
  const tid = just.thread.spawn(source)
  const thread = { tid, onComplete }
  threads.push(thread)
  return thread
}

let threads = []

just.setInterval(() => {
  for (const thread of threads) {
    const { tid, onComplete } = thread
    const answer = [0]
    const r = just.thread.tryJoin(tid, answer)
    if (r === 0n) {
      onComplete(tid, answer[0])
      threads = threads.filter(t => !(t === tid))
    }
  }
}, 1000)

function threadOne () {
  let count = 0
  const timer = just.setInterval(() => {
    if (count++ === 5) just.clearInterval(timer)
  }, 1000)
}

spawn(threadOne, (tid, rc) => {
  just.print(`thread ${tid} completed with rc ${rc}`)
  just.print(`threads ${threads.length} rss: ${just.memoryUsage().rss}`)
})
