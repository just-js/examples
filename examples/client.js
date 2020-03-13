function main () {
  const { sys, net, loop } = just
  let rps = 0
  let conn = 0
  const BUFSIZE = 16384
  const EVENTS = 1024
  const { EPOLL_CLOEXEC, EPOLL_CTL_ADD, EPOLL_CTL_MOD, EPOLLIN, EPOLLERR, EPOLLHUP, EPOLLOUT } = loop
  const { SOCK_STREAM, AF_INET, SOCK_NONBLOCK, SOL_SOCKET, IPPROTO_TCP, TCP_NODELAY, SO_KEEPALIVE } = net
  const handlers = {}

  function onTimerEvent (fd, event) {
    const rss = sys.memoryUsage(mem)[0]
    just.print(`rps ${rps} mem ${rss} conn ${conn}`)
    net.read(fd, tbuf)
    rps = 0
  }

  function onConnectEvent (fd, event) {
    if (event & EPOLLOUT) {
      net.setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, 1)
      net.setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, 1)
      const la = net.getsockname(fd, AF_INET, [])
      const ra = net.getpeername(fd, AF_INET, [])
      just.print(JSON.stringify(la))
      just.print(JSON.stringify(ra))
      r = loop.control(loopfd, EPOLL_CTL_MOD, fd, EPOLLIN)
      net.send(fd, wbuf)
      conn++
      return
    }
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
  const wbuf = ArrayBuffer.fromString('GET / HTTP/1.1\r\n\r\n')
  const evbuf = new ArrayBuffer(EVENTS * 12)
  const tbuf = new ArrayBuffer(8)
  const events = new Uint32Array(evbuf)
  const loopfd = loop.create(EPOLL_CLOEXEC)

  const timerfd = sys.timer(1000, 1000)
  handlers[timerfd] = onTimerEvent
  let r = loop.control(loopfd, EPOLL_CTL_ADD, timerfd, EPOLLIN)

  function client () {
    const sockfd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
    handlers[sockfd] = onConnectEvent
    r = net.connect(sockfd, '127.0.0.1', parseInt(just.args[2] || '3000', 10))
    r = loop.control(loopfd, EPOLL_CTL_ADD, sockfd, EPOLLOUT)
  }

  let clients = 128
  while (clients--) client()

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
