const { fs, net, sys } = just
const { fileType, getStats } = just.require('../lib/fs.js')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? Number(v) : v, sp)
const stat = new BigUint64Array(20)

let fd = fs.open('hello.txt', fs.O_WRONLY | fs.O_CREAT | fs.O_TRUNC)
just.print(`open: ${fd}`)
const buf = new ArrayBuffer(256)
let len = sys.writeString(buf, 'line one\n')
let r = net.write(fd, buf, len)
just.print(`write: ${r}`)
len = sys.writeString(buf, 'line two\n')
r = net.write(fd, buf, len)
just.print(`write: ${r}`)
r = net.close(fd)
just.print(`close: ${r}`)

const files = fs.readdir('./', [])
files.forEach(f => {
  f.type = fileType(f.type)
})
just.print(JSON.stringify(files, null, '  '))

fd = fs.open('hello.txt', fs.O_RDONLY)
r = fs.fstat(fd, stat)
just.print(stringify(getStats(stat)))
r = net.close(fd)
just.print(`close: ${r}`)

fd = fs.open('modules', fs.O_RDONLY)
r = fs.fstat(fd, stat)
just.print(stringify(getStats(stat)))
r = net.close(fd)
just.print(`close: ${r}`)

r = fs.mkdir('hello')
just.print(`mkdir: ${r}`)

fd = fs.open('hello', fs.O_RDONLY)
r = fs.fstat(fd, stat)
just.print(`fstat: ${r}`)
just.print(stringify(getStats(stat)))
r = net.close(fd)
just.print(`close: ${r}`)

r = fs.rmdir('hello')
just.print(`rmdir: ${r}`)

r = fs.unlink('hello.txt')
just.print(`unlink: ${r}`)
