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

const testStr = '0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789\n'

function ffiWriteString () {
  const { write } = wrapWrite()
  let i = 0
  const len = just.sys.utf8Length(testStr)
  const fd = just.sys.STDERR_FILENO
  const start = Date.now()
  while (write(fd, testStr, len) === len) {
    if (i++ === 1000000) break
  }
  just.print(Date.now() - start)
}

function nativeWriteString () {
  const write = just.net.writeString
  const len = just.sys.utf8Length(testStr)
  let i = 0
  const fd = just.sys.STDERR_FILENO
  const start = Date.now()
  while (write(fd, testStr) === len) {
    if (i++ === 1000000) break
  }
  just.print(Date.now() - start)
}

function ffiWriteBuffer () {
  const buf = ArrayBuffer.fromString(testStr)
  const len = buf.byteLength
  const { write2 } = wrapWrite(buf, just.sys.STDERR_FILENO)
  let i = 0
  const start = Date.now()
  while (write2() === len) {
    if (i++ === 1000000) break
  }
  just.print(Date.now() - start)
}

function nativeWriteBuffer () {
  const write = () => just.net.write(fd, buf, len)
  let i = 0
  const buf = ArrayBuffer.fromString(testStr)
  const len = buf.byteLength
  const fd = just.sys.STDERR_FILENO
  const start = Date.now()
  while (write() === len) {
    if (i++ === 1000000) break
  }
  just.print(Date.now() - start)
}

function test (fn, runs = 10) {
  just.print(`${AG}${fn.name}${AD}`)
  just.print(just.memoryUsage().rss)
  for (let i = 0; i < runs; i++) {
    fn()
  }
  just.print(just.memoryUsage().rss)
}

// redirect stderr to /dev/null
just.net.dup(just.fs.open('/dev/null', just.fs.O_RDWR), just.sys.STDERR_FILENO)
const runs = parseInt(just.args[2] || '10')

function next () {
  test(ffiWriteString, runs)
  test(nativeWriteString, runs)
  test(ffiWriteBuffer, runs)
  test(nativeWriteBuffer, runs)
  just.setTimeout(next, 100)
}

next()

// do an article on this
/*
on the fly compiled assembly called using ffi within 10% of native
test3 v test4
590 v 630 = ~94%

test for different string sizes
test for different numbers and types of arguments
*/
