const { rocksdb } = just.library('../../modules/rocksdb/rocksdb.so', 'rocksdb')
const {
  open,
  close,
  get,
  put,
  createReadOptions,
  createWriteOptions,
  destroyReadOptions,
  destroyWriteOptions,
  destroyOptions,
  createOptions,
  createIfMissing
} = rocksdb
const options = createOptions()
createIfMissing(options, true)
const db = open(options, './testing')
const writeOptions = createWriteOptions()
const readOptions = createReadOptions()
const hello = ArrayBuffer.fromString('hello')
const key = 'hello'
put(db, writeOptions, key, hello)
const buf = get(db, readOptions, key)
just.print(buf.readString(buf.byteLength, 0))
destroyReadOptions(readOptions)
destroyWriteOptions(writeOptions)
destroyOptions(options)
close(db)
just.print(just.memoryUsage().rss)
