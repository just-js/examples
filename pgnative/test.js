const postgres = require('../../libs/pg/pg.js')
const { connect } = postgres
const { BinaryInt, VarChar, fieldTypes } = postgres.constants
const { INT4OID, VARCHAROID } = fieldTypes

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
      { format: BinaryInt, name: 'id', oid: INT4OID },
      { format: VarChar, name: 'message', oid: VARCHAROID, htmlEscape: true }
    ]
  }
  const pool = await connect(db, 1)
  const sock = pool[0]
  const query = await sock.create(fortunes, 10)

  const result = await query.run()

  just.print(require('util.js').stringify(result))
  sock.close()
}

main().catch(err => just.error(err.stack))
