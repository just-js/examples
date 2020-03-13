function main () {
  const { sys, net, loop, http } = just
  let rps = 0
  let conn = 0
  const BUFSIZE = 16384
  const EVENTS = 1024
  const { EPOLL_CLOEXEC, EPOLL_CTL_ADD, EPOLLIN, EPOLLERR, EPOLLHUP } = loop
  const { SOMAXCONN, O_NONBLOCK, SOCK_STREAM, AF_INET, SOCK_NONBLOCK, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, IPPROTO_TCP, TCP_NODELAY, SO_KEEPALIVE } = net
  const handlers = {}

  function onTimerEvent (fd, event) {
    const rss = sys.memoryUsage(mem)[0]
    just.print(`rps ${rps} mem ${rss} conn ${conn}`)
    net.read(fd, tbuf)
    rps = 0
  }

  function onListenEvent (fd, event) {
    const clientfd = net.accept(fd)
    net.setsockopt(clientfd, IPPROTO_TCP, TCP_NODELAY, 1)
    net.setsockopt(clientfd, SOL_SOCKET, SO_KEEPALIVE, 1)
    const la = net.getsockname(clientfd, AF_INET, [])
    const ra = net.getpeername(clientfd, AF_INET, [])
    just.print(JSON.stringify(la))
    just.print(JSON.stringify(ra))
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
      const nread = http.parseRequest(rbuf, bytes, 0)
      //const request = http.getRequest()
      //just.print(JSON.stringify(request, null, '  '))
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
  const sockfd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  handlers[sockfd] = onListenEvent
  let r = net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, 1)
  r = net.setsockopt(sockfd, SOL_SOCKET, SO_REUSEPORT, 1)
  r = net.bind(sockfd, '127.0.0.1', 3000)
  r = net.listen(sockfd, SOMAXCONN)
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
