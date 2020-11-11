// https://atakua.org/old-wp/wp-content/uploads/2015/03/libelf-by-example-20100112.pdf
const buf = require('fs').readFileBytes('/proc/self/exe')
const dv = new DataView(buf)
const u8 = new Uint8Array(buf)
const magic = u8.slice(0, 16)
const first = u8[0]
if (first !== 127) throw new Error('Bad First Byte')
const elf = buf.readString(3, 1)
if (elf !== 'ELF') throw new Error('Not Elf')
const cls = u8[4] === 2 ? 'ELF64' : 'ELF32'
const endianness = u8[5]
const version = u8[6]
const osabi = u8[7]
const abiversion = u8[8]
const type = dv.getUint16(16, true) === 1 ? 'REL' : 'DYN'
const machine = dv.getUint16(18, true)
just.print(JSON.stringify({
  first,
  elf,
  cls,
  endianness,
  version,
  osabi,
  abiversion,
  magic,
  type,
  machine
}, null, '  '))
