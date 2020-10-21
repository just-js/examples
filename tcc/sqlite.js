/*
const ref = require('ref')
const ffi = require('../')

const dbName = process.argv[2] || 'test.sqlite3'
const sqlite3 = 'void'
const sqlite3Ptr = ref.refType(sqlite3)
const sqlite3PtrPtr = ref.refType(sqlite3Ptr)
const sqlite3_exec_callback = 'pointer'
const stringPtr = ref.refType('string')
const SQLite3 = ffi.Library('libsqlite3', {
  sqlite3_libversion: ['string', []],
  sqlite3_open: ['int', ['string', sqlite3PtrPtr]],
  sqlite3_close: ['int', [sqlite3Ptr]],
  sqlite3_changes: ['int', [sqlite3Ptr]],
  sqlite3_exec: ['int', [sqlite3Ptr, 'string', sqlite3_exec_callback, 'void *', stringPtr]]
})
console.log('Using libsqlite3 version %j...', SQLite3.sqlite3_libversion())
var db = ref.alloc(sqlite3PtrPtr)
console.log('Opening %j...', dbName)
SQLite3.sqlite3_open(dbName, db)
db = db.deref()
console.log('Creating and/or clearing foo table...')
SQLite3.sqlite3_exec(db, 'CREATE TABLE foo (bar VARCHAR);', null, null, null)
SQLite3.sqlite3_exec(db, 'DELETE FROM foo;', null, null, null)
console.log('Inserting bar 5 times...')
for (var i = 0; i < 5; i++) {
  SQLite3.sqlite3_exec(db, 'INSERT INTO foo VALUES(\'baz' + i + '\');', null, null, null)
}
*/

const { ffi } = just.library('ffi.so', 'ffi')
const handle = just.sys.dlopen('/usr/lib/x86_64-linux-gnu/libsqlite3.so')
if (!handle) throw new Error('Clould not create handle')

function strlen (ptr) {
  const fn = just.sys.dlsym(handle, 'strlen')
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(8)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  dv.setBigUint64(0, ptr, true)
  return ffi.ffiCall(cif, fn)
}

function version () {
  const fn = just.sys.dlsym(handle, 'sqlite3_libversion')
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(8)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_POINTER, [])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const ptr = ffi.ffiCall(cif, fn)
  const len = strlen(ptr)
  return just.sys.readMemory(ptr, ptr + BigInt(len)).readString(len)
}

function open (fileName) {
  const fn = just.sys.dlsym(handle, 'sqlite3_open')
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(16)
  const ptr = new ArrayBuffer(8)
  let dv = new DataView(cif)
  const buf = ArrayBuffer.fromString(fileName)
  dv.setBigUint64(0, buf.getAddress(), true)
  dv.setBigUint64(8, ptr.getAddress(), true)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const r = ffi.ffiCall(cif, fn)
  if (r < 0) return
  return dv.getBigUint64(0, true)
}

function close (address) {
  const fn = just.sys.dlsym(handle, 'sqlite3_close')
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(16)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  dv.setBigUint64(0, address, true)
  return ffi.ffiCall(cif, fn)
}

const constants = {
  SQLITE_MISUSE: 21,
  SQLITE_OK: 0
}

function prepare (address, sql) {
  const fn = just.sys.dlsym(handle, 'sqlite3_prepare_v3')
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(40)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_UINT32, ffi.FFI_TYPE_UINT32, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const str = ArrayBuffer.fromString(sql)
  const stmt = new ArrayBuffer(8)
  dv.setBigUint64(0, address, true)
  dv.setBigUint64(8, str.getAddress(), true)
  dv.setUint32(16, -1)
  dv.setUint32(20, 0)
  dv.setBigUint64(24, stmt.getAddress(), true)
  dv.setBigUint64(32, 0n, true)
  return ffi.ffiCall(cif, fn)
}

let r = 0
just.print(version())
const db = open(':memory:')
if (!db) throw new Error('Could not open db')
r = prepare(db, 'SELECT 1 + 1;')
just.print(r)
r = close(db)
just.print(r)
