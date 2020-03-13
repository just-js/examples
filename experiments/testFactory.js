const { sys, net } = just
const { factory, createLoop } = just.require('./factory.js')
const { EPOLLIN } = just.loop

const buf = new ArrayBuffer(8)
const t1 = sys.timer(1000, 1000)

let counter = 0

global.loop.add(t1, (fd, event) => {
  if (event & EPOLLIN) {
    net.read(fd, buf)
    just.print(JSON.stringify(just.memoryUsage(), null, '  '))
    counter++
    if (counter % 3 === 0) {
      just.print('pausing')
      let paused = true
      const loop = createLoop(8)
      const t2 = sys.timer(1000, 1000)
      loop.add(t2, (fd, event) => {
        net.read(fd, buf)
        counter++
        just.print(`i am on a different loop: ${counter}`)
        if (counter % 6 === 0) {
          paused = false
        }
      })
      while (paused) {
        loop.poll(1)
        sys.runMicroTasks()
      }
      net.close(loop.fd)
    }
  }
})

factory.run()
