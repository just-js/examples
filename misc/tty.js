const { print, error, exit, sys, net } = just
const { read, write } = net
const { strerror, errno, STDIN_FILENO, STDOUT_FILENO, getTerminalFlags, setTerminalFlags } = sys

function enableRawMode () {
  const newflags = flags & ~(ECHO | ICANON | ISIG)
  setTerminalFlags(STDIN_FILENO, newflags)
}

function disableRawMode () {
  setTerminalFlags(STDIN_FILENO, flags)
}

function onUp () {
  write(STDOUT_FILENO, ANSI_UP, ANSI_UP.byteLength, 0)
}

function onDown () {
  write(STDOUT_FILENO, ANSI_DOWN, ANSI_DOWN.byteLength, 0)
}

function onLeft () {
  write(STDOUT_FILENO, ANSI_LEFT, ANSI_LEFT.byteLength, 0)
}

function onRight () {
  write(STDOUT_FILENO, ANSI_RIGHT, ANSI_RIGHT.byteLength, 0)
}

function onBackspace () {
  write(STDOUT_FILENO, ArrayBuffer.fromString('\b'), 1, 0)
}

const b = new ArrayBuffer(1)
const c = new Uint8Array(b)
const ICANON = 2
const ECHO = 8
const ISIG = 1
const ANSI_UP = ArrayBuffer.fromString('\u001b[1A')
const ANSI_DOWN = ArrayBuffer.fromString('\u001b[1B')
const ANSI_LEFT = ArrayBuffer.fromString('\u001b[1D')
const ANSI_RIGHT = ArrayBuffer.fromString('\u001b[1C')
const ANSI_ERASE_LINE = ArrayBuffer.fromString('\u001b[K')

let done = false

const flags = getTerminalFlags(STDIN_FILENO)
enableRawMode()

while (!done) {
  let bytes = read(STDIN_FILENO, b, 0, 1)
  if (bytes > 0) {
    if (c[0] === 3) { // SIGTERM (ctrl + C)
      just.print('CTRL + C pressed, exiting...')
      done = true
      break
    }
    if (c[0] === 26) { // SIGSTP (ctrl + Z)
      just.print('CTRL + Z pressed, exiting...')
      done = true
      break
    }
    if (c[0] === 27) {
      read(STDIN_FILENO, b, 0, 1)
      read(STDIN_FILENO, b, 0, 1)
      if (c[0] === 65) { // arrow up
        onUp()
      } else if (c[0] === 66) {
        onDown()
      } else if (c[0] === 67) {
        onRight()
      } else if (c[0] === 68) {
        onLeft()
      } else {
        just.print(c[0])
      }
    } else if (c[0] === 127) {
      onBackspace()
    } else {
      write(STDOUT_FILENO, b, 1, 0)
    }
    bytes = read(STDIN_FILENO, b, 0, 1)
  } else {
    just.sys.usleep(1000)
  }
}

disableRawMode()
just.exit(0)
