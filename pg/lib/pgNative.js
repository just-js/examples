const { crypto } = just.library('./openssl.so', 'crypto')
const { net, sys, encode } = just
const { AF_INET, SOCK_STREAM, SOCK_NONBLOCK, SOL_SOCKET, IPPROTO_TCP, TCP_NODELAY, SO_KEEPALIVE } = net
const { EPOLLERR, EPOLLHUP, EPOLLIN, EPOLLOUT, EPOLLET } = just.loop
const { loop } = just.factory

const constants = {
  AuthenticationMD5Password: 5
}

function prepareQuery (sql, name = 'foo', types = []) {
  const len = 1 + 4 + sql.length + 1 + name.length + 1 + 2 + (types.length * 4)
  const buf = new ArrayBuffer(len)
  const dv = new DataView(buf)
  dv.setUint8(0, 80) // 'P'
  dv.setUint32(1, len - 1)
  let off = 5
  sys.writeString(buf, name, off)
  off += name.length + 1
  sys.writeString(buf, sql, off)
  off += sql.length + 1
  dv.setUint16(off, types.length)
  off += 2
  for (let i = 0; i < types.length; i++) {
    dv.setUint32(off, types[i])
    off += 4
  }
  return buf
}

function flush () {
  const buf = new ArrayBuffer(5)
  const dv = new DataView(buf)
  dv.setUint8(0, 72) // 'H'
  dv.setUint32(1, 4)
  return buf
}

function execQuery (sql) {
  const len = 6 + sql.length
  const buf = new ArrayBuffer(len)
  const dv = new DataView(buf)
  dv.setUint8(0, 81) // 'Q'
  dv.setUint32(1, len - 1)
  sys.writeString(buf, sql, 5)
  return buf
}

function sync () {
  const len = 5
  const buf = new ArrayBuffer(len)
  const dv = new DataView(buf)
  dv.setUint8(0, 83) // 'S'
  dv.setUint32(1, len - 1)
  return buf
}

function describeQuery (name = '') {
  const slen = name.length
  const len = 7 + slen
  const buf = new ArrayBuffer(len)
  const dv = new DataView(buf)
  dv.setUint8(0, 68) // 'D'
  dv.setUint32(1, len - 1)
  dv.setUint8(5, 83) // 'S'
  sys.writeString(buf, name, 6)
  return buf
}

function execBoundQuery (portal = '', rows = 0) {
  const len = 6 + portal.length + 4
  const buf = new ArrayBuffer(len)
  const dv = new DataView(buf)
  dv.setUint8(0, 69) // 'E'
  dv.setUint32(1, len - 1)
  if (portal.length) {
    sys.writeString(buf, portal, 5)
  }
  dv.setUint32(len - 4, rows)
  return buf
}

function bindQuery (name, params, formats) {
  const buf = new ArrayBuffer(16384)
  const dv = new DataView(buf)
  dv.setUint8(0, 66) // 'B'
  sys.writeString(buf, name, 6)
  let off = 6 + name.length + 1
  dv.setUint16(off, formats.length || 0)
  off += 2
  for (let i = 0; i < formats.length; i++) {
    dv.setUint16(off, formats[i])
    off += 2
  }
  dv.setUint16(off, params.length || 0)
  off += 2
  for (let i = 0; i < params.length; i++) {
    const paramString = params[i].toString()
    dv.setUint32(off, paramString.length)
    off += 4
    sys.writeString(buf, paramString, off)
    off += paramString.length
  }
  dv.setUint16(off, 1)
  off += 2
  dv.setUint16(off, 0)
  off += 2
  dv.setUint32(1, off - 1)
  return buf.slice(0, off)
}

function startupMessage (user, db) {
  const len = 8 + 4 + 1 + user.length + 1 + 8 + 1 + db.length + 2
  const buf = new ArrayBuffer(len)
  const dv = new DataView(buf)
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
  return buf
}

function md5AuthRequest (user, password, salt) {
  const md5 = new ArrayBuffer(16)
  const plain = ArrayBuffer.fromString(`${password}${user}`)
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
  const buf = new ArrayBuffer(len + 1)
  const dv = new DataView(buf)
  dv.setUint8(0, 112)
  dv.setUint32(1, len)
  sys.writeString(buf, hash, 5)
  return buf
}

function readCString (buf, u8, off, len) {
  const start = off
  let c = u8[off]
  while (c !== 0) {
    len--
    if (len === 0) {
      break
    }
    off++
    c = u8[off]
  }
  return just.sys.readString(buf, off - start, start)
}

function PGConnect (address, port, user, pass, db, onConnect) {
  let started = false
  let connected = false
  const fields = []
  const rows = []
  const client = net.socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0)
  loop.add(client, (fd, event) => {
    if (event & EPOLLERR || event & EPOLLHUP) {
      net.close(fd)
      return
    }
    if (event & EPOLLIN) {
      const buf = new ArrayBuffer(4096)
      const bytes = net.read(fd, buf)
      const dv = new DataView(buf)
      const u8 = new Uint8Array(buf)
      let off = 0
      while (off < bytes) {
        const [type, len] = [String.fromCharCode(dv.getUint8(off)), dv.getInt32(off + 1)]
        off += 5
        if (type === 'R') { // AuthenticationOk
          const method = dv.getInt32(off)
          off += 4
          if (method === constants.AuthenticationMD5Password) {
            const salt = buf.slice(off, off + 4)
            off += 4
            net.write(fd, md5AuthRequest(user, pass, salt))
          }
        } else if (type === 'E') { // ErrorResponse
          let i = len - 5
          let fieldType = u8[off++]
          i--
          const fields = []
          while (fieldType !== 0) {
            const val = readCString(buf, u8, off, i)
            fields.push({ type: fieldType, val })
            off += (val.length + 1)
            i -= (val.length + 1)
            fieldType = u8[off++]
          }
        } else if (type === 'S') { // ParameterStatus
          let i = len - 4
          const key = readCString(buf, u8, off, i)
          off += (key.length + 1)
          i -= (key.length + 1)
          const val = readCString(buf, u8, off, i)
          off += val.length + 1
          i -= (key.length + 1)
        } else if (type === 'K') { // BackendKeyData
          const pid = dv.getInt32(off)
          off += 4
          const key = dv.getInt32(off)
          off += 4
        } else if (type === 'Z') { // ReadForQuery
          const status = String.fromCharCode(u8[off++])
          if (!connected) {
            connected = true
            socket.onConnect(status)
          }
        } else if (type === 'T') { // RowDescription
          const fieldCount = dv.getInt16(off)
          off += 2
          fields.length = 0
          rows.length = 0
          for (let i = 0; i < fieldCount; i++) {
            const name = readCString(buf, u8, off, len)
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
        } else if (type === 'D') { // DataRow
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
        } else if (type === 'C') { // Close
          const closeType = String.fromCharCode(u8[off++])
          const name = readCString(buf, u8, off, len)
          off += name.length + 1
          if (current) {
            current({ fields, rows })
            current = null
          }
          if (pending.length) {
            const { sql, onComplete } = pending.shift()
            current = onComplete
            net.write(client, execQuery(sql))
          }
        } else if (type === '1') { // ParseComplete
          off += (len - 4)
        } else if (type === '2') { // BindComplete
          off += (len - 4)
        } else {
          off += (len - 4)
        }
      }
    }
    if (event & EPOLLOUT) {
      if (!started) {
        net.setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, 1)
        net.setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, 1)
        net.write(fd, startupMessage(user, db))
        started = true
      }
    }
  }, EPOLLIN | EPOLLERR | EPOLLHUP | EPOLLOUT | EPOLLET)

  function query (sql, onComplete) {
    if (current) {
      pending.push({ sql, onComplete })
      return
    }
    current = onComplete
    net.write(client, execQuery(sql))
  }

  net.connect(client, address, port)
  let current
  const pending = []
  const socket = { query, onConnect }
  return socket
}

module.exports = { PGConnect }
