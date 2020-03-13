const { net, sys, print, setInterval, memoryUsage, cpuUsage } = just
const { loop } = just.factory
const { EPOLLIN, EPOLLERR, EPOLLHUP, EPOLLOUT } = just.loop
const { HTTPStream } = just.require('./http.js')

let rps = 0
const maxPipeline = 256
const BUFSIZE = 16384

function createSocket (fd, buf) {
  function flush (count) {
    while (count > 0) {
      const todo = Math.min(maxPipeline, count)
      const written = net.send(fd, res, todo * resLen)
      if (written > 0) {
        rps += todo
        count -= todo
        continue
      }
      if (written < 0) {
        if (sys.errno() === net.EAGAIN) {
          pause()
          return -1
        }
      }
      net.close(fd)
      return -1
    }
    return 0
  }
  function onEvent (fd, event) {
    if (event & (EPOLLERR | EPOLLHUP)) {
      net.close(fd)
      return
    }
    if (event & EPOLLIN) {
      const bytes = net.recv(fd, buf, stream.offset)
      if (bytes < 0) {
        const errno = sys.errno()
        if (errno !== net.EAGAIN) {
          net.close(fd)
          return
        }
      }
      if (bytes > 0) {
        const err = stream.parse(bytes, flush)
        if (err < 0) print(`error: ${err}`)
        return
      }
      net.close(fd)
      return
    }
    if (event & EPOLLOUT) {
      loop.update(fd, EPOLLIN)
    }
  }
  const pause = () => loop.update(fd, EPOLLOUT)
  const str = 'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n'
  const resLen = str.length
  const res = ArrayBuffer.fromString(str.repeat(maxPipeline))
  loop.add(fd, onEvent)
  const stream = new HTTPStream(buf, maxPipeline)
  return { onEvent, fd, buf, stream }
}

function main () {
  const sockets = {}

  function onConnectEvent (fd, event) {
    const clientfd = net.accept(fd)
    net.setsockopt(clientfd, net.IPPROTO_TCP, net.TCP_NODELAY, 1)
    net.setsockopt(clientfd, net.SOL_SOCKET, net.SO_KEEPALIVE, 1)
    let flags = sys.fcntl(clientfd, sys.F_GETFL, 0)
    flags |= net.O_NONBLOCK
    sys.fcntl(clientfd, sys.F_SETFL, flags)
    sockets[clientfd] = createSocket(clientfd, new ArrayBuffer(BUFSIZE))
  }

  function onTimer () {
    const { rss } = memoryUsage()
    const { user, system } = cpuUsage()
    const upc = ((user - last.user) / 1000000).toFixed(2)
    const spc = ((system - last.system) / 1000000).toFixed(2)
    print(`mem ${rss} cpu ${upc} / ${spc} rps ${rps}`)
    last.user = user
    last.system = system
    rps = 0
  }

  const last = { user: 0, system: 0 }
  const fd = net.socket(net.AF_INET, net.SOCK_STREAM | net.SOCK_NONBLOCK, 0)
  net.setsockopt(fd, net.SOL_SOCKET, net.SO_REUSEADDR, 1)
  net.setsockopt(fd, net.SOL_SOCKET, net.SO_REUSEPORT, 1)
  net.bind(fd, '127.0.0.1', 3000)
  net.listen(fd, net.SOMAXCONN)
  loop.add(fd, onConnectEvent)
  setInterval(onTimer, 1000)
}

main()
