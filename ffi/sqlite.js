const { ffi } = just.library('ffi')
const handle = just.sys.dlopen('libsqlite3.so')

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
  const fp = new DataView(new ArrayBuffer(8))
  fp.setBigUint64(0, ptr, true)
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
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
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const dv = new DataView(cif)
  const buf = ArrayBuffer.fromString(`${fileName}\0`)
  const fp = new DataView(new ArrayBuffer(8))
  fp.setBigUint64(0, buf.getAddress(), true)
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  const fp3 = new DataView(new ArrayBuffer(8))
  const fp2 = new DataView(new ArrayBuffer(8))
  fp2.setBigUint64(0, fp3.buffer.getAddress(), true)
  dv.setBigUint64(8, fp2.buffer.getAddress(), true)
  const r = ffi.ffiCall(cif, fn)
  if (r < 0) throw new Error('Bad Status')
  return fp2.getBigUint64(0, true)
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
  SQLITE_OK          : 0, // Successful result
  SQLITE_ERROR       : 1, // Generic error
  SQLITE_INTERNAL    : 2, // Internal logic error in SQLite
  SQLITE_PERM        : 3, // Access permission denied
  SQLITE_ABORT       : 4, // Callback routine requested an abort
  SQLITE_BUSY        : 5, // The database file is locked
  SQLITE_LOCKED      : 6, // A table in the database is locked
  SQLITE_NOMEM       : 7, // A malloc() failed
  SQLITE_READONLY    : 8, // Attempt to write a readonly database
  SQLITE_INTERRUPT   : 9, // Operation terminated by sqlite3_interrupt()
  SQLITE_IOERR      : 10, // Some kind of disk I/O error occurred
  SQLITE_CORRUPT    : 11, // The database disk image is malformed
  SQLITE_NOTFOUND   : 12, // Unknown opcode in sqlite3_file_control()
  SQLITE_FULL       : 13, // Insertion failed because database is full
  SQLITE_CANTOPEN   : 14, // Unable to open the database file
  SQLITE_PROTOCOL   : 15, // Database lock protocol error
  SQLITE_EMPTY      : 16, // Internal use only
  SQLITE_SCHEMA     : 17, // The database schema changed
  SQLITE_TOOBIG     : 18, // String or BLOB exceeds size limit
  SQLITE_CONSTRAINT : 19, // Abort due to constraint violation
  SQLITE_MISMATCH   : 20, // Data type mismatch
  SQLITE_MISUSE     : 21, // Library used incorrectly
  SQLITE_NOLFS      : 22, // Uses OS features not supported on host
  SQLITE_AUTH       : 23, // Authorization denied
  SQLITE_FORMAT     : 24, // Not used
  SQLITE_RANGE      : 25, // 2nd parameter to sqlite3_bind out of range
  SQLITE_NOTADB     : 26, // File opened that is not a database file
  SQLITE_NOTICE     : 27, // Notifications from sqlite3_log()
  SQLITE_WARNING    : 28, // Warnings from sqlite3_log()
  SQLITE_ROW        : 100, // sqlite3_step() has another row ready
  SQLITE_DONE       : 101 // sqlite3_step() has finished executing
}

function prepare (db, sql) {
  const fn = just.sys.dlsym(handle, 'sqlite3_prepare_v3')
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(128)
  const dv = new DataView(cif)
  let status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_SINT32, ffi.FFI_TYPE_UINT32, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  // *db
  dv.setBigUint64(0, db, true)
  const str = ArrayBuffer.fromString(`${sql}\0`)
  // *zSql
  const fp = new DataView(new ArrayBuffer(8))
  fp.setBigUint64(0, str.getAddress(), true)
  dv.setBigUint64(8, fp.buffer.getAddress(), true)
  // nByte
  const av = new DataView(new ArrayBuffer(4))
  av.setInt32(0, -1, true)
  dv.setBigUint64(16, av.buffer.getAddress(), true)
  // prepFlags
  const bv = new DataView(new ArrayBuffer(4))
  bv.setUint32(0, 0, true)
  dv.setBigUint64(24, av.buffer.getAddress(), true)
  // **ppStmt
  const pv = new DataView(new ArrayBuffer(8))
  const fpv = new DataView(new ArrayBuffer(8))
  pv.setBigUint64(0, fpv.buffer.getAddress(), true)
  dv.setBigUint64(32, pv.buffer.getAddress(), true)
  // **pzTail
  const qv = new DataView(new ArrayBuffer(8))
  const fqv = new DataView(new ArrayBuffer(8))
  qv.setBigUint64(0, fqv.buffer.getAddress(), true)
  dv.setBigUint64(40, qv.buffer.getAddress(), true)
  status = ffi.ffiCall(cif, fn)
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  return {
    status,
    stmt: fpv.getBigUint64(0, true),
    ztail: fqv.getBigUint64(0, true)
  }
}

function step (address) {
  const fn = just.sys.dlsym(handle, 'sqlite3_step')
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(16)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const fp = new DataView(new ArrayBuffer(8))
  fp.setBigUint64(0, address, true)
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  return ffi.ffiCall(cif, fn)
}

function finalize (address) {
  const fn = just.sys.dlsym(handle, 'sqlite3_finalize')
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(16)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, [ffi.FFI_TYPE_POINTER])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  const fp = new DataView(new ArrayBuffer(8))
  fp.setBigUint64(0, address, true)
  dv.setBigUint64(0, fp.buffer.getAddress(), true)
  return ffi.ffiCall(cif, fn)
}

function exec (address, sql) {
  const fn = just.sys.dlsym(handle, 'sqlite3_exec')
  if (!fn) throw new Error('Could not find symbol')
  const params = [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_POINTER]
  const cif = new ArrayBuffer(8 * params.length)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_UINT32, params)
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  dv.setBigUint64(0, address, true)
  const buf = ArrayBuffer.fromString(`${sql}\0`)
  const fp = new DataView(new ArrayBuffer(8))
  fp.setBigUint64(0, buf.getAddress(), true)
  dv.setBigUint64(8, fp.buffer.getAddress(), true)
  const args = new ArrayBuffer(24)
  dv.setBigUint64(16, args.getAddress(), true)
  dv.setBigUint64(24, args.getAddress() + 8n, true)
  dv.setBigUint64(32, args.getAddress() + 16n, true)
  return ffi.ffiCall(cif, fn)
}

function column_text (address, index) {
  const fn = just.sys.dlsym(handle, 'sqlite3_column_text')
  if (!fn) throw new Error('Could not find symbol')
  const cif = new ArrayBuffer(16)
  const dv = new DataView(cif)
  const status = ffi.ffiPrepCif(cif, ffi.FFI_TYPE_POINTER, [ffi.FFI_TYPE_POINTER, ffi.FFI_TYPE_UINT32])
  if (status !== ffi.FFI_OK) {
    throw new Error(`Bad Status ${status}`)
  }
  // sqlite3_stmt*
  const fp = new DataView(new ArrayBuffer(8))
  fp.setBigUint64(0, address, true)
  dv.setBigUint64(0, fp.buffer.getAddress(), true)

  // iCol
  const av = new DataView(new ArrayBuffer(4))
  av.setInt32(0, index, true)
  dv.setBigUint64(8, av.buffer.getAddress(), true)

  const ptr = ffi.ffiCall(cif, fn)
  const len = strlen(ptr)
  return just.sys.readMemory(ptr, ptr + BigInt(len))
}

let r = 0
just.print(`version ${version()}`)
const db = open('foo.db')
if (!db) throw new Error('Could not open db')
let res

try {
  res = prepare(db, 'CREATE TABLE employee (Name varchar(20),Dept varchar(20),jobTitle varchar(20))')
  just.print(`prepare ${res.status}`)
  just.print(res.stmt)
  just.print(res.ztail)
  r = step(res.stmt)
  just.print(`step ${r}`)
  r = finalize(res.stmt)
  just.print(`finalize ${r}`)
  just.print('table created')
} catch (err) {
  just.print('creating table failed')
}

try {
  res = prepare(db, "INSERT INTO employee(Name, Dept, jobTitle) VALUES('Barney Rubble','Sales','Neighbor')")
  just.print(`prepare ${res.status}`)
  just.print(res.stmt)
  just.print(res.ztail)
  r = step(res.stmt)
  just.print(`step ${r}`)
  r = finalize(res.stmt)
  just.print(`finalize ${r}`)
} catch (err) {
  just.print('inserting record failed')
}

try {
  res = prepare(db, 'SELECT * FROM employee')
  r = step(res.stmt)
  let rows = 0
  while (r === constants.SQLITE_ROW) {
    just.print(`step ${r}`)
    const name = column_text(res.stmt, 0)
    let str = name.readString()
    just.print(`column_text ${str}`)
    const dept = column_text(res.stmt, 1)
    str = dept.readString()
    just.print(`column_text ${str}`)
    const title = column_text(res.stmt, 2)
    str = title.readString()
    just.print(`column_text ${str}`)
    rows++
    r = step(res.stmt)
  }
  r = finalize(res.stmt)
  just.print(`finalize ${r}`)
  just.print(`total rows ${rows}`)
} catch (err) {
  just.print('inserting record failed')
}

r = close(db)
just.print(`close ${r}`)
just.print(just.memoryUsage().rss)
