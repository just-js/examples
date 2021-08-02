const { net } = just.library('net')
const { sys } = just.library('sys')

const { EPOLLIN, EPOLLERR, EPOLLHUP, EPOLLOUT } = just.loop
const readableMask = EPOLLIN | EPOLLERR | EPOLLHUP
const readableWritableMask = EPOLLIN | EPOLLERR | EPOLLHUP | EPOLLOUT

class Pipe {
  constructor (fd, buffer, loop) {
    this.fd = fd
    this.loop = loop
    this.size = buffer.byteLength
    this.buffer = buffer
    this.paused = false
    let flags = sys.fcntl(fd, sys.F_GETFL, 0)
    flags |= net.O_NONBLOCK
    sys.fcntl(fd, sys.F_SETFL, flags)
    loop.add(fd, (...args) => this.onEvent(...args), readableWritableMask)
  }

  onEvent (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      this.close()
      return
    }
    if (event & EPOLLIN) {
      this.onReadable()
      return
    }
    if (event & EPOLLOUT) {
      this.onWritable()
      return
    }
    this.onSpurious(fd, event)
  }

  onReadable () {}
  onWritable () {}
  onSpurious () {}

  close () {
    return net.close(this.fd)
  }

  pause () {
    this.paused = true
    return this.loop.update(this.fd, readableWritableMask)
  }

  resume () {
    this.paused = false
    return this.loop.update(this.fd, readableMask)
  }

  read (bytes = this.size, off = 0) {
    return net.read(this.fd, this.buffer, off, bytes)
  }

  write (bytes, off = 0) {
    const done = net.write(this.fd, this.buffer, bytes, off)
    if (done < 0) {
      if (sys.errno() === net.EAGAIN) {
        this.pause()
        return done
      }
      throw new just.SystemError('write')
    }
    return done
  }
}

function create (fd, buffer = new ArrayBuffer(16384), loop = just.factory.loop) {
  return new Pipe(fd, buffer, loop)
}

module.exports = { create, Pipe }
