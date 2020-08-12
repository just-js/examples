const constants = {
  AuthenticationMD5Password: 5,
  fieldTypes: {
    INT4OID: 23,
    VARCHAROID: 1043
  },
  messageTypes: {
    Backend: {
      AuthenticationOk: 82,
      ErrorResponse: 69,
      RowDescription: 84,
      CommandComplete: 67,
      ParseComplete: 49,
      BindComplete: 50,
      ReadyForQuery: 90,
      BackendKeyData: 75,
      ParameterStatus: 83,
      ParameterDescription: 116,
      DataRow: 68,
      Prepare: 80,
      Flush: 72,
      Bind: 66
    },
    Frontend: {
      StartupMessage: 0,
      PasswordMessage: 112,
      Exec: 69,
      Describe: 68,
      Prepare: 80,
      Bind: 66,
      Sync: 83
    }
  }
}

const ANSI_GREEN = '\u001b[32m'
const ANSI_DEFAULT = '\u001b[0m'
const pbuf = new ArrayBuffer(65536)

function pretty (buf, bytes, roff = 0) {
  const u8 = new Uint8Array(buf, roff, bytes)
  let off = 0
  off += pbuf.writeString(`${(0).toString(16).padStart(8, '0')}: `, off)
  for (let i = 0; i < u8.length; i++) {
    if (i > 0 && i % 16 === 0) {
      off += pbuf.writeString('\n', off)
      off += pbuf.writeString(`${i.toString(16).padStart(8, '0')}: `, off)
    }
    const c = u8[i]
    if (c >= 32 && c <= 126) {
      off += pbuf.writeString(`${ANSI_GREEN}${String.fromCharCode(c).padStart(2, ' ')}${ANSI_DEFAULT} `, off)
    } else {
      off += pbuf.writeString(`${u8[i].toString(16).padStart(2, '0')} `, off)
    }
  }
  off += pbuf.writeString('\n', off)
  return pbuf.slice(0, off)
}

function getMessageName (type, endpoint) {
  const code = String.fromCharCode(type)
  let name = ''
  if (endpoint === 'B') {
    Object.keys(constants.messageTypes.Backend).some(key => {
      if (constants.messageTypes.Backend[key] === type) {
        name = key
        return true
      }
    })
  } else {
    Object.keys(constants.messageTypes.Frontend).some(key => {
      if (constants.messageTypes.Frontend[key] === type) {
        name = key
        return true
      }
    })
  }
  return { type, code, name }
}

function parse (buf, bytes, endpoint) {
  const dv = new DataView(buf, 0, bytes)
  let off = 0
  while (off < bytes) {
    const type = dv.getUint8(off)
    const message = getMessageName(type, endpoint)
    if (type === 0) {
      message.len = dv.getUint32(off)
    } else {
      message.len = dv.getUint32(off + 1)
    }
    just.print(JSON.stringify(message))
    just.net.write(just.sys.STDOUT_FILENO, pretty(buf, message.len + 1, off))
    off += message.len + 1
  }
}

module.exports = { parse }
