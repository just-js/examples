const postgres = require('./lib/pg.js')
const { connect, executePrepared } = postgres

const handle = connect('postgres://benchmarkdbuser:benchmarkdbpass@tfb-database/hello_world')
if (!handle) {
  throw new Error('Could Not Connect')
}
const { INT4OID } = postgres.pg

const rows = executePrepared(handle,
  'select * from World where id in ($1,$2,$3)',
  'test',
  [5, 10, 9000],
  [INT4OID, INT4OID, INT4OID]
)

just.print(JSON.stringify(rows))
