const b = new ArrayBuffer(1)
const c = new Uint8Array(b)
const ICANON = 2
const ECHO = 8
const ISIG = 1

const ANSI_UP = '\u001b[1A'
const ANSI_DOWN = '\u001b[1B'
const ANSI_LEFT = '\u001b[1D'
const ANSI_RIGHT = '\u001b[1C'
const ANSI_ERASE_LINE = '\u001b[K'

const flags = just.sys.getTerminalFlags(just.sys.STDIN_FILENO)

function enableRawMode () {
  const newflags = flags & ~(ECHO | ICANON | ISIG)
  just.sys.setTerminalFlags(just.sys.STDIN_FILENO, newflags)
}

function disableRawMode () {
  just.sys.setTerminalFlags(just.sys.STDIN_FILENO, flags)
}

function onUp () {

}

function onDown () {

}

function onLeft () {
  just.net.write(just.sys.STDOUT_FILENO, ArrayBuffer.fromString(ANSI_LEFT))
}

function onRight () {
  just.net.write(just.sys.STDOUT_FILENO, ArrayBuffer.fromString(ANSI_RIGHT))
}

function onBackspace () {
  just.net.write(just.sys.STDOUT_FILENO, ArrayBuffer.fromString('\b'))
}

enableRawMode()

let bytes = just.net.read(just.sys.STDIN_FILENO, b)
while (bytes > 0) {
  just.print(c[0])
  if (c[0] === 3) { // SIGTERM (ctrl + C)
    just.print('CTRL + C pressed, exiting...')
    disableRawMode()
    just.exit(0)
    break
  }
  if (c[0] === 26) { // SIGSTP (ctrl + Z)
    just.print('CTRL + Z pressed, exiting...')
    disableRawMode()
    just.exit(0)
    break
  }
  if (c[0] === 27) {
    just.net.read(just.sys.STDIN_FILENO, b)
    just.net.read(just.sys.STDIN_FILENO, b)
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
    just.net.write(just.sys.STDOUT_FILENO, b)
  }
  bytes = just.net.read(just.sys.STDIN_FILENO, b)
}
