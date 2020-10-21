const { ffi } = just.library('ffi.so', 'ffi')
const { tcc } = just.library('tcc.so', 'tcc')

const source = `
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

struct foo {
  int id;
  int seq;
  int big;
};
typedef struct foo foo;

int pointer_const (foo* p) {
  p->id = 1;
  p->seq = 2;
  p->big = 4;
  return 0;
}

int far_pointer_const (foo** p) {
  p[0]->id = 1;
  p[0]->seq = 2;
  p[0]->big = 4;
  return 0;
}

int pointer_alloc (foo** p) {
  p[0] = (foo*)calloc(1, sizeof(foo));
  p[0]->id = 1;
  p[0]->seq = 2;
  p[0]->big = 4;
  return 0;
}

int testing (char* str, foo* p, int n) {
  if (p == NULL) {
    fprintf(stderr, "empty\n");
    return 0;
  }
  fprintf(stderr, "c: %s %u\n", str, n);
  //p->id = 1;
  //p->seq = 2;
  //p->big = 4;
  return 0;
}

int testing2 (char* str) {
  fprintf(stderr, "c: %s\n", str);
  str[0] = 50;
  return 0;
}

`

function pointerConst () {
  const fn = tcc.get(code, 'pointer_const')
  const cif = new ArrayBuffer(8)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const backing = new ArrayBuffer(12)
  const dv = new DataView(cif)
  dv.setBigUint64(0, backing.getAddress(), true)
  const r = ffi.ffiCall(cif, fn)
  if (r < 0) return
  return backing
}

function pointerAlloc () {
  const fn = tcc.get(code, 'pointer_alloc')
  const cif = new ArrayBuffer(8)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const ptr = new ArrayBuffer(8)
  const dv = new DataView(cif)
  dv.setBigUint64(0, ptr.getAddress(), true)
  const r = ffi.ffiCall(cif, fn)
  if (r < 0) return
  return ptr
}

function farPointerConst () {
  const fn = tcc.get(code, 'far_pointer_const')
  const cif = new ArrayBuffer(8)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const ptr = new ArrayBuffer(8)
  const backing = new ArrayBuffer(12)
  let dv = new DataView(cif)
  dv.setBigUint64(0, ptr.getAddress(), true)
  dv = new DataView(ptr)
  dv.setBigUint64(0, backing.getAddress(), true)
  const r = ffi.ffiCall(cif, fn)
  if (r < 0) return
  return backing
}

function farPointerAlloc () {
  const fn = tcc.get(code, 'pointer_alloc')
  const cif = new ArrayBuffer(8)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const ptr = new ArrayBuffer(8)
  const backing = new ArrayBuffer(8)
  let dv = new DataView(cif)
  dv.setBigUint64(0, ptr.getAddress(), true)
  dv = new DataView(ptr)
  dv.setBigUint64(0, backing.getAddress(), true)
  const r = ffi.ffiCall(cif, fn)
  if (r < 0) return
  return ptr
}

const code = tcc.compile(source, ['-O3', '-m64', '-fpic', '-fno-inline-small-functions'], [just.sys.cwd()])
if (!code) throw new Error('Could not compile')
tcc.relocate(code)

function testfarPointerConst () {
  const db = farPointerConst()
  const dv = new DataView(db)
  just.print(dv.getUint32(0, true))
  just.print(dv.getUint32(4, true))
  just.print(dv.getUint32(8, true))
}

function testPointerConst () {
  const db = pointerConst()
  const dv = new DataView(db)
  just.print(dv.getUint32(0, true))
  just.print(dv.getUint32(4, true))
  just.print(dv.getUint32(8, true))
}

function testfarPointerAlloc () {
  const db = farPointerAlloc()
  const dv = new DataView(db)

  const ptr = dv.getBigUint64(0, true)
  const b = just.sys.readMemory(ptr, ptr + 12n)
  const dv2 = new DataView(b)
  just.print(dv2.getUint32(0, true))
  just.print(dv2.getUint32(4, true))
  just.print(dv2.getUint32(8, true))
}

function testPointerAlloc () {
  const db = pointerAlloc()
  const dv = new DataView(db)
  const ptr = dv.getBigUint64(0, true)
  just.print(ptr)
  const b = just.sys.readMemory(ptr, ptr + 12n)
  const dv2 = new DataView(b)
  just.print(dv2.getUint32(0, true))
  just.print(dv2.getUint32(4, true))
  just.print(dv2.getUint32(8, true))
}

//testPointerConst()
//testPointerAlloc()
//testfarPointerConst()
//testfarPointerAlloc()

function testing (str) {
  const fn = tcc.get(code, 'testing')
  const cif = new ArrayBuffer(24)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const foo = new ArrayBuffer(16)
  const dv = new DataView(cif)
  dv.setBigUint64(0, str.getAddress(), true)
  dv.setBigUint64(8, foo.getAddress(), true)
  dv.setBigUint64(16, 33n, true)
  //dv.setUint32(16, 33, true)
  const r = ffi.ffiCall(cif, fn)
  if (r < 0) return
  return foo
}

function testing2 (str) {
  const fn = tcc.get(code, 'testing2')
  const cif = new ArrayBuffer(8)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const dv = new DataView(cif)
  dv.setBigUint64(0, str.getAddress(), true)
  return ffi.ffiCall(cif, fn)
}

const hello = ArrayBuffer.fromString('hello')
//testing2(hello)

const foo = testing(hello)
const dv = new DataView(foo)
just.print(dv.getUint32(0, true))
just.print(dv.getUint32(4, true))
just.print(dv.getUint32(8, true))

