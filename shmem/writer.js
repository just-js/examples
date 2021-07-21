const fd = just.sys.shmopen('/omgthisiscool')
const size = 1 * 1024 * 1024 * 1024
just.fs.ftruncate(fd, size)
const ab = just.sys.mmap(fd, size)
const u32 = new Uint32Array(ab)
Atomics.store(u32, 0, 0)
just.setInterval(() => {
  Atomics.add(u32, 0, 1)
}, 1)
