//const { tcc } = just.library('tcc', '../../modules/tcc/tcc.so')
//const { ffi } = just.library('ffi', '../../modules/ffi/ffi.so')
const { tcc } = just.library('tcc')
const { ffi } = just.library('ffi')
const source = `
#include <unistd.h>

void _sleep (int seconds) {
  sleep(seconds);
}
`
const opts = ['-D_GNU_SOURCE']
const includes = []
const libs = []

const code = tcc.compile(source, opts, includes, libs)
if (!code) throw new Error('Could not compile')
tcc.relocate(code)
const fn = tcc.get(code, '_sleep')
const cif = new ArrayBuffer(128)
const dv = new DataView(cif)
const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_VOID, [ffi.FFI_TYPE_UINT32])
if (status !== ffi.FFI_OK) {
  throw new Error(`Bad Status ${status}`)
}
function sleep (seconds) {
  dv.setUint32(0, seconds, true)
  ffi.ffiCall(cif, fn)
}
sleep(1)
