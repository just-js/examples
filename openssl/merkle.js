const { crypto } = just.library('crypto', 'openssl.so')
const { encode } = just.library('encode')

const fd = just.fs.open('/dev/urandom')

function getRandom (size = 256) {
  const random = new ArrayBuffer(256)
  const len = just.net.read(fd, random, 0, random.byteLength)
  const result = new ArrayBuffer(len * 2)
  const hexLen = encode.hexEncode(random, result, len)
  return result.readString(hexLen)
}

function createHash (str) {
  const source = ArrayBuffer.fromString(str)
  const dest = new ArrayBuffer(64)
  const hash = crypto.create(crypto.SHA256, source, dest)
  crypto.update(hash, source.byteLength)
  const len = crypto.digest(hash)
  const digest = new ArrayBuffer(len * 2)
  const hexLen = encode.hexEncode(dest, digest, len)
  return digest.readString(hexLen)
}

function merkle (transactions) {
  const len = transactions.length
  if (len % 2 === 1) {
    transactions.push(transactions[transactions.length - 1])
  }
  for (let i = 0; i < len; i += 2) {
    const t1 = transactions[i]
    const t2 = transactions[i + 1]
    const parent = { }
  }
  just.print(transactions.length)
}

function createTransaction (from, to, amount) {
  const ts = Date.now()
  const data = JSON.stringify({ ts, from, to, amount })
  const sig = createHash(data)
  return { data, sig, ts }
}

const tx1 = createTransaction('andrew', 'billy', 10)
const tx2 = createTransaction('billy', 'joe', 2)
const tx3 = createTransaction('billy', 'mary', 2)

merkle([tx1, tx2, tx3])