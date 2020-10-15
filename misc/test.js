if (!just.buffer) {
  const { shmOpen, mmap, MAP_SHARED, PROT_READ, PROT_WRITE } = just.sys
  const { S_IRUSR, S_IWUSR, O_RDWR, O_CREAT } = just.fs
  let flags = O_CREAT | O_RDWR
  const mode = S_IRUSR | S_IWUSR
  const fName = `/shared_${just.sys.pid()}`
  const SIZE = 4
  const fd = shmOpen(fName, flags, mode)
  const prot = PROT_READ | PROT_WRITE
  flags = MAP_SHARED
  just.buffer = mmap(fd, SIZE, prot, flags, 0)
}
const u32 = new Uint32Array(just.buffer)
const b = ArrayBuffer.fromString('Hello, World!')
const readString = just.sys.readString
while (1) {
  readString(b, b.byteLength)
  Atomics.add(u32, 0, 1)
}
