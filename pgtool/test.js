const postgres = require('@pg')

const { connect, constants } = postgres
const { BinaryInt } = constants

async function main () {
  const sock = (await connect({
    hostname: 'tfb-database',
    user: 'benchmarkdbuser',
    pass: 'benchmarkdbpass',
    database: 'hello_world',
    bufferSize: 256 * 1024
  }, 1))[0]
  const worldsQuery = await sock.create({
    name: 'B',
    sql: 'select id, randomNumber from World where id = $1',
    fields: [
      { format: BinaryInt, name: 'id' },
      { format: BinaryInt, name: 'randomnumber' }
    ],
    params: 1,
    formats: [BinaryInt]
  }, 500)
  const getWorldById = id => {
    worldsQuery.query.params[0] = id
    const promise = worldsQuery.runSingle()
    worldsQuery.commit()
    return promise
  }
  just.print(JSON.stringify(await getWorldById(1)))
}

main().catch(err => just.error(err.stack))
