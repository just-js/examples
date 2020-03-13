const { net } = just
const { EPOLLIN, EPOLLOUT, EPOLLERR, EPOLLHUP } = just.loop
const { AF_INET, SOCK_STREAM, SOCK_NONBLOCK, SOMAXCONN, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT } = net

const frontend = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
let r = net.setsockopt(frontend, SOL_SOCKET, SO_REUSEADDR, 1)
r = net.setsockopt(frontend, SOL_SOCKET, SO_REUSEPORT, 1)
r = net.bind(frontend, '127.0.0.1', 3001)
if (r !== 0) throw new Error('bind')
r = net.listen(frontend, SOMAXCONN)
const buf = new ArrayBuffer(4096)
const loop = global.loop
loop.add(frontend, (fd, event) => {
  if (event & EPOLLIN) {
    const client = net.accept(fd)
    const backend = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
    net.connect(backend, '127.0.0.1', 3000)
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
