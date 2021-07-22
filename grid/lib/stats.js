function start () {
  const stats = { send: 0, recv: 0, hsend: 0, hrecv: 0 }
  const timer = just.setInterval(() => {
    const { send, recv, hsend, hrecv } = stats
    const bw = Math.floor((send * config.block) / (1024 * 1024))
    const bwb = bw * 8
    const bwr = Math.floor((recv * config.block) / (1024 * 1024))
    const bwrb = bwr * 8
    const { user, system } = just.cpuUsage()
    const { rss } = just.memoryUsage()
    const perf = `mem ${rss} cpu (${user.toFixed(2)}/${system.toFixed(2)}) ${(user + system).toFixed(2)}`
    just.print(`block S ${send} (${bw} MB ${bwb} Mb) R ${recv} (${bwr} MB ${bwrb} Mb) head S ${hsend} R ${hrecv} ${perf}`)
    stats.send = stats.recv = stats.hsend = stats.hrecv = 0
  }, 1000)
  return { stats, stop: () => just.clearInterval(timer) }
}

module.exports = { start }
