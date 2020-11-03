const { TTY } = process.binding('tty_wrap')
const stdin = new TTY(0)
stdin.setRawMode(true)
let size = 0
stdin.onread = (b) => {
  if (!b) {
    console.log(size)
    return
  }
  size += b.byteLength
}
stdin.readStart()
