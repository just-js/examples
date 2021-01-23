const { signal } = just.library('signal')

const ignore = new Array(32)
signal.SIGTTIN = 21
signal.SIGTTOU = 22

function showStats () {}
const MAXSIG = 31
const TIOCNOTTY = 0x5422
const TIOCSCTTY = 0x540E
const sigmask = new ArrayBuffer(128)

function onSignal (signum) {
  if (ignore[signum]) {
    ignore[signum] = 0
    return
  }
  let exitStatus = 0
  if (signum === signal.SIGCHLD) {
    let [status, kpid] = just.sys.waitpid(new Uint32Array(2))
    while (kpid > 0) {
      if ((status & 0x7f) === 0) { // WIFEXITED
        exitStatus = ((status & 0xff00) >> 8) // WEXITSTATUS
      } else {
        // assert(WIFSIGNALED(status));
        exitStatus = 128 + (status & 0x7f) // WTERMSIG
      }
      if (kpid === child) {
        just.sys.kill(-child, signal.SIGTERM)
        just.sys.exit(exitStatus)
      }
      [status, kpid] = just.sys.waitpid(new Uint32Array(2))
    }
  }
  if (signum !== 0) just.sys.kill(-child, signum)
  if (signum === signal.SIGTSTP || signum === signal.SIGTTOU || signum === signal.SIGTTIN) {
    just.sys.kill(just.sys.pid(), signal.SIGSTOP)
  }
}

function parentMain () {
  signal.reset()
  just.fs.chdir('/')
  for (let i = 1; i <= MAXSIG; i++) {
    signal.sigaction(i, onSignal)
  }
  just.setInterval(showStats, 1000)
}

function childMain () {
  signal.sigprocmask(sigmask, signal.SIG_UNBLOCK, 1)
  if (just.sys.setsid() === -1) {
    just.sys.exit(1)
  }
  just.sys.ioctl(just.sys.STDIN_FILENO, TIOCSCTTY)
  just.sys.exec('just', just.args.slice(2))
  just.sys.exit(2)
}

ignore.fill(0)
signal.sigfillset(sigmask)
signal.sigprocmask(sigmask, signal.SIG_BLOCK, 1)
if (just.sys.ioctl(just.sys.STDIN_FILENO, TIOCNOTTY) !== -1) {
  if (just.sys.getsid(0) === just.sys.pid()) {
    ignore[signal.SIGHUP] = 1
    ignore[signal.SIGCONT] = 1
  }
}
const child = just.sys.fork()
if (child < 0) throw new just.SystemError('fork')
child === 0 ? childMain() : parentMain()
