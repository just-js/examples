const { sys, net } = just
const { read, write } = net
const { STDIN_FILENO, STDOUT_FILENO, getTerminalFlags, setTerminalFlags } = sys

function enableRawMode () {
  const newflags = flags & ~(ECHO | ICANON | ISIG)
  setTerminalFlags(STDIN_FILENO, newflags)
}

function disableRawMode () {
  if (flags === 0) return
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

const ICANON = 2
const ECHO = 8
const ISIG = 1

const ANSI_UP = ArrayBuffer.fromString('\u001b[1A')
const ANSI_DOWN = ArrayBuffer.fromString('\u001b[1B')
const ANSI_LEFT = ArrayBuffer.fromString('\u001b[1D')
const ANSI_RIGHT = ArrayBuffer.fromString('\u001b[1C')
const ANSI_ERASE_LINE = ArrayBuffer.fromString('\u001b[K')

const flags = getTerminalFlags(STDIN_FILENO)
if (flags !== 0) {
  enableRawMode()
}
const b = new ArrayBuffer(4096)
const c = new Uint8Array(b)
let off = 0
let bytes = read(STDIN_FILENO, b, off, b.byteLength)
while (bytes > 0) {
  if (c[off] === 3) { // SIGTERM (ctrl + C)
    just.print('CTRL + C pressed, exiting...')
    break
  }
  if (c[off] === 26) { // SIGSTP (ctrl + Z)
    just.print('CTRL + Z pressed, exiting...')
    break
  }
  if (c[off] === 10) {
    //just.net.writeString(STDOUT_FILENO, `\n> ${b.readString(off)}`)
    write(STDOUT_FILENO, b, 1, off)
    off = -1
  }
  if (c[off] === 27) {
    read(STDIN_FILENO, b, off++, 1)
    read(STDIN_FILENO, b, off++, 1)
    if (c[off] === 65) { // arrow up
      onUp()
      off -= 3
    } else if (c[off] === 66) {
      onDown()
      off -= 3
    } else if (c[off] === 67) {
      off -= 3
      onRight()
    } else if (c[off] === 68) {
      onLeft()
      off -= 3
    } else {
      //just.print(c[off])
    }
  } else if (c[off] === 127) {
    off--
    onBackspace()
  } else {
    write(STDOUT_FILENO, b, 1, off)
  }
  off++
  bytes = read(STDIN_FILENO, b, off, 1)
}

disableRawMode()
just.exit(0)
