const { pg } = just.library('pg')
const { exec, prepare, execPrepared, consumeInput, sendPrepare, isBusy, getResult, getFieldName, getType, getSize, getValue, clear, errorMessage, sendExecPrepared, PGRES_TUPLES_OK, INT4OID, PGRES_COMMAND_OK } = pg
const { EPOLLERR, EPOLLHUP, EPOLLIN, EPOLLOUT, EPOLLET } = just.loop
const { loop } = just.factory
const { net } = just

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
    prepare(handle, name, sql, ...types)
    const { status } = handle
    if (status === PGRES_COMMAND_OK) {
      just.print(`prepared: ${name}`)
      prepared[name] = {}
      clear(handle)
    } else {
      just.print(errorMessage(handle))
      return
    }
  }
  execPrepared(handle, name, ...params)
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

function PGConnect (queryConn) {
  function onSocketEvent (fd, event) {
    if (event & EPOLLERR || event & EPOLLHUP) {
      handle.onClose()
      net.close(fd)
      return
    }
    if (event & EPOLLOUT) {
      handle.onWritable()
    }
    if (event & EPOLLIN) {
      handle.onReadable()
    }
  }

  let query
  let inProgress = false
  const handle = connect(queryConn)
  if (!handle) throw new Error('Could not Connect')
  const queues = { waiting: [], prepared: [] }
  const prepared = {}

  handle.onClose = () => {
    just.print('onClose')
  }

  handle.onReadable = () => {
    let r = consumeInput(handle)
    if (r === 1) {
      r = isBusy(handle)
      if (r === 0) {
        let r = getResult(handle)
        while (r === 1) {
          r = getResult(handle)
        }
        const { status } = handle
        if (status === PGRES_TUPLES_OK) {
          const rows = getRecords(handle)
          query.onComplete(null, rows)
        }
        inProgress = false
        handle.setWritable()
      }
    }
  }

  handle.onWritable = () => {
    if (inProgress) return
    const next = queues.waiting.shift()
    if (next) {
      query = next
      inProgress = true
      const { name } = query
      if (!prepared[name]) {
        const { sql, types } = query
        let r = sendPrepare(handle, name, sql, ...types)
        if (r === 1) {
          while (r === 1) {
            r = getResult(handle)
            if (r === 1) {
              const { status } = handle
              if (status === PGRES_COMMAND_OK) {
                prepared[name] = query
              }
            }
          }
        } else {
          just.print(errorMessage(handle))
          return
        }
      }
      const { params } = query
      const r = sendExecPrepared(handle, name, ...params)
      if (r === 0) {
        just.print(errorMessage(handle))
        queues.waiting.unshift(query)
        query = null
        inProgress = false
      }
      handle.setReadable()
    }
  }

  handle.setReadable = () => {
    loop.update(handle.fd, EPOLLIN | EPOLLERR | EPOLLHUP | EPOLLET)
  }

  handle.setWritable = () => {
    loop.update(handle.fd, EPOLLOUT | EPOLLERR | EPOLLHUP | EPOLLET)
  }

  handle.setReadAndWritable = () => {
    loop.update(handle.fd, EPOLLIN | EPOLLOUT | EPOLLERR | EPOLLHUP | EPOLLET)
  }

  loop.add(handle.fd, onSocketEvent)
  handle.setWritable()
  const conn = {}
  conn.submit = (query, onComplete) => {
    query.onComplete = onComplete
    queues.waiting.push(query)
    if (!inProgress) handle.onWritable()
  }
  return conn
}

module.exports = { PGConnect, connect, execute, executePrepared, pg }
