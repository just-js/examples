const { fs, sys, net } = just

function readStat (pid = sys.pid()) {
  const buf = new ArrayBuffer(4096)
  const path = `/proc/${pid}/stat`
  const fd = fs.open(path)
  net.seek(fd, 0, net.SEEK_SET)
  let bytes = net.read(fd, buf)
  const parts = []
  while (bytes > 0) {
    parts.push(buf.readString(bytes))
    bytes = net.read(fd, buf)
  }
  const fields = parts.join('').split(' ')
  const comm = fields[1]
  const state = fields[2]
  const [
    ppid,
    pgrp,
    session,
    ttyNr,
    tpgid,
    flags,
    minflt,
    cminflt,
    majflt,
    cmajflt,
    utime,
    stime,
    cutime,
    cstime,
    priority,
    nice,
    numThreads,
    itrealvalue,
    starttime,
    vsize,
    rssPages,
    rsslim,
    startcode,
    endcode,
    startstack,
    kstkesp,
    kstkeip,
    signal,
    blocked,
    sigignore,
    sigcatch,
    wchan,
    nswap,
    cnswap,
    exitSignal,
    processor,
    rtPriority,
    policy,
    delayacctBlkioTicks,
    guestTime,
    cguestTime,
    startData,
    endData,
    startBrk,
    argStart,
    argEnd,
    envStart,
    envEnd,
    exitCode
  ] = fields.slice(3).map(v => Number(v))
  net.close(fd)
  return {
    pid,
    comm,
    state,
    ppid,
    pgrp,
    session,
    ttyNr,
    tpgid,
    flags,
    minflt,
    cminflt,
    majflt,
    cmajflt,
    utime,
    stime,
    cutime,
    cstime,
    priority,
    nice,
    numThreads,
    itrealvalue,
    starttime,
    vsize,
    rssPages,
    rsslim,
    startcode,
    endcode,
    startstack,
    kstkesp,
    kstkeip,
    signal,
    blocked,
    sigignore,
    sigcatch,
    wchan,
    nswap,
    cnswap,
    exitSignal,
    processor,
    rtPriority,
    policy,
    delayacctBlkioTicks,
    guestTime,
    cguestTime,
    startData,
    endData,
    startBrk,
    argStart,
    argEnd,
    envStart,
    envEnd,
    exitCode
  }
}

const ANSI_DEFAULT = '\u001b[0m'
const ANSI_GREEN = '\u001b[32m'

function format (num, len = 5) {
  return num.toString().padStart(len, ' ')
}

const stats = { user: 0, system: 0, cuser: 0, csystem: 0 }

just.setInterval(() => {
  const { utime, stime, cutime, cstime, rssPages } = readStat(pid)
  const rss = Math.floor((rssPages * just.sys.pageSize) / (1024 * 1024))
  const user = utime - stats.user
  const system = stime - stats.system
  const cuser = cutime - stats.cuser
  const csystem = cstime - stats.csystem
  stats.user = utime
  stats.system = stime
  stats.cuser = cutime
  stats.csystem = cstime
  just.print(`${ANSI_GREEN}rss${ANSI_DEFAULT} ${format(rss)} ${ANSI_GREEN}usr${ANSI_DEFAULT} ${format(user)} ${ANSI_GREEN}sys${ANSI_DEFAULT} ${format(system)} ${ANSI_GREEN} tot${ANSI_DEFAULT} ${format(system + user)} ${ANSI_GREEN}cusr${ANSI_DEFAULT} ${format(cuser)} ${ANSI_GREEN}csys${ANSI_DEFAULT} ${format(csystem)} ${ANSI_GREEN} ctot${ANSI_DEFAULT} ${format(csystem + cuser)}`)
}, 1000)

const pid = parseInt(just.args[2] || just.sys.pid())
