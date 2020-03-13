const { sys, net, loop, udp, args } = just
const { EPOLL_CLOEXEC, EPOLLIN, EPOLL_CTL_ADD } = loop
const { SOCK_DGRAM, AF_INET, SOCK_NONBLOCK } = net
const { sendmsg, recvmsg } = udp

const EVENTS = 1024
const handlers = {}

function onTimerEvent (fd, event) {
  const bytes = sendmsg(sockfd, buf, '127.0.0.1', dest)
  if (bytes <= 0) throw new Error(`sendmsg ${r} errno ${sys.errno()} : ${sys.strerror(sys.errno())}`)
  net.read(fd, tbuf)
}

function onDgramEvent (fd, event) {
  const answer = []
  const bytes = recvmsg(fd, buf, answer)
  const [address, port] = answer
  just.print(`${bytes} from ${address}:${port}`)
}

const buf = ArrayBuffer.fromString('01234567890123456789012345678901234567890123456789')
const timerfd = sys.timer(1000, 1000)
handlers[timerfd] = onTimerEvent
const tbuf = new ArrayBuffer(8)
const evbuf = new ArrayBuffer(EVENTS * 12)
const events = new Uint32Array(evbuf)
const loopfd = loop.create(EPOLL_CLOEXEC)
const sockfd = net.socket(AF_INET, SOCK_DGRAM | SOCK_NONBLOCK, 0)
handlers[sockfd] = onDgramEvent
const source = parseInt(args[2] || 4444, 10)
const dest = parseInt(args[3] || 5555, 10)
let r = net.bind(sockfd, '127.0.0.1', source)
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
