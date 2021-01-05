just.thread = just.library('thread', 'thread.so').thread

function threadOne () {
  just.setInterval(() => {
    just.print('hello from thread one')
  }, 1000)
}

function threadTwo () {
  just.setInterval(() => {
    just.print('hello from thread two')
  }, 1000)
}

function spawn (fn) {
  let source = fn.toString()
  source = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim()
  return just.thread.spawn(source, just.builtin('just.js'))
}

const tids = []
tids.push(spawn(threadOne))
tids.push(spawn(threadTwo))
tids.forEach(tid => just.thread.join(tid))
