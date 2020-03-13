const { crypto, sys, encode } = just
const source = new ArrayBuffer(1024)
const len = sys.writeString(source, 'hello')
const dest = new ArrayBuffer(20)
crypto.hash(crypto.SHA1, source, dest, len)
const hexLength = encode.hexEncode(dest, source, 20)
const str = sys.readString(source, hexLength)
just.print(str)

const b = ArrayBuffer.fromString('hello')
just.print(b.byteLength)
const u8 = new Uint8Array(b)
just.print(u8)
just.print(b.readString(5, 0))

const b1 = new ArrayBuffer(20)
sys.writeString(b1, 'goodbye', 5)
just.print(sys.readString(b1, 7, 5))
just.print(b1.readString(7, 5))

const b2 = new ArrayBuffer(20)
b2.writeString('piggy', 8)
just.print(b2.readString(5, 8))
