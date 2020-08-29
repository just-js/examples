const { rocksdb } = just.library('rocksdb.so', 'rocksdb')
const {
  open,
  get,
  put,
  createReadOptions,
  createWriteOptions,
  createOptions,
  createIfMissing
} = rocksdb

function getPrompt () {
  return `${ANSI_GREEN}>${ANSI_YELLOW} `
}

function write (fd, val) {
  net.write(fd, buf, buf.writeString(val), 0)
}

const { net, sys } = just
const { sleep } = sys
const { STDIN_FILENO, STDOUT_FILENO } = just.sys
const { SOCK_STREAM, AF_UNIX, socketpair } = net
const stdinfds = []
const stdoutfds = []
const ANSI_DEFAULT = '\u001b[0m'
const ANSI_GREEN = '\u001b[32m'
const ANSI_YELLOW = '\u001b[33m'
const ANSI_MAGENTA = '\u001b[35m'
socketpair(AF_UNIX, SOCK_STREAM, stdinfds)
socketpair(AF_UNIX, SOCK_STREAM, stdoutfds)
const buf = new ArrayBuffer(1 * 1024 * 1024)

const options = createOptions()
createIfMissing(options, true)
const db = open(options, '/dev/shm/rocksdb-testing')
const writeOptions = createWriteOptions()
const readOptions = createReadOptions()

while (1) {
  write(STDOUT_FILENO, getPrompt())
  const bytes = net.read(STDIN_FILENO, buf)
  if (bytes === 0) break
  if (bytes < 0) {
    sleep(1)
    continue
  }
  const stmt = buf.readString(bytes)
  const parts = stmt.split(' ')
  if (parts[0] === 'get') {
    const key = parts[1]
    const val = get(db, readOptions, key)
    just.print(val.byteLength)
    if (val.byteLength > 0) {
      write(STDOUT_FILENO, val)
    }
  } else if (parts[0] === 'put') {
    const key = parts[1]
    const value = parts[2]
    put(db, writeOptions, key, ArrayBuffer.fromString(value))
    write(STDOUT_FILENO, 'put ok')
  }
  write(STDOUT_FILENO, '\n')
}
