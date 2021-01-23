const { signal } = just.library('signal')
const { sys } = just.library('sys')

function onSignal (signum) {
  if (ignore[signum]) {
    ignore[signum] = 0
    return
  }
  let exitStatus = 0
  if (signum === signal.SIGCHLD) {
    let [status, kpid] = sys.waitpid(new Uint32Array(2))
    while (kpid > 0) {
      if ((status & 0x7f) === 0) { // WIFEXITED
        exitStatus = ((status & 0xff00) >> 8) // WEXITSTATUS
      } else {
        // assert(WIFSIGNALED(status));
        exitStatus = 128 + (status & 0x7f) // WTERMSIG
      }
      if (kpid === child) {
        sys.kill(-child, signal.SIGTERM)
        sys.exit(exitStatus)
      }
      [status, kpid] = sys.waitpid(new Uint32Array(2))
    }
  }
  if (signum !== 0) sys.kill(-child, signum)
  if (signum === signal.SIGTSTP ||
    signum === signal.SIGTTOU ||
    signum === signal.SIGTTIN) {
    sys.kill(sys.pid(), signal.SIGSTOP)
  }
}

function parentMain () {
  signal.reset()
  just.chdir('/')
  for (let i = 1; i <= MAXSIG; i++) {
    signal.sigaction(i, onSignal)
  }
  while (1) just.sleep(1)
}

function childMain () {
  signal.sigprocmask(sigmask, signal.SIG_UNBLOCK, 1)
  if (sys.setsid() === -1) {
    sys.exit(1)
  }
  sys.ioctl(sys.STDIN_FILENO, TIOCSCTTY)
  sys.exec(just.args[1], just.args.slice(2))
  sys.exit(2)
}

const ignore = new Array(32)
const MAXSIG = 31
const TIOCNOTTY = 0x5422
const TIOCSCTTY = 0x540E
const sigmask = new ArrayBuffer(128)
signal.SIGTTIN = 21
signal.SIGTTOU = 22
ignore.fill(0)
signal.sigfillset(sigmask)
signal.sigprocmask(sigmask, signal.SIG_BLOCK, 1)
if (sys.ioctl(sys.STDIN_FILENO, TIOCNOTTY) !== -1) {
  if (sys.getsid(0) === sys.pid()) {
    ignore[signal.SIGHUP] = 1
    ignore[signal.SIGCONT] = 1
  }
}
const child = sys.fork()
if (child < 0) sys.exit(1)
child === 0 ? childMain() : parentMain()
