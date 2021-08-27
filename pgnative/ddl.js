const postgres = require('@pg')
const { stringify } = require('./util.js')

async function main () {
  async function execute (sql, name = '') {
    let query = cache[name]
    if (!query || query.sql !== sql) {
      const compiled = await sock.compile({ name, sql })
      query = { compiled, sql }
      cache[name] = query
    }
    const { compiled } = query
    const rows = await compiled.runSingle()
    const { fields, portal } = compiled.query
    const count = sock.parser.state.rows
    const status = sock.parser.readStatus()
    const state = String.fromCharCode(sock.parser.status)
    return { rows, fields, portal, sql: compiled.query.sql, count, state, status }
  }

  const db = {
    hostname: 'tfb-database',
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world',
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

    const dbName = just.args[2] || 'foo'
    let result = await execute(`DROP DATABASE IF EXISTS ${dbName}`)
    just.print(stringify(result))
    result = await execute(`CREATE DATABASE ${dbName} WITH TEMPLATE = template0 ENCODING 'UTF8'`)
    just.print(stringify(result))
    sock.close()

    db.database = dbName
    sock = (await postgres.connect(db))[0]
    just.print(`connected to ${db.database}`)
    sock.onNotice = notice => just.print(stringify(notice))

    const ddl = just.fs.readFile(`${dbName}.sql`)
    const statements = ddl.split(/;\s/).map(sql => sql.trim()).filter(v => v)
    for (const sql of statements) {
      just.print(`executing ${sql}`)
      result = await execute(sql)
      just.print(stringify(result))
    }
  } catch (err) {
    just.error(stringify(err))
  } finally {
    if (sock) sock.close()
  }
}

main().catch(err => just.error(err.stack))
