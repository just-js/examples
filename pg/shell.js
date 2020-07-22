const postgres = require('./pg.js')

function formatFieldName (str, size = str.length) {
  return `${ANSI_MAGENTA}${str.slice(0, size).padEnd(size, ' ')}${ANSI_DEFAULT}| `
}

function formatValue (str = '', size = str.length) {
  return `${str.toString().padEnd(size, ' ').slice(0, size)}| `
}

function getPrompt () {
  return `${ANSI_GREEN}>${ANSI_YELLOW} `
}

function write (fd, val) {
  net.write(fd, buf, buf.writeString(val), 0)
}

const { connect, execute } = postgres
const { net, sys } = just
const { sleep } = sys
const { STDIN_FILENO, STDOUT_FILENO } = just.sys
const { SOCK_STREAM, AF_UNIX, socketpair } = net
const { PGCONN } = just.env()
const stdinfds = []
const stdoutfds = []
const ANSI_DEFAULT = '\u001b[0m'
const ANSI_GREEN = '\u001b[32m'
const ANSI_YELLOW = '\u001b[33m'
const ANSI_MAGENTA = '\u001b[35m'
socketpair(AF_UNIX, SOCK_STREAM, stdinfds)
socketpair(AF_UNIX, SOCK_STREAM, stdoutfds)
const buf = new ArrayBuffer(1 * 1024 * 1024)
const connString = PGCONN || 'postgres://benchmarkdbuser:benchmarkdbpass@tfb-database/hello_world'

const handle = connect(connString)
if (!handle) {
  throw new Error('Could Not Connect')
}

while (1) {
  write(STDOUT_FILENO, getPrompt())
  const bytes = net.read(STDIN_FILENO, buf)
  if (bytes === 0) break
  if (bytes < 0) {
    sleep(1)
    continue
  }
  const sql = buf.readString(bytes)
  const rows = execute(handle, sql)
  if (!rows.length) {
    write(STDOUT_FILENO, postgres.pg.errorMessage(handle))
    continue
  }
  const fields = Object.keys(rows[0])
  let len = 0
  for (const field of fields) {
    write(STDOUT_FILENO, formatFieldName(field, 20))
    len += 22
  }
  write(STDOUT_FILENO, '\n')
  write(STDOUT_FILENO, '-'.repeat(len))
  write(STDOUT_FILENO, '\n')
  for (const row of rows) {
    for (const field of fields) {
      write(STDOUT_FILENO, formatValue(row[field], 20))
    }
    write(STDOUT_FILENO, '\n')
  }
}
