/*
man tty.4

Detach the calling process from its controlling terminal.
If the process is the session leader, then SIGHUP and SIGCONT signals are sent to the foreground process group and all processes in the current session lose their controlling tty.

https://wikileaks.org/ciav7p1/cms/page_33128479.html
*/

const { signal } = just.library('signal', '/usr/local/lib/just/signal.so')
const { sys } = just.library('sys')
const { net } = just.library('net')
const { fs } = just.library('fs')

const { write, dup } = net
const { STDOUT_FILENO, STDERR_FILENO } = sys
const { fork, exit, setsid } = sys
const { reset, sigaction, SIGINT, SIGTERM } = signal
const { memoryUsage, error, print, setInterval } = just

function createFile (path) {
  const fd = fs.open(path, fs.O_WRONLY | fs.O_CREAT)
  return fd
}

const child = fork()
if (child < 0) exit(1)
if (child === 0) {
  setsid()
  //setgid(65534) // nobody
  //setuid(65534) // nobody
  const grandchild = fork()
  if (grandchild < 0) exit(1)
  if (grandchild === 0) {
    const stdout = createFile('/tmp/daemon.stdout.log')
    const stderr = createFile('/tmp/daemon.stderr.log')
    dup(stdout, STDOUT_FILENO)
    dup(stderr, STDERR_FILENO)
    reset()
    for (let i = 1; i <= 31; i++) {
      sigaction(i, signum => {
        if (signum === SIGINT || signum === SIGTERM) exit(0)
      })
    }
    setInterval(() => {
      write(STDOUT_FILENO, ArrayBuffer.fromString('stdout: '))
      print(memoryUsage().rss)
      write(STDERR_FILENO, ArrayBuffer.fromString('stderr: '))
      error(memoryUsage().rss)
    }, 1000)
  } else {
    exit(0)
  }
} else {
  exit(0)
}
