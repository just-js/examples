const { net } = just
const { EPOLLIN, EPOLLOUT, EPOLLERR, EPOLLHUP } = just.loop
const { AF_INET, SOCK_STREAM, SOCK_NONBLOCK, SOMAXCONN, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT } = net
const { loop } = just.factory
const { parse } = require('pg.js')

const frontend = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
let r = net.setsockopt(frontend, SOL_SOCKET, SO_REUSEADDR, 1)
r = net.setsockopt(frontend, SOL_SOCKET, SO_REUSEPORT, 1)
r = net.bind(frontend, '127.0.0.1', 5431)
if (r !== 0) throw new Error('bind')
r = net.listen(frontend, SOMAXCONN)
const buf = new ArrayBuffer(4096)
const ANSI_DEFAULT = '\u001b[0m'
const ANSI_YELLOW = '\u001b[33m'
const ANSI_MAGENTA = '\u001b[35m'
loop.add(frontend, (fd, event) => {
  if (event & EPOLLIN) {
    const client = net.accept(fd)
    const backend = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
    net.connect(backend, '127.0.0.1', 5432)
    loop.add(backend, (fd, event) => {
      if (event & EPOLLOUT) {
        loop.update(fd, EPOLLIN)
        loop.add(client, (fd, event) => {
          if (event & EPOLLIN) {
            const bytes = net.read(fd, buf)
            if (bytes === 0) {
              net.close(fd)
              net.close(backend)
            } else if (bytes > 0) {
              just.print(`${ANSI_YELLOW}client -> (${bytes})${ANSI_DEFAULT}`)
              parse(buf, bytes, 'F')
              net.write(backend, buf, bytes)
            }
          }
          if (event & EPOLLERR || event & EPOLLHUP) {
            net.close(fd)
            net.close(backend)
          }
        })
      }
      if (event & EPOLLIN) {
        const bytes = net.read(fd, buf)
        if (bytes === 0) {
          net.close(fd)
          net.close(client)
        } else if (bytes > 0) {
          just.print(`${ANSI_MAGENTA}client <- (${bytes})${ANSI_DEFAULT}`)
          parse(buf, bytes, 'B')
          net.write(client, buf, bytes)
        }
      }
      if (event & EPOLLERR || event & EPOLLHUP) {
        net.close(fd)
        net.close(client)
      }
    }, EPOLLOUT)
  }
})
