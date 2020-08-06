const { connect, types } = require('./pg.js')

function resolver (k, v) {
  if (typeof v === 'bigint') return v.toString()
  if (v instanceof ArrayBuffer) return '[ArrayBuffer]'
  if (v instanceof Uint8Array) return '[Uint8Array]'
  if (v instanceof DataView) return '[DataView]'
  return v
}

const stringify = (o, sp = '  ') => {
  return JSON.stringify(o, resolver, sp)
}

async function run () {
  const config = {
    address: '127.0.0.1',
    port: 5432,
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    db: 'hello_world'
  }
  connect(config, (err, client) => {
    if (err) return just.error(err.stack)
    just.print('connected')
    client.startup(salt => {
      client.md5Auth(salt, () => {
        const { parameters, pid, key, status } = client
        just.print(`authenticated\n${stringify({ parameters, pid, key, status })}`)
        client.execQuery('select * from World limit 10;', () => {
          const { closeType, closeName, rows, fields } = client
          just.print(`query\n${stringify({ closeType, closeName, rows, fields })}`)
          client.prepare('select * from World where id = $1;', 'test', [types.INT4OID], () => {
            const { fields } = client
            just.print(`prepare\n${stringify({ fields })}`)
            client.describe('test', 'S', () => {
              const { params, fields } = client
              just.print(`describe\n${stringify({ params, fields })}`)
              client.bind('test', [Math.ceil(Math.random() * 10000)], [1], () => {
                just.print('bind ok')
                client.exec(() => {
                  const { closeType, closeName, rows, fields } = client
                  just.print(`exec\n${stringify({ closeType, closeName, rows, fields })}`)
                })
                client.flush()
              })
              client.flush()
            })
            client.flush()
          })
          client.flush()
        })
      })
    })
  })
}

run().catch(err => just.error(err.stack))
