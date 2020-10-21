const { compile, ffi } = require('lib/tcc.js')
const { readFile } = require('fs')

const test = compile(readFile('../../sniff.c'), 'main', ffi.FFI_TYPE_UINT32, [])
just.print(test())
