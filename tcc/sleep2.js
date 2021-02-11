const { ffi } = just.library('ffi', '../../modules/ffi/ffi.so')
const { dump } = require('@binary')

const handle = just.sys.dlopen('../../../sqlite/build/.libs/libsqlite3.so')
if (!handle) throw new Error('Clould not create handle')

function wrapOpen () {
  const fn = just.sys.dlsym(handle, 'sqlite3_open')
  const cif = new ArrayBuffer(16)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  function open (fileName) {
    const path = ArrayBuffer.fromString(fileName)
    const db = new ArrayBuffer(8)
    just.print(`cif:      ${cif.getAddress().toString(16)}`)
    just.print(`fileName: ${path.getAddress().toString(16)}`)
    dv.setBigUint64(0, path.getAddress(), true)
    dv.setBigUint64(8, db.getAddress(), true)
    just.print('cif:')
    just.print(dump(new Uint8Array(cif)))
    just.print(dump(new Uint8Array(db)))
    const status = ffi.ffiCall(cif, fn)
    if (status !== 0) throw new Error('Bad Status')
    just.print('cif:')
    just.print(dump(new Uint8Array(cif)))
    just.print(dump(new Uint8Array(db)))
    return dv.getBigUint64(0, true)
  }
  return open
}

function wrapClose () {
  const fn = just.sys.dlsym(handle, 'sqlite3_close')
  const cif = new ArrayBuffer(8)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  function close (db) {
    just.print(`cif:      ${cif.getAddress().toString(16)}`)
    dv.setBigUint64(0, db, true)
    just.print('cif:')
    just.print(dump(new Uint8Array(cif)))
    const status = ffi.ffiCall(cif, fn)
    if (status !== 0) throw new Error('Bad Status')
    just.print('cif:')
    just.print(dump(new Uint8Array(cif)))
    return status
  }
  return close
}

const open = wrapOpen()
const close = wrapClose()

const db = open('foo.willybang.bar')

const r = close(db)
just.print(r)
