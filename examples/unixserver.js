function main () {
  const { sys, net, loop, fs } = just
  let rps = 0
  let conn = 0
  const BUFSIZE = 16384
  const EVENTS = 1024
  const { EPOLL_CLOEXEC, EPOLL_CTL_ADD, EPOLLIN, EPOLLERR, EPOLLHUP } = loop
  const { SOMAXCONN, O_NONBLOCK, SOCK_STREAM, AF_UNIX, SOCK_NONBLOCK } = net
  const handlers = {}

  function onTimerEvent (fd, event) {
    const rss = sys.memoryUsage(mem)[0]
    just.print(`rps ${rps} mem ${rss} conn ${conn}`)
    net.read(fd, tbuf)
    rps = 0
  }

  function onListenEvent (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      net.close(fd)
      return
    }
    const clientfd = net.accept(fd)
    handlers[clientfd] = onSocketEvent
    let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
    flags |= O_NONBLOCK
    sys.fcntl(clientfd, sys.F_SETFL, flags)
    loop.control(loopfd, EPOLL_CTL_ADD, clientfd, EPOLLIN)
    conn++
  }

  function onSocketEvent (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      net.close(fd)
      conn--
      return
    }
    const bytes = net.recv(fd, rbuf)
    if (bytes > 0) {
      net.send(fd, wbuf)
      rps++
      return
    }
    if (bytes < 0) {
      const errno = sys.errno()
      if (errno !== net.EAGAIN) {
        just.print(`recv error: ${sys.strerror(errno)} (${errno})`)
        net.close(fd)
        conn--
      }
      return
    }
    net.close(fd)
    conn--
  }

  const mem = new Float64Array(16)
  const rbuf = new ArrayBuffer(BUFSIZE)
  const wbuf = ArrayBuffer.fromString('HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n')
  const evbuf = new ArrayBuffer(EVENTS * 12)
  const tbuf = new ArrayBuffer(8)
  const events = new Uint32Array(evbuf)
  const loopfd = loop.create(EPOLL_CLOEXEC)
  const timerfd = sys.timer(1000, 1000)
  handlers[timerfd] = onTimerEvent
  const sockfd = net.socket(AF_UNIX, SOCK_STREAM | SOCK_NONBLOCK, 0)
  handlers[sockfd] = onListenEvent
  let r = fs.unlink('./unix.socket')
  if (r !== 0) {
    const errno = sys.errno()
    if (errno !== 2) throw new Error(`unlink ${r} errno ${errno} : ${sys.strerror(errno)}`)
  }
  r = net.bind(sockfd, './unix.socket')
  if (r !== 0) throw new Error(`bind ${r} errno ${sys.errno()} : ${sys.strerror(sys.errno())}`)
  r = net.listen(sockfd, SOMAXCONN)
  if (r !== 0) throw new Error(`listen ${r} errno ${sys.errno()} : ${sys.strerror(sys.errno())}`)
  r = loop.control(loopfd, EPOLL_CTL_ADD, sockfd, EPOLLIN)
  r = loop.control(loopfd, EPOLL_CTL_ADD, timerfd, EPOLLIN)
  r = loop.wait(loopfd, evbuf)
  while (r > 0) {
    let off = 0
    for (let i = 0; i < r; i++) {
      const fd = events[off + 1]
      handlers[fd](fd, events[off])
      off += 3
    }
    r = loop.wait(loopfd, evbuf)
  }
}

main()

// 238k rps
