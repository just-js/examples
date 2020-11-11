const { sys, print, net, signal } = just
const { EPOLLIN } = just.loop
const { EAGAIN } = net
const { signalfd, sigaddset, sigprocmask } = signal
const { dump } = require('../net/lib/binary.js')
const { loop } = just.factory

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => (typeof v === 'bigint') ? v.toString() : v, sp)

function onSignal (siginfo) {
  const view = new DataView(siginfo)
  const signo = view.getUint32(0, true)
  const errno = view.getInt32(4, true)
  const code = view.getInt32(8, true)
  const pid = view.getUint32(12, true)
  const uid = view.getUint32(16, true)
  const fd = view.getInt32(20, true)
  const tid = view.getUint32(24, true)
  const band = view.getUint32(28, true)
  const overrun = view.getUint32(32, true)
  const trapno = view.getUint32(36, true)
  const status = view.getInt32(40, true)
  const int = view.getInt32(44, true)
  const ptr = view.getBigUint64(48, true)
  const utime = view.getBigUint64(56, true)
  const stime = view.getBigUint64(64, true)
  const addr = view.getBigUint64(72, true)
  print(stringify({ signo, errno, code, pid, uid, fd, tid, band, overrun, trapno, status, int, ptr, utime, stime, addr }))
}

const sigmask = new ArrayBuffer(1024)
const siginfo = new ArrayBuffer(1024)

let r = sigprocmask(sigmask, signal.SIG_SETMASK, 1)
just.print(`sigprocmask ${r}\n${dump(new Uint8Array(sigmask))}`)
r = sigaddset(sigmask, signal.SIGUSR1)
just.print(`sigaddset ${r}\n${dump(new Uint8Array(sigmask))}`)
r = sigprocmask(sigmask, signal.SIG_SETMASK, 0)
just.print(`sigprocmask ${r}\n${dump(new Uint8Array(sigmask))}`)
const sigfd = signalfd(sigmask)
just.print(`signalfd ${sigfd}\n${dump(new Uint8Array(sigmask))}`)

loop.add(sigfd, (fd, event) => {
  just.print('event')
  if (event & EPOLLIN) {
    const bytes = net.read(fd, siginfo)
    if (bytes < 0) {
      const err = sys.errno()
      if (err !== EAGAIN) {
        print(`read error: ${sys.strerror(err)} (${err})`)
        net.close(fd)
      }
      return
    }
    onSignal(siginfo)
  }
}, EPOLLIN)

just.print(just.sys.pid())
while (loop.count > 0) {
  const r = loop.poll(-1, sigmask)
  just.print(r)
  if (r === -1) {
    just.print('oh')
  }
  sys.runMicroTasks()
}
net.close(loop.fd)
