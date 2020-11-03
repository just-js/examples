const { Pipe } = process.binding('pipe_wrap')
const stdin = new Pipe(0)
stdin.open(0)
let size = 0
stdin.onread = buf => {
  if (!buf) {
    console.log(size)
    return
  }
  size += buf.byteLength
}
stdin.readStart()
