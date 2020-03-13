const { sys, net } = just
const { EPOLLIN } = just.loop
const tbuf = new ArrayBuffer(8)
const timerfd = sys.timer(1000, 1000)
global.loop.add(timerfd, (fd, event) => {
  if (event & EPOLLIN) {
    net.read(fd, tbuf)
    //just.print(JSON.stringify(just.memoryUsage(), null, '  '))
  }
})
