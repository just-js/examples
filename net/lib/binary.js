const AD = '\u001b[0m' // ANSI Default
const AY = '\u001b[33m' // ANSI Yellow
const AM = '\u001b[35m' // ANSI Magenta
const AC = '\u001b[36m' // ANSI Cyan
const AG = '\u001b[32m' // ANSI Green

function dump (bytes, len = bytes.length, off = 0, width = 16, pos = 0) {
  const result = []
  const chars = []
  for (let i = 0; i < len; i++) {
    if (i % width === 0) {
      if (i === 0) {
        result.push('')
      } else {
        result.push(` ${chars.join('')}\n`)
        chars.length = 0
      }
    }
    if (i % 8 === 0) {
      result.push(`${AG}${i.toString().padStart(5, ' ')}${AD}`)
    }
    result.push(` ${bytes[i].toString(16).padStart(2, '0')}`)
    if (bytes[i] >= 32 && bytes[i] <= 126) {
      chars.push(`${AC}${String.fromCharCode(bytes[i])}${AD}`)
    } else {
      chars.push('.')
    }
  }
  const remaining = width - (len % width)
  if (remaining === width) {
    result.push(` ${chars.join('')}\n`)
  } else if (remaining < 8) {
    result.push(`${'   '.repeat(remaining)} ${chars.join('')}\n`)
  } else {
    result.push(`${'   '.repeat(remaining)}      ${chars.join('')}\n`)
  }
  return result.join('')
}

function b2ipv4 (v) {
  return `${v >> 24 & 0xff}.${v >> 16 & 0xff}.${v >> 8 & 0xff}.${v & 0xff}`
}

function ipv42b (v) {
  const [b0, b1, b2, b3] = v.split('.').map(o => parseInt(o, 10))
  return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3
}

function toMAC (u8) {
  return Array.prototype.map.call(u8, v => v.toString(16).padStart(2, '0')).join('-')
}

function htons16 (n) {
  const u16 = n & 0xffff
  return (u16 & 0xff) << 8 + (u16 >> 8)
}

function getFlags (flags) {
  return Object.keys(flags).filter(v => flags[v])
}

const ANSI = { AD, AY, AM, AC, AG }
module.exports = { dump, ANSI, getFlags, htons16, toMAC, ipv42b, b2ipv4 }
