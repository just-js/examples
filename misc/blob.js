const { signal } = just.library('signal')

function shutdown (signum) {
  if (signum === signal.SIGWINCH) return
  just.print(`shutting down ${signum}`)
  just.exit(1, signum)
}

just.print(just.pid())
signal.reset()
for (let i = 1; i < 32; i++) signal.sigaction(i, shutdown)
while (1) {
  just.print(just.memoryUsage()[0])
  just.sleep(1)
}
