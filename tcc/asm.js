const { tcc } = just.library('tcc')
const { ffi } = just.library('ffi')
const { ANSI } = require('@binary')
const { AD, AG } = ANSI

const source = `
#include <unistd.h>
#include <asm/unistd.h>

ssize_t just_write(int fd, const void *buf, size_t size)
{
    ssize_t ret;
    asm volatile
    (
        "syscall"
        : "=a" (ret)
        : "0"(1), "D"(fd), "S"(buf), "d"(size)
        : "rcx", "r11", "memory"
    );
    return ret;
}
`
const opts = ['-D_GNU_SOURCE', '-O3']
const includes = []
const libs = []

const code = tcc.compile(source, opts, includes, libs)
if (!code) throw new Error('Could not compile')
tcc.relocate(code)
/*
function wrapWrite () {
  const fn = tcc.get(code, 'just_write')
  const params = [ffi.FFI_TYPE_UINT32, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_UINT32]
  const dv = new DataView(new ArrayBuffer(8 * params.length))
  const cif = dv.buffer
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, params)
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const fdv = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(0, fdv.buffer.getAddress(), true)
  const bufv = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(8, bufv.buffer.getAddress(), true)
  const sizev = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(16, sizev.buffer.getAddress(), true)
  function write (fd, str, len = just.sys.utf8Length(str)) {
    fdv.setUint32(0, fd, true)
    bufv.setBigUint64(0, ArrayBuffer.fromString(str).getAddress(), true)
    sizev.setUint32(0, len, true)
    return ffi.ffiCall(cif, fn)
  }
  return write
}
*/
function wrapWrite (buf, fd) {
  const fn = tcc.get(code, 'just_write')
  const params = [ffi.FFI_TYPE_UINT32, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_UINT32]
  const dv = new DataView(new ArrayBuffer(8 * params.length))
  const cif = dv.buffer
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, params)
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const fdv = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(0, fdv.buffer.getAddress(), true)
  const bufv = new DataView(new ArrayBuffer(8))
  dv.setBigUint64(8, bufv.buffer.getAddress(), true)
  const sizev = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(16, sizev.buffer.getAddress(), true)
  if (fd) {
    fdv.setUint32(0, fd, true)
  }
  if (buf) {
    bufv.setBigUint64(0, buf.getAddress(), true)
    sizev.setUint32(0, buf.byteLength, true)
  }
  function write2 () {
    return ffi.ffiCall(cif, fn)
  }
  function write (fd, str, len = just.sys.utf8Length(str)) {
    fdv.setUint32(0, fd, true)
    bufv.setBigUint64(0, ArrayBuffer.fromString(str).getAddress(), true)
    sizev.setUint32(0, len, true)
    return ffi.ffiCall(cif, fn)
  }
  return { write, write2 }
}

function ffiWriteString () {
  const { write } = wrapWrite()
  let i = 0
  const str = 'hello\n'
  const len = just.sys.utf8Length(str)
  const fd = just.sys.STDERR_FILENO
  const start = Date.now()
  while (write(fd, str, len) === 6) {
    if (i++ === 1000000) break
  }
  just.print(Date.now() - start)
}

function nativeWriteString () {
  const write = just.net.writeString
  let i = 0
  const str = 'hello\n'
  const fd = just.sys.STDERR_FILENO
  const start = Date.now()
  while (write(fd, str) === 6) {
    if (i++ === 1000000) break
  }
  just.print(Date.now() - start)
}

function ffiWriteBuffer () {
  const buf = ArrayBuffer.fromString('hello\n')
  const { write2 } = wrapWrite(buf, just.sys.STDERR_FILENO)
  let i = 0
  const start = Date.now()
  while (write2() === 6) {
    if (i++ === 1000000) break
  }
  just.print(Date.now() - start)
}

function nativeWriteBuffer () {
  const write = () => just.net.write(fd, buf)
  let i = 0
  const str = 'hello\n'
  const buf = ArrayBuffer.fromString(str)
  const fd = just.sys.STDERR_FILENO
  const start = Date.now()
  while (write() === 6) {
    if (i++ === 1000000) break
  }
  just.print(Date.now() - start)
}

function test (fn, runs = 10) {
  just.print(`${AG}fn.name${AD}`)
  just.print(just.memoryUsage().rss)
  for (let i = 0; i < runs; i++) {
    fn()
  }
  just.print(just.memoryUsage().rss)
}

test(ffiWriteString)
test(nativeWriteString)
test(ffiWriteBuffer)
test(nativeWriteBuffer)

// do an article on this
/*

on the fly compiled assembly called using ffi within 10% of native
test3 v test4
590 v 630 = ~94%

test for different string sizes
test for different numbers of arguments

*/
