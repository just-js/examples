function createLoop (nevents = 1024) {
  const {
    create, wait, control, EPOLL_CLOEXEC, EPOLL_CTL_ADD,
    EPOLL_CTL_DEL, EPOLL_CTL_MOD, EPOLLIN, EPOLLOUT, EPOLLET 
  } = just.loop
  const evbuf = new ArrayBuffer(nevents * 12)
  const events = new Uint32Array(evbuf)
  const loopfd = create(EPOLL_CLOEXEC)
  const handles = {}

  function poll (timeout = -1) {
    const r = wait(loopfd, evbuf, timeout)
    if (r > 0) {
      let off = 0
      for (let i = 0; i < r; i++) {
        const fd = events[off + 1]
        handles[fd](fd, events[off])
        off += 3
      }
    }
    return r
  }

  function add (fd, callback, events = EPOLLIN) {
    const r = control(loopfd, EPOLL_CTL_ADD, fd, events)
    if (r === 0) {
      handles[fd] = callback
      instance.count++
    }
    return r
  }

  function remove (fd) {
    const r = control(loopfd, EPOLL_CTL_DEL, fd)
    if (r === 0) {
      delete handles[fd]
      instance.count--
    }
    return r
  }

  function update (fd, events = EPOLLIN) {
    const r = control(loopfd, EPOLL_CTL_MOD, fd, events)
    return r
  }

  const instance = { fd: loopfd, poll, add, remove, update, handles, count: 0 }
  return instance
}

const { sys, net } = just
const { EPOLLIN } = just.loop
const tbuf = new ArrayBuffer(8)

const loop = createLoop()

let c1 = 0
loop.add(sys.timer(1000, 1000), (fd, event) => {
  just.print(`event ${event} for ${fd} in loop ${loop.fd} (${loop.count})`)
  if (event & EPOLLIN) {
    net.read(fd, tbuf)
  }
  c1++
  if (c1 === 5) {
    loop.remove(fd)
  }
})

let c2 = 0
loop.add(sys.timer(2000, 2000), (fd, event) => {
  just.print(`event ${event} for ${fd} in loop ${loop.fd} (${loop.count})`)
  if (event & EPOLLIN) {
    net.read(fd, tbuf)
  }
  c2++
  if (c2 === 5) {
    loop.remove(fd)
  }
})

let c3 = 0
const loop2 = createLoop()
loop2.add(sys.timer(1000, 1000), (fd, event) => {
  just.print(`event ${event} for ${fd} in loop ${loop2.fd} (${loop2.count})`)
  if (event & EPOLLIN) {
    net.read(fd, tbuf)
  }
  c3++
  if (c3 === 15) {
    loop2.remove(fd)
  }
})

while (1) {
  if (loop.count === 0) {
    net.close(loop.fd)
    loop.count = -1
  } else {
    loop.poll(10)
    sys.runMicroTasks()
  }
  if (loop2.count === 0) {
    net.close(loop2.fd)
    loop2.count = -1
  } else {
    loop2.poll(10)
    sys.runMicroTasks()
  }
  if (loop.count === -1 && loop2.count === -1) break
}
