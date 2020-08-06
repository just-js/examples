const { crypto } = just.library('openssl.so', 'crypto')
const { net, sys, encode } = just
const { AF_INET, SOCK_STREAM, SOCK_NONBLOCK, SOL_SOCKET, IPPROTO_TCP, TCP_NODELAY, SO_KEEPALIVE, SO_ERROR } = net
const { EPOLLERR, EPOLLHUP, EPOLLIN, EPOLLOUT, EPOLLET } = just.loop
const { loop } = just.factory

const constants = {
  AuthenticationMD5Password: 5
}

const clients = {}

function readCString (buf, u8, off) {
  const start = off
  while (u8[off]) off++
  return just.sys.readString(buf, off - start, start)
}

function onSocketEvent (fd, event) {
  const client = clients[fd]
  const { buf, dv, u8, commands, fields, rows } = client
  if (event & EPOLLERR || event & EPOLLHUP) {
    const errno = net.getsockopt(fd, SOL_SOCKET, SO_ERROR)
    loop.remove(fd)
    net.close(fd)
    delete clients[fd]
    if (!client.connected) {
      client.onConnect(new Error(`${errno} : ${just.sys.strerror(errno)}`))
    }
    return
  }
  if (event & EPOLLIN) {  
    const bytes = net.read(fd, buf)
    let off = 0
    while (off < bytes) {
      const [type, len] = [dv.getUint8(off), dv.getInt32(off + 1)]
      off += 5
      if (type === 82) {
        // R = AuthenticationOk
        const method = dv.getInt32(off)
        off += 4
        if (method === constants.AuthenticationMD5Password) {
          const salt = buf.slice(off, off + 4)
          off += 4
          const command = commands.shift()
          if (command.type === 'startup') {
            command.callback(salt)
          }
        }
      } else if (type === 69) {
        // E = ErrorResponse
        let fieldType = u8[off++]
        const fields = []
        while (fieldType !== 0) {
          const val = readCString(buf, u8, off)
          fields.push({ type: fieldType, val })
          off += (val.length + 1)
          fieldType = u8[off++]
        }
      } else if (type === 83) {
        // S = ParameterStatus
        const key = readCString(buf, u8, off)
        off += (key.length + 1)
        const val = readCString(buf, u8, off)
        off += val.length + 1
        client.parameters[key] = val
      } else if (type === 84) {
        // T = RowDescription
        const fieldCount = dv.getInt16(off)
        off += 2
        fields.length = 0
        rows.length = 0
        for (let i = 0; i < fieldCount; i++) {
          const name = readCString(buf, u8, off)
          off += name.length + 1
          const tid = dv.getInt32(off)
          off += 4
          const attrib = dv.getInt16(off)
          off += 2
          const oid = dv.getInt32(off)
          off += 4
          const size = dv.getInt16(off)
          off += 2
          const mod = dv.getInt32(off)
          off += 4
          const format = dv.getInt16(off)
          off += 2
          fields.push({ name, tid, attrib, oid, size, mod, format })
        }
        if (commands[0].type === 'describe') {
          commands.shift().callback()
        }
      } else if (type === 67) {
        // C = Close
        // GARBAGE
        //client.closeType = String.fromCharCode(u8[off++])
        //client.closeName = readCString(buf, u8, off)
        //off += client.closeName.length + 1
        off += len - 4
        const command = commands.shift()
        if (command.type === 'execQuery' || command.type === 'exec') {
          command.callback()
        }
      } else if (type === 116) {
        // t = ParameterDescription
        const nparams = dv.getInt16(off)
        client.params = []
        off += 2
        for (let i = 0; i < nparams; i++) {
          client.params.push(dv.getUint32(off))
          off += 4
        }
      } else if (type === 49) {
        // 1 = ParseComplete
        off += len - 4
        const command = commands.shift()
        if (command.type === 'prepare') {
          command.callback()
        }
      } else if (type === 68) {
        // D = DataRow
        // GARBAGE
        const cols = dv.getInt16(off)
        off += 2
        const row = []
        for (let i = 0; i < cols; i++) {
          const len = dv.getInt32(off)
          off += 4
          if (!fields.length || fields[i].format === 0) {
            row.push(sys.readString(buf, len, off))
          } else {
            just.print('binary data')
          }
          off += len
        }
        rows.push(row)
        //off += len - 4
      } else if (type === 50) {
        // 2 = BindComplete
        off += len - 4
        if (commands[0].type === 'bind') {
          const command = commands.shift()
          if (command.type === 'bind') {
            command.callback()
          }
        }
        rows.length = 0
      } else if (type === 90) {
        // Z = ReadyForQuery
        client.status = String.fromCharCode(u8[off++])
        if (!client.authenticated) {
          client.authenticated = true
          const command = commands.shift()
          if (command.type === 'md5Auth') {
            command.callback()
          }
        }
      } else if (type === 75) {
        // K = BackendKeyData
        client.pid = dv.getUint32(off)
        off += 4
        client.key = dv.getUint32(off)
        off += 4
      } else {
        off += (len - 4)
      }
    }
  }
  if (event & EPOLLOUT) {
    if (!client.connected) {
      net.setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, 1)
      net.setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, 1)
      client.onConnect(null, client)
      client.connected = true
    }
  }
}

function connect ({ address, port, user, pass, db }, onConnect) {
  const fd = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  loop.add(fd, onSocketEvent, EPOLLIN | EPOLLERR | EPOLLHUP | EPOLLOUT | EPOLLET)
  const buf = new ArrayBuffer(65536)
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)
  const client = { fd, buf, dv, u8, onConnect, address, port, user, pass, db, commands: [], fields: [], parameters: {}, rows: [] }
  const bound = {}
  client.execQuery = (sql, callback) => {
    const len = 6 + sql.length
    dv.setUint8(0, 81) // 'Q'
    dv.setUint32(1, len - 1)
    sys.writeString(buf, sql, 5)
    net.write(fd, buf, len)
    client.commands.push({ type: 'execQuery', callback })
  }
  client.md5Auth = (salt, callback) => {
    const md5 = new ArrayBuffer(16)
    const plain = ArrayBuffer.fromString(`${pass}${user}`)
    let len = crypto.hash(crypto.MD5, plain, md5, plain.byteLength)
    const passwordHash = new ArrayBuffer(36)
    sys.writeString(passwordHash, 'md5', 0)
    len = encode.hexEncode(md5, passwordHash, len, 3)
    const plain2 = new ArrayBuffer(36)
    plain2.copyFrom(passwordHash, 0, 32, 3)
    plain2.copyFrom(salt, 32, 4)
    len = crypto.hash(crypto.MD5, plain2, md5, plain2.byteLength)
    const hash2 = new ArrayBuffer(36)
    sys.writeString(hash2, 'md5', 0)
    len = encode.hexEncode(md5, hash2, len, 3)
    const hash = sys.readString(hash2, len + 3)
    len = hash.length + 5
    let off = 0
    dv.setUint8(off++, 112)
    dv.setUint32(off, len)
    off += 4
    off += sys.writeString(buf, hash, 5)
    dv.setUint8(off++, 0)
    net.write(fd, buf, off)
    client.commands.push({ type: 'md5Auth', callback })
  }
  client.flush = () => {
    dv.setUint8(0, 72) // 'H'
    dv.setUint32(1, 4)
    net.write(fd, buf, 5)
  }
  client.startup = callback => {
    const len = 8 + 4 + 1 + user.length + 1 + 8 + 1 + db.length + 2
    let off = 0
    dv.setInt32(0, 0)
    off += 4
    dv.setInt32(4, 196608)
    off += 4
    off += buf.writeString('user', off)
    dv.setUint8(off++, 0)
    off += buf.writeString(user, off)
    dv.setUint8(off++, 0)
    off += buf.writeString('database', off)
    dv.setUint8(off++, 0)
    off += buf.writeString(db, off)
    dv.setUint8(off++, 0)
    dv.setUint8(off++, 0)
    dv.setInt32(0, off)
    net.write(fd, buf, len)
    client.commands.push({ type: 'startup', callback })
  }
  client.exec = (command, portal = '', maxRows = 0) => {
    const len = 6 + portal.length + 4
    let off = 0
    dv.setUint8(off++, 69) // 'E'
    dv.setUint32(off, len - 1)
    off += 4
    if (portal.length) {
      off += sys.writeString(buf, portal, 5)
    }
    dv.setUint8(off++, 0)
    dv.setUint32(off, maxRows)
    off += 4
    net.write(fd, buf, len)
    if (!bound[portal].complete) {
      bound[portal].buffer.copyFrom(buf, bound[portal].offset, off, 0)
      bound[portal].offset += off
      bound[portal].dv.setUint8(bound[portal].offset, 72) // 'H'
      bound[portal].dv.setUint32(bound[portal].offset + 1, 4)
      bound[portal].complete = true
      client.bound = true
    }
    client.commands.push(command)
  }
  client.bind = (name, params, formats, command, portal = '') => {
    dv.setUint8(0, 66) // 'B'
    let off = 0
    if (portal.length) {
      off = 5
      off += sys.writeString(buf, portal, off)
      dv.setUint8(off++, 0)
      off += sys.writeString(buf, name, off)
      dv.setUint8(off++, 0)
    } else {
      off = 6
      off += sys.writeString(buf, name, off)
      dv.setUint8(off++, 0)
    }
    dv.setUint16(off, formats.length || 0)
    off += 2
    for (let i = 0; i < formats.length; i++) {
      dv.setUint16(off, formats[i])
      off += 2
    }
    dv.setUint16(off, params.length || 0)
    off += 2
    const paramStart = off
    for (let i = 0; i < params.length; i++) {
      if (formats[i] === 1) {
        dv.setUint32(off, 4)
        off += 4
        dv.setUint32(off, params[i])
        off += 4
      } else {
        const paramString = params[i].toString()
        dv.setUint32(off, paramString.length)
        off += 4
        off += sys.writeString(buf, paramString, off)
      }
    }
    dv.setUint16(off, 1)
    off += 2
    dv.setUint16(off, 0)
    off += 2
    dv.setUint32(1, off - 1)
    net.write(fd, buf, off)
    if (!bound[portal]) {
      bound[portal] = { buffer: new ArrayBuffer(off + portal.length + 15) }
      bound[portal].buffer.copyFrom(buf, 0, off, 0)
      bound[portal].offset = off
      bound[portal].paramStart = paramStart
      bound[portal].dv = new DataView(bound[portal].buffer)
    }
    client.commands.push(command)
  }
  client.execBound = (params, command, portal = '') => {
    const { buffer, paramStart, dv } = bound[portal]
    let off = paramStart + 4
    for (let i = 0; i < params.length; i++) {
      dv.setUint32(off, params[i])
      off += 8
    }
    net.write(fd, buffer)
    client.commands.push(command)
  }
  client.describe = (name, type, callback) => {
    const slen = name.length
    const len = 7 + slen
    let off = 0
    dv.setUint8(off++, 68) // 'D'
    dv.setUint32(off, len - 1)
    off += 4
    dv.setUint8(off++, 83) // 'S'
    off += sys.writeString(buf, name, off)
    dv.setUint8(off++, 0)
    net.write(fd, buf, len)
    client.commands.push({ type: 'describe', callback })
  }
  client.prepare = (sql, name, types, callback) => {
    const len = 1 + 4 + sql.length + 1 + name.length + 1 + 2 + (types.length * 4)
    dv.setUint8(0, 80) // 'P'
    dv.setUint32(1, len - 1)
    let off = 5
    off += sys.writeString(buf, name, off)
    dv.setUint8(off++, 0)
    off += sys.writeString(buf, sql, off)
    dv.setUint8(off++, 0)
    dv.setUint16(off, types.length)
    off += 2
    for (let i = 0; i < types.length; i++) {
      dv.setUint32(off, types[i])
      off += 4
    }
    net.write(fd, buf, len)
    client.commands.push({ type: 'prepare', callback })
  }
  clients[fd] = client
  net.connect(fd, address, port)
}

const types = {
  INT4OID: 23
}

module.exports = { connect, types }
