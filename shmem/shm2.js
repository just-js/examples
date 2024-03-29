const fd = just.sys.shmopen('/omgthisiscool')
const ab = just.sys.mmap(fd, 4096)
if (!ab) throw new Error('could not map memory')
const u32 = new Uint32Array(ab)

let count = 10000
just.print('foo')
const t = just.setInterval(() => {
  Atomics.add(u32, 0, 1)
  if (--count === 0) just.clearInterval(t)
}, 1)

just.setInterval(() => {
  just.print(Atomics.load(u32, 0))
}, 1000)
