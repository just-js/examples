const { net } = just
const { STDIN_FILENO, STDOUT_FILENO } = just.sys
const postgres = require('./lib/pg.js')

const { connect, execute } = postgres
const { PGCONN } = just.env()
const buf = new ArrayBuffer(1 * 1024 * 1024)
const connString = PGCONN || 'postgres://benchmarkdbuser:benchmarkdbpass@tfb-database/hello_world'
const handle = connect(connString)
if (!handle) {
  throw new Error('Could Not Connect')
}
while (1) {
  const bytes = net.read(STDIN_FILENO, buf)
  if (bytes === 0) break
  if (bytes < 0) continue
  const sql = buf.readString(bytes)
  const rows = execute(handle, sql)
  if (!rows.length) {
    net.write(STDOUT_FILENO, buf, buf.writeString(postgres.pg.errorMessage(handle)), 0)
    continue
  }
  net.write(STDOUT_FILENO, buf, buf.writeString(JSON.stringify(rows)), 0)
}
