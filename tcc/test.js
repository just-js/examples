const { ffi } = just.library('ffi.so', 'ffi')
const { tcc } = just.library('tcc.so', 'tcc')
const source = `
#include <stdint.h>

uint32_t fib(uint32_t n) {
  if (n <= 1) return 1;
  return fib(n - 1) + fib(n - 2);
}
`
const code = tcc.compile(source, ['-O3', '-m64', '-fpic', '-fno-inline-small-functions'], [just.sys.cwd()])
if (!code) throw new Error('Could not compile')

const handle = just.sys.dlopen()
if (!handle) throw new Error('Clould not create handle')
const printf = just.sys.dlsym(handle, 'printf')
if (!printf) throw new Error('Could not find symbol')

tcc.add(code, 'log', printf)
tcc.relocate(code)

const fn = tcc.get(code, 'fib')
if (!fn) throw new Error('Could not find symbol')

function prepareFib () {
  const cif = new ArrayBuffer(4)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  let last = 0
  function fib (v) {
    if (v !== last) {
      dv.setUint32(0, v, true)
      last = v
    }
    return ffi.ffiCall(cif, fn)
  }
  return fib
}

function jsFib (n) {
  if (n <= 1) return 1
  return jsFib(n - 1) + jsFib(n - 2)
}

function run (runs, val, fn, name) {
  const start = Date.now()
  let total = 0
  for (let i = 0; i < runs; i++) {
    total += fn(val)
  }
  if (total === 100) {
    just.print('hello')
  }
  const elapsed = Date.now() - start
  just.print(`${elapsed} ${name.padEnd(10, ' ')}${Math.floor(runs / (elapsed / 1000))}`)
}

const ffiFib = prepareFib()
const bindingFib = ffi.fib
const val = parseInt(just.args[2] || '1')
const iter = parseInt(just.args[3] || '1000000')
tcc.destroy(code)
just.sys.dlclose(handle)

while (1) {
  //run(iter, val, jsFib, 'js')
  //run(iter, val, ffiFib, 'ffi')
  run(iter, val, bindingFib, 'binding')
  just.sys.runMicroTasks()
}
