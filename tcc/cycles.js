const { tcc } = just.library('tcc')
const { ffi } = just.library('ffi')

const source = `
#include <x86intrin.h>
#include <stdint.h>
#include <stdio.h>
#include <unistd.h>

uint64_t cycles() {
  return __rdtsc();
}
`
const opts = ['-D_GNU_SOURCE', '-O3']
const includes = []
const libs = []

const code = tcc.compile(source, opts, includes, libs)
if (!code) throw new Error('Could not compile')
tcc.relocate(code)

function wrapCycles () {
  const fn = tcc.get(code, 'cycles')
  const params = []
  const dv = new DataView(new ArrayBuffer(8 * params.length))
  const cif = dv.buffer
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT64, params)
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  function cycles () {
    return ffi.ffiCall(cif, fn)
  }
  return { cycles }
}

const { cycles } = wrapCycles()
just.print(cycles())
