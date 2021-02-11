const { tcc } = just.library('tcc', '../../modules/tcc/tcc.so')
const { ffi } = just.library('ffi', '../../modules/ffi/ffi.so')
const { memory } = just.library('memory', '../../modules/memory/memory.so')
const { dump } = require('@binary')
const source = `
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>

struct frame {
  int id;
};

struct foo {
  int len;
  struct frame* frames;
};

int _foo (struct foo** f, unsigned int i) {
  struct frame* f3 = (struct frame*)calloc(1, sizeof(struct frame));
  f3->id = 699;
  struct foo* f4 = (struct foo*)calloc(1, sizeof(struct foo));
  f4->len = 1;
  f4->frames = f3;
  *f = f4;
  fprintf(stderr, "foo %u\n", i);
  return sizeof(struct foo);
}

int printit (unsigned int a, unsigned int b, unsigned int c) {
  fprintf(stderr, "printit %u %u %u\n", a, b, c);
  return 1;
}
`
const opts = ['-D_GNU_SOURCE']
const includes = []
const libs = []

const code = tcc.compile(source, opts, includes, libs)
if (!code) throw new Error('Could not compile')
tcc.relocate(code)

function wrapPrintIt () {
  const fn = tcc.get(code, 'printit')
  const cif = new ArrayBuffer(32)
  const dv = new DataView(cif)

  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_UINT32, ffi.FFI_TYPE_UINT32, ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const av = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(0, av.buffer.getAddress(), true)
  const bv = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(8, bv.buffer.getAddress(), true)
  const cv = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(16, cv.buffer.getAddress(), true)

  function foo (a = 1, b = 2, c = 3) {
    av.setUint32(0, a, true)
    bv.setUint32(0, b, true)
    cv.setUint32(0, c, true)
    const size = ffi.ffiCall(cif, fn)
    return size
  }

  return foo
}

function wrapFoo () {
  const fn = tcc.get(code, '_foo')
  const cif = new ArrayBuffer(32)
  const dv = new DataView(cif)

  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const pv = new DataView(new ArrayBuffer(8))
  const fpv = new DataView(new ArrayBuffer(8))
  pv.setBigUint64(0, fpv.buffer.getAddress(), true)
  const iv = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(0, pv.buffer.getAddress(), true)
  dv.setBigUint64(8, iv.buffer.getAddress(), true)

  function inspect (address, size) {
    const end = address + BigInt(size)
    const result = just.sys.readMemory(address, end)
    const dv3 = new DataView(result)
    const addr2 = dv3.getBigUint64(8, true)
    const result2 = just.sys.readMemory(addr2, addr2 + 4n)
    const dv4 = new DataView(result2)
    return dv4.getInt32(0, true)
  }

  function foo (i = 100) {
    iv.setUint32(0, i, true)
    const size = ffi.ffiCall(cif, fn)
    return inspect(fpv.getBigUint64(0, true), size)
  }

  return foo
}

just.print(wrapPrintIt()())
just.print(wrapFoo()())
