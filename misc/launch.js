const { cwd, errno, strerror, spawn } = just.sys
const path = cwd()
const [...args] = just.args.slice(2)
const { socketpair, AF_UNIX, SOCK_STREAM, close, write, read } = just.net
const { shmOpen, shmUnlink, mmap, MAP_SHARED, PROT_READ, PROT_WRITE, STDOUT_FILENO, STDERR_FILENO } = just.sys
const { S_IRUSR, S_IWUSR, O_RDWR, O_CREAT } = just.fs
const { EPOLLERR, EPOLLHUP, EPOLLIN } = just.loop
const { loop } = just.factory

function createPipe () {
  const fds = []
  const r = socketpair(AF_UNIX, SOCK_STREAM, fds)
  if (r !== 0) throw new Error(`socketpair ${r} errno ${errno()} : ${strerror(errno())}`)
  return fds
}

const cpus = parseInt(just.env().CPUS || just.sys.cpus, 10)
const buf = new ArrayBuffer(4096)

const processes = []
for (let i = 0; i < cpus; i++) {
  const stdin = createPipe()
  const stdout = createPipe()
  const stderr = createPipe()
  const SIZE = 4
  const pid = spawn('just', path, args, stdin[1], stdout[1], stderr[1])
  let flags = O_RDWR | O_CREAT
  const mode = S_IRUSR | S_IWUSR
  const fName = `/shared_${pid}`
  shmUnlink(fName)
  const fd = shmOpen(fName, flags, mode)
  just.fs.ftruncate(fd, SIZE)
  const prot = PROT_READ | PROT_WRITE
  flags = MAP_SHARED
  const shared = mmap(fd, SIZE, prot, flags, 0)
  const u32 = new Uint32Array(shared)
  processes.push({ pid, u32 })
  loop.add(stdout[0], eventHandler(STDOUT_FILENO, buf))
  loop.add(stderr[0], eventHandler(STDERR_FILENO, buf))
}

function eventHandler (outfd, buf) {
  return (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      just.factory.loop.remove(fd)
      just.print('close')
      close(fd)
      return
    }
    if (event && EPOLLIN) {
      write(outfd, buf, read(fd, buf), 0)
    }
  }
}

const { readStat } = require('lib/monitor.js')
const last = { user: 0, system: 0 }

just.setInterval(() => {
  const stat = { user: 0, system: 0, rss: 0 }
  let total = 0
  for (const process of processes) {
    const { pid, u32 } = process
    const { utime, stime, rssPages } = readStat(pid)
    const rss = Math.floor((rssPages * just.sys.pageSize))
    stat.rss += rss
    stat.user += (utime / 100)
    stat.system += (stime / 100)
    total += Atomics.exchange(u32, 0, 0)
  }
  const user = stat.user - last.user
  const system = stat.system - last.system
  last.user = stat.user
  last.system = stat.system
  just.print(`children ${processes.length} total ${total} mem ${stat.rss} cpu (${user.toFixed(2)}/${system.toFixed(2)}) ${(user + system).toFixed(2)} qps/core ${(total / (user + system)).toFixed(2)}`)
}, 1000)
