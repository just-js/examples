const fd = just.sys.shmopen('/omgthisiscool')
const size = 1 * 1024 * 1024 * 1024
const ab = just.sys.mmap(fd, size)
const u32 = new Uint32Array(ab)
just.setInterval(() => {
  just.print(Atomics.load(u32, 0))
}, 1000)
