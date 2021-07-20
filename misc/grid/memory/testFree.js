const { memory } = just.library('memory', './memory.so')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)
const bufs = []

function test () {
  for (let i = 0; i < 1000; i++) {
    bufs.push(memory.alloc(65536))
  }
}

just.setInterval(() => {
  bufs.length = 0
  test()
  just.print(stringify(just.memoryUsage()))
}, 1000)
