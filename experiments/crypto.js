const { crypto, sys, encode } = just
const { writeFile } = just.require('fs')
const source = new ArrayBuffer(1024)

const fd = just.fs.open('/dev/urandom')
just.net.read(fd, source)
writeFile('./random.bin', source)

const dest = new ArrayBuffer(20)
const start = Date.now()
const runs = parseInt(just.args[2] || '1000', 10)
for (let i = 1; i < runs; i++) {
  crypto.hash(crypto.SHA1, source, dest, 1024)
}
const elapsed = Date.now() - start
just.print(runs / (elapsed / 1000))
const hexLength = encode.hexEncode(dest, source, 20)
const str = sys.readString(source, hexLength)
just.print(str)
