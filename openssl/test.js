const { crypto } = just.library('crypto', 'openssl.so')
const { encode } = just.library('encode')

const fd = just.fs.open('/dev/urandom')
const random = new ArrayBuffer(256)

function getRandom () {
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

/*
just.print(createHash('andrew'))
just.print(getRandom())

just.setInterval(() => {
  just.print(createHash(getRandom()))
}, 1000)
*/
/*
let hash
const start = Date.now()
while (1) {
  hash = createHash(getRandom())
  if (hash.slice(0, 5) === '00000') break
}
just.print(hash)
just.print(Date.now() - start)


const challenge = getRandom()
//just.print(`challenge  : ${challenge}`)
let bits = 4
const needle = '0'.repeat(bits)
let proof
let hash
const start = Date.now()
while (1) {
  proof = getRandom()
  hash = createHash(`${challenge}${proof}`)
  if (hash.slice(0, bits) === needle) break
}
//just.print(`hash       : ${hash}`)
just.print(Date.now() - start)
//just.print(`proof      : ${proof}`)
const proof2 = createHash(`${challenge}${proof}`)
just.print(`verify     : ${proof2}`)


*/

function findProof (challenge, bits = 3) {
  const needle = '0'.repeat(bits)
  let proof
  const start = Date.now()
  while (1) {
    proof = getRandom()
    const hash = createHash(`${challenge}${proof}`)
    if (hash.slice(0, bits) === needle) break
  }
  return { challenge, proof }
}

const { challenge, proof } = findProof(getRandom())
just.print(`verify     : ${createHash(`${challenge}${proof}`)}`)
