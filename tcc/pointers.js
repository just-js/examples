const { compile, get, ffi, tcc } = require('lib/tcc.js')

function wrap (code, name, returnType, argTypes) {
  const cif = new ArrayBuffer(32)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, returnType, argTypes)
  if (status !== ffi.FFI_OK) throw new Error(`Bad Status ${status}`)
  const fn = tcc.get(code, name)
  let wrapper
  if (returnType === ffi.FFI_TYPE_UINT32) {
    wrapper = v => {
      dv.setUint32(0, v, true)
      return ffi.ffiCall(cif, fn)
    }
    wrapper[Symbol('cif')] = cif
    return wrapper
  } else if (returnType === ffi.FFI_TYPE_DOUBLE) {
    wrapper = v => {
      dv.setFloat32(0, v, true)
      return ffi.ffiCall(cif, fn)
    }
    wrapper[Symbol('cif')] = cif
    return wrapper
  } else if (returnType === ffi.FFI_TYPE_POINTER) {
    wrapper = buf => {
      dv.setBigUint64(0, buf.getAddress(), true)
      return ffi.ffiCall(cif, fn)
    }
    wrapper[Symbol('cif')] = cif
    return wrapper
  }
}

const source = `
#include <stdint.h>
#include <stdio.h>

uint32_t fib (uint32_t n) {
  if (n <= 1) return 1;
  return fib(n - 1) + fib(n - 2);
}

int foo () {
  return 99;
}

void* check (void* ptr) {
  fprintf(stderr, "%lu %s\n", (uint64_t)ptr, (char*)ptr);
  char* str = (char*)ptr;
  str[0] = 'i';
  str[4] = 'i';
  return ptr;
}

int allocate (void* ptr) {

}
`

const module = compile(source)

//const fib = get(module, 'fib', ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_UINT32])
//just.print(fib(1))

//const foo = get(module, 'foo', ffi.FFI_TYPE_UINT32, [])
//just.print(foo())

//const allocate = wrap(module, 'allocate', ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])

/*
const check = get(module, 'check', ffi.FFI_TYPE_POINTER, [ffi.FFI_TYPE_POINTER])
const str = 'hello'
const buf = ArrayBuffer.fromString(str)
const address = check(buf, buf.byteLength)
just.print(address)
just.print(buf.readString(buf.byteLength))
*/
/*
const start = address
const end = address + BigInt(buf.byteLength)
const mem = just.sys.readMemory(start, end)
const u8 = new Uint8Array(mem)
just.print(u8[0])
just.print(u8[1])
just.print(u8[2])
just.print(u8[3])
just.print(u8[4])
just.print(mem.byteLength)
just.print(just.sys.readString(mem, 0, 4))
//just.print(just.sys.readMemory(address, address + BigInt(buf.byteLength)).readString(buf.byteLength))
*/
