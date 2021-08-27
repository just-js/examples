const { repl } = require('repl')
const postgres = require('@pg')
const { stringify } = require('./util.js')

const rx = /postgres:\/\/([\w-]+)?:?(\w+)?@?([\w-]+)?:?(\d+)?\/([\w-]+)?/

function parseUrl (url) {
  const match = url.match(rx)
  if (!(match && match.length === 6)) throw new Error(`Bad URL ${url}`)
  const [user = 'postgres', pass = '', hostname = 'localhost', port = 5432, database = ''] = match.slice(1)
  return { user, pass, hostname, port: parseInt(port, 10), database }
}

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
    const { status, state } = sock.parser
    const count = state.rows
    return { rows, fields, portal, count, status: String.fromCharCode(status) }
  }
  const cache = {}
  const url = just.env().TFDB || 'postgres://localhost/'
  const db = parseUrl(url)
  const sock = (await postgres.connect(db))[0]
  const shell = repl()
  shell.onCommand = async sql => {
    if (!sql || !sql.trim()) {
      shell.prompt()
      return
    }
    try {
      const { rows, count, status } = await execute(sql)
      just.print(`${count} rows, status ${status}`)
      just.print(stringify(rows))
    } catch (err) {
      just.print(stringify(err))
    } finally {
      shell.prompt()
    }
  }
}

main().catch(err => just.error(err.stack))
