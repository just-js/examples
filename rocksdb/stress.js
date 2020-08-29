const { rocksdb } = just.library('../../modules/rocksdb/rocksdb.so', 'rocksdb')
const {
  open,
  get,
  put,
  createReadOptions,
  createWriteOptions,
  createOptions,
  createIfMissing
} = rocksdb

const options = createOptions()
createIfMissing(options, true)
const db = open(options, '/dev/shm/rocksdb-testing')
const writeOptions = createWriteOptions()
const readOptions = createReadOptions()

function benchPut (count = 100000) {
  const hello = ArrayBuffer.fromString('0123456789ABCDEF'.repeat(64))
  const key = Math.ceil(Math.random() * 10000)
  const start = Date.now()
  for (let i = 0; i < count; i++) {
    put(db, writeOptions, key, hello)
  }
  const elapsed = (Date.now() - start) / 1000
  const rate = count / elapsed
  just.print(`put rate ${rate} rss ${just.memoryUsage().rss}`)
  just.setTimeout(benchPut, 10)
}

function benchGet (count = 100000) {
  const key = Math.ceil(Math.random() * 10000)
  const start = Date.now()
  for (let i = 0; i < count; i++) {
    get(db, readOptions, key)
  }
  const elapsed = (Date.now() - start) / 1000
  const rate = count / elapsed
  just.print(`get rate ${rate} rss ${just.memoryUsage().rss}`)
  just.setTimeout(benchGet, 10)
}

//benchPut()
benchGet()
