const { fs, net, sys } = just
const { readFile, writeFile } = just.require('fs')

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? Number(v) : v, sp)

const stats = {
  file: {
    write: 0,
    read: 0,
    open: 0,
    stat: 0,
    close: 0,
    unlink: 0
  },
  bytes: {
    write: 0, read: 0
  },
  rss: 0
}

function onTimerEvent (fd, event) {
  const { rss } = just.memoryUsage()
  stats.rss = rss
  just.print(stringify(stats))
  net.read(fd, tbuf)
  stats.file.read = stats.file.write = stats.file.open = stats.file.stat = stats.file.close = stats.file.unlink = 0
  stats.bytes.write = stats.bytes.read = 0
}

function main (str, fileSize) {
  const fileName = '/tmp/hello.txt'
  const size = writeFile(fileName, str)
  stats.file.write++
  if (size !== fileSize) throw new Error('Size')
  stats.bytes.write += fileSize
  const text = readFile(fileName)
  stats.file.read++
  if (text.length !== fileSize) throw new Error('Size')
  stats.bytes.read += fileSize
  const fd = fs.open(fileName, fs.O_RDONLY)
  stats.file.open++
  let r = fs.fstat(fd, stat)
  stats.file.stat++
  if (Number(stat[7]) !== fileSize) throw new Error('Size')
  r = net.close(fd)
  stats.file.close++
  if (r !== 0) throw new Error('Close')
  r = fs.unlink(fileName)
  stats.file.unlink++
  if (r !== 0) throw new Error('Unlink')
  loop.poll(0)
  sys.runMicroTasks()
}

const tbuf = new ArrayBuffer(8)
const buf = new ArrayBuffer(4096)
const stat = new BigUint64Array(20)
const fileSize = parseInt(just.args[2] || '4096', 10)
const str = ArrayBuffer.fromString((new Array(fileSize)).fill('0').join(''))
const timerfd = sys.timer(1000, 1000)
loop.add(timerfd, onTimerEvent)

while (1) {
  main(str, str.byteLength)
}
