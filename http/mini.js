const { epoll } = just.library('epoll')
const { http } = just.library('http')
const { sys } = just.library('sys')
const { net } = just.library('net')

const { parseRequests } = http
const { EPOLLIN, EPOLLERR, EPOLLHUP } = epoll
const { close, recv, send, accept, setsockopt, socket, bind, listen } = net
const { fcntl } = sys
const { loop } = just.factory
const { F_GETFL, F_SETFL } = just.sys
const { IPPROTO_TCP, O_NONBLOCK, TCP_NODELAY, SO_KEEPALIVE, AF_INET, SOCK_STREAM, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT, SOCK_NONBLOCK } = just.net

function onSocketEvent (fd, event) {
  if (event & EPOLLERR || event & EPOLLHUP) {
    loop.remove(fd)
    close(fd)
    return
  }
  const bytes = recv(fd, buf, 0, 65536)
  if (bytes > 0) {
    const [remaining, count] = parseRequests(buf, bytes, 0, answer)
    if (count > 1) {
      if (count > maxPipeline) {
        close(fd)
        return
      }
      send(fd, r200, count * r200Len, 0)
      return
    }
    send(fd, r200, r200Len, 0)
    return
  }
  if (bytes < 0) just.error('recv error')
  loop.remove(fd)
  close(fd)
}

function onConnect (fd, event) {
  if (event & EPOLLERR || event & EPOLLHUP) {
    loop.remove(fd)
    close(fd)
    return
  }
  const newfd = accept(fd)
  setsockopt(newfd, IPPROTO_TCP, TCP_NODELAY, 0)
  setsockopt(newfd, SOL_SOCKET, SO_KEEPALIVE, 0)
  loop.add(newfd, onSocketEvent)
  const flags = fcntl(newfd, F_GETFL, 0) | O_NONBLOCK
  fcntl(newfd, F_SETFL, flags)
  loop.update(newfd, EPOLLIN | EPOLLERR | EPOLLHUP)
}

const answer = [0, 0]
const maxPipeline = 1024
const r200 = ArrayBuffer.fromString('HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n'.repeat(maxPipeline))
const r200Len = r200.byteLength / maxPipeline
const buf = new ArrayBuffer(65536)
const fd = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, 1)
setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, 1)
bind(fd, '127.0.0.1', 3000)
listen(fd, 1024)
loop.add(fd, onConnect)
