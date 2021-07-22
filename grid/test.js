class Parser {
  constructor () {

  }
  parse (buf, bytes, off) {

  }
  writeHeader (buf, off) {

  }
  readHeader (buf, off) {
    
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
    return `ArrayBuffer [${v.length}]`
  }
  if (v.constructor && v.constructor.name === 'Uint8Array') {
    return `Uint8Array [${v.length}]`
  }
  return v
}, sp)


//just.print(JSON.stringify(just, null, '  '))
just.print(stringify(just))
