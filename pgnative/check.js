const postgres = require('@pg')
const { stringify } = require('./util.js')

async function main () {
  async function execute (sql, name = '') {
    let query = cache[name]
    if (!query || query.sql !== sql) {
      just.print(`compiling ${sql} for ${name}`)
      const compiled = await sock.compile({ name, sql })
      query = { compiled, sql }
      cache[name] = query
    }
    const { compiled } = query
    const rows = await compiled.runSingle()
    const { fields, portal } = compiled.query
    const { status, state } = sock.parser
    const count = state.rows
    return { rows, fields, portal, sql: compiled.query.sql, count, status: String.fromCharCode(status) }
  }

  const db = {
    hostname: 'tfb-database',
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'foo',
    bufferSize: 64 * 1024,
    noDelay: false,
    poolSize: 1
  }
  const cache = {}
  let sock
  try {
    sock = (await postgres.connect(db))[0]
    just.print(`connected to ${db.database}`)
    sock.onNotice = notice => just.print(stringify(notice))
    const result = await execute('select * from fortune')
    just.print(stringify(result))
    sock.close()
  } catch (err) {
    just.error(stringify(err))
  } finally {
    if (sock) sock.close()
  }
}

main().catch(err => just.error(err.stack))
