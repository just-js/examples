const { tcc } = just.library('tcc')
const { ffi } = just.library('ffi')

const source = `
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>

int _putchar(int c) {
  return putchar(c);
}

int _getchar() {
  return getchar();
}

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

function wrapSleep () {
  const fn = tcc.get(code, '_sleep')
  const cif = new ArrayBuffer(8)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_VOID, [ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const fp = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  function sleep (seconds) {
    fp.setUint32(0, seconds, true)
    ffi.ffiCall(cif, fn)
  }
  return sleep
}

function wrapPutchar () {
  const fn = tcc.get(code, '_putchar')
  const cif = new ArrayBuffer(8)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const fp = new DataView(new ArrayBuffer(4))
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  function putchar (c) {
    fp.setUint32(0, c, true)
    ffi.ffiCall(cif, fn)
  }
  return putchar
}

function wrapGetchar () {
  const fn = tcc.get(code, '_getchar')
  const cif = new ArrayBuffer(0)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  return () => ffi.ffiCall(cif, fn)
}

const sleep = wrapSleep()
const getchar = wrapGetchar()
const putchar = wrapPutchar()

sleep(2)

const ICANON = 2
const ECHO = 8

const flags = just.sys.getTerminalFlags(just.sys.STDIN_FILENO)

function enableRawMode () {
  const newflags = flags & ~(ECHO | ICANON)
  just.sys.setTerminalFlags(just.sys.STDIN_FILENO, newflags)
}

function disableRawMode () {
  just.sys.setTerminalFlags(just.sys.STDIN_FILENO, flags)
}

enableRawMode()

const excl = '!'.charCodeAt(0)

let c = getchar()
while (c) {
  if (c === excl) break
  putchar(c)
  c = getchar()
}

global.onExit = () => {
  just.print('exit')
  disableRawMode()
}
