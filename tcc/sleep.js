const { tcc } = just.library('tcc', '../../modules/tcc/tcc.so')
const { ffi } = just.library('ffi', '../../modules/ffi/ffi.so')
const { dump } = require('@binary')
//const { tcc } = just.library('tcc')
//const { ffi } = just.library('ffi')
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

int _foo (struct foo** f, int i) {
  struct frame* f3 = (struct frame*)calloc(1, sizeof(struct frame));
  f3->id = 353;
  struct foo* f4 = (struct foo*)calloc(1, sizeof(struct foo));
  f4->len = 1;
  f4->frames = f3;
  *f = f4;
  fprintf(stderr, "hello %i\n", i);
  return sizeof(struct foo) * i;
}

int _getchar() {
  return getchar();
}

void _sleep (int seconds) {
  fprintf(stderr, "sleep %i\n", seconds);
  sleep(seconds);
}
`
const opts = ['-D_GNU_SOURCE']
const includes = []
const libs = []

const code = tcc.compile(source, opts, includes, libs)
if (!code) throw new Error('Could not compile')
tcc.relocate(code)

function wrapSleep () {
  const fn = tcc.get(code, '_sleep')
  const cif = new ArrayBuffer(32)
  const dv = new DataView(cif)

  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_VOID, [ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }

  function sleep (seconds) {
    dv.setUint32(0, seconds, true)
    ffi.ffiCall(cif, fn)
  }
  return sleep
}

function wrapGetchar () {
  const fn = tcc.get(code, '_getchar')
  const cif = new ArrayBuffer(32)
  const dv = new DataView(cif)

  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }

  function getchar () {
    return ffi.ffiCall(cif, fn)
  }
  return getchar
}

function wrapFoo () {
  const fn = tcc.get(code, '_foo')
  const cif = new ArrayBuffer(32)
  const dv = new DataView(cif)

  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }

  function foo () {
    const b = new ArrayBuffer(8)
    //const dv = new DataView(b)
    dv.setBigUint64(0, b.getAddress(), true)
    just.print(dump(new Uint8Array(b)))
    dv.setUint32(8, 2, false)
    const size = ffi.ffiCall(cif, fn)
    just.print(dump(new Uint8Array(b)))
    const dv2 = new DataView(b)
    const address = dv2.getBigUint64(0, true)
    just.print(address)
    const end = address + BigInt(size)
    const result = just.sys.readMemory(address, end)
    just.print(result.byteLength)
    just.print(dump(new Uint8Array(result)))

    const dv3 = new DataView(result)
    const len = dv3.getUint16(0, true)
    just.print(len)
    const addr2 = dv3.getBigUint64(8, true)
    just.print(addr2)

    const result2 = just.sys.readMemory(addr2, addr2 + 4n)
    just.print(result2.byteLength)
    just.print(dump(new Uint8Array(result2)))
    const dv4 = new DataView(result2)
    just.print(dv4.getInt32(0, true))

    return size
  }
  return foo
}

const sleep = wrapSleep()
const getchar = wrapGetchar()
const foo = wrapFoo()

sleep(5)

/*
let c = 0
while (c = getchar()) {
  just.print(c)
}
*/

just.print(foo())

