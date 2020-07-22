const { pg } = just.library('../../modules/pg/pg.so', 'pg')
const { exec, getFieldName, errorMessage, getType, getSize, getValue, execPrepared, prepare, clear, PGRES_TUPLES_OK, PGRES_COMMAND_OK, INT4OID } = pg

const prepared = {}

function getRecords (handle) {
  const { tuples, fields, status } = handle
  const records = []
  if (status === PGRES_TUPLES_OK) {
    const schema = []
    for (let col = 0; col < fields; col++) {
      const field = { name: getFieldName(handle, col), type: getType(handle, col), size: getSize(handle, col) }
      schema.push(field)
    }
    for (let row = 0; row < tuples; row++) {
      const record = {}
      for (let col = 0; col < fields; col++) {
        const { name, type } = schema[col]
        if (type === INT4OID) {
          record[name] = parseInt(getValue(handle, row, col), 10)
        } else {
          record[name] = getValue(handle, row, col)
        }
      }
      records.push(record)
    }
  }
  clear(handle)
  return records
}

function executePrepared (handle, sql, name, params, types) {
  if (!prepared[name]) {
    prepare.apply(null, [handle, name, sql].concat(types))
    const { status } = handle
    if (status === PGRES_COMMAND_OK) {
      prepared[name] = {}
      clear(handle)
    } else {
      just.print(errorMessage(handle))
      return
    }
  }
  execPrepared.apply(null, [handle, name].concat(params))
  return getRecords(handle)
}

function execute (handle, sql) {
  exec(handle, sql)
  return getRecords(handle)
}

function connect (connString) {
  const handle = pg.connect(connString)
  if (!handle) {
    return
  }
  return handle
}

module.exports = { connect, execute, executePrepared, pg }
