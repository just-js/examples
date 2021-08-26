const postgres = require('../../libs/pg/pg.js')
const { connect } = postgres
const { stringify } = require('util.js')

async function main () {
  function wrapExec (sock) {
    return async function execute (sql, name = '') {
      let query = cache[name]
      if (!query || query.sql !== sql) {
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
  }
  const cache = {}
  const db = {
    hostname: 'tfb-database',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'foo'
  }

  const listener = (await connect(db, 1))[0]
  listener.onNotify = notification => just.print(stringify(notification))
  listener.exec = wrapExec(listener)
  await listener.exec('LISTEN foo')

  const speaker = (await connect(db, 1))[0]
  speaker.exec = wrapExec(speaker)
  await speaker.exec('NOTIFY foo')
  await speaker.exec(`NOTIFY foo, '${(new Array(1024)).fill('0').join('')}'`)

  speaker.close()
  listener.close()
}

main().catch(err => just.error(err.stack))
