const { crypto } = just.library('crypto', 'openssl.so')
const { encode } = just.library('encode')

const algorithms = {
  'sha512': crypto.SHA512,
  'sha256': crypto.SHA256,
  'sha1': crypto.SHA1,
  'md5': crypto.MD5,
  'md4': crypto.MD4,
  'sha224': crypto.SHA224,
  'sha384': crypto.SHA384,
  'ripemd160': crypto.RIPEMD160
}

function checksum (fd, algorithm = crypto.SHA256) {
  const source = new ArrayBuffer(65536)
  const dest = new ArrayBuffer(64)
  const hash = crypto.create(algorithm, source, dest)
  if (hash < 0) throw new Error('Could not create Hash')
  let bytes = just.net.read(fd, source)
  while (bytes > 0) {
    crypto.update(hash, bytes)
    bytes = just.net.read(fd, source)
  }
  if (bytes < 0) throw new just.SystemError('read')
  return just.sys.readString(source, encode.hexEncode(dest, source, crypto.digest(hash)))
}

let fd = just.sys.STDIN_FILENO
let fileName = 'stdin'
if (just.args.length > 2) {
  fileName = just.args[2]
  fd = just.fs.open(fileName)
  if (fd <= 0) throw new just.SystemError('open')
}
const algo = algorithms[just.args[3] || 'sha256']
if (!algo) throw new Error(`Algorithm not found ${just.args[3]}`)
just.print(`${checksum(fd, algo)}  ${fileName}`)
