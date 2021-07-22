const getMethods = (obj) => {
  const properties = new Set()
  let currentObj = obj
  do {
    Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
  } while ((currentObj = Object.getPrototypeOf(currentObj)))
  return [...properties.keys()].filter(item => typeof obj[item] === 'function')
}

function parse (text) {
  try {
    return JSON.parse(text)
  } catch (err) {
    return ''
  }
}

const memo = new Map()

const stringify = (o, sp = '  ') => JSON.stringify(o, (k, v) => {
  if (typeof v === 'object') {
    if (memo.has(v)) return '[circular]'
    memo.set(v)
  }
  if (typeof v === 'bigint') {
    return Number(v)
  }
  if (!v) return
  if (v.constructor && v.constructor.name === 'ArrayBuffer') {
    return `ArrayBuffer [${v.byteLength}]`
  }
  if (v.constructor && v.constructor.name === 'Uint8Array') {
    return `Uint8Array [${v.length}]`
  }
  return v
}, sp)

module.exports = { getMethods, stringify, parse }
