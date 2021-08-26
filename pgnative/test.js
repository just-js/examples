const postgres = require('@pg')
const { connect } = postgres
const { BinaryInt, VarChar } = postgres.constants
const { stringify } = require('util.js')

async function main () {
  const db = {
    hostname: 'tfb-database',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world'
  }
  const fortunes = {
    name: 's2',
    sql: 'select * from Fortune',
    fields: [
      { format: BinaryInt, name: 'id' },
      { format: VarChar, name: 'message', htmlEscape: true }
    ]
  }
  const pool = await connect(db, 1)
  const sock = pool[0]
  const query = await sock.compile(fortunes, 10)
  const result = await query.runSingle()
  just.print(stringify(result))
  sock.close()
}

main().catch(err => just.error(err.stack))
