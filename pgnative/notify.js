const postgres = require('@pg')
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
  listener.onNotify = async notification => {
    just.print(stringify(notification))
    await listener.exec(`NOTIFY bar, '${(new Array(256)).fill('1').join('')}'`)
    listener.messages++
    if (listener.messages === 2) listener.close()
  }
  listener.exec = wrapExec(listener)
  listener.messages = 0
  await listener.exec('LISTEN foo')

  const speaker = (await connect(db, 1))[0]
  speaker.onNotify = notification => {
    just.print(stringify(notification))
    speaker.messages++
    if (speaker.messages === 2) speaker.close()
  }
  speaker.messages = 0
  speaker.exec = wrapExec(speaker)
  await speaker.exec('LISTEN bar')
  await speaker.exec('NOTIFY foo')
  await speaker.exec(`NOTIFY foo, '${(new Array(256)).fill('0').join('')}'`)
}

main().catch(err => just.error(err.stack))
