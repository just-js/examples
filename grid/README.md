can send less data than recordsize
can create a huge record by saving across a block
need to do defrag/moving of data
does the system figure out best way to store/ yes?

get index
put index payload?

put with zero payload is a delete
empty get returns zero payload



replication
get a list of all occupied keys
GET each key
store key in my grid

or
send a replication message
server send you everything

PUT and GET can do multiple keys

address - 64bit
ip = 8 bytes
port = 2 bytes
index = 6 bytes

max index = 2^48 = 281474976710656
this is max number of blocks behind an individual address/endpoint


okapi.io

OK-API
this is an ok api whose name is the same as a pretty cool animal

todo
- allow selecting slice of the block - off, size
- namespacing for having separate grids per user etc. - private grids
- permissioning
- handle writing large buffers and strings
- allow putting and getting at offsets inside the block
- truncate/delete - DONE
- PUT depending on mode - arraybuffer or JS object or text - NOT DOING
- move sock into grid.js - DONE - kept separate but cleaner
- put multi and get multi
- replication
- server/client the same protocol
- local address and remote address
- memory transfer between processes
- routing across multiple machines
- pool of connections
- command line
  - run as shell with remote grid - tcp/unix/
- make unix.js into classes
- web server
- websocket proxy
- api - /{db}/1
  - content negotiation
  - http caching
- put it up on glitch


________________
|              |
|              |
|              |
|              |
|              |
________________


we can easily script this and have a set of commands that are parsed and executed in sequence


https://en.wikipedia.org/wiki/Box-drawing_character


we can do rsync/rdiff
syncing subsets or ranges of data is easy
we can assign ownership of address ranges
need to look at shrinking and growing without disruption
naming services - looking up
useful for p2p with webrtc
for streaming/fast serving of data from memory
should be low latency, especially if you can keep everything in phsyical ram and in page caches
could you build a filesystem on it?
use for storing filesystems and binaries for vms

features
- in memory cache for JS applications
- compiles to WASM - interop story?
- pluggable storage - rocksdb?
- checksumming and verification of data
- tcp, unix sockets, in memory
- websockets and http api
- tls
- shell client
- js module
- glitch
- gitpod



TODO:

- allow just to be built/packaged as a shared object (DSO) and an api exposed that could be called from C to invoke the internal JS code
- serialization - what options? pluggable?


sock api

const sock = createClient()
or
server.onConnect(sock)

sock.close()
sock.isEmpty()
sock.write(buf, len, off)
sock.read(buf, off, len)
sock.resume()
sock.pause()
sock.onClose()
sock.onReadable()
sock.onWritable()
sock.connect()
sock.onSpurious(fd, event)
sock.closing = true | false
sock.fd
sock.close()


server api

const server = createServer()
server.onConnect(sock)
server.bind(path/address, port)
server.listen()

capybara.js
okapi.js



for the vms

each vm requires a 64MB disk image
this image has ip address and dns info burned into it
grid can do throughput of 20-30Gb which is ~3GB a second - way faster than disk
disk images stored in cache
for a /24 subnet, that is 254 images with individual ip details burned in

if we could use memory for the disk image or use a shared mmap's file system for the cache then it would be even better

we can just store the main image once and store the diffs for each machine


cloud for everyone

anyone can run the service
you can host your compute wherever it is available
store your images
run your machines
everything is accounted
everything is encrypted at rest


TODO:
crypto - RSA key generation
crypto - RSA encrypt/decrypt
crypto - symmetric encrypt/decrypt



you encrypt with your RSA pubkey when storing
or we encrypt with our pubkey and can decrypt when running



grid, block, slice

get [0...n](id) [[off, size]...n](slice)
put [0...n](id) [[off, size]...n](slice)


openssl
generate cert
https://github.com/openssl/openssl/blob/master/ssl/statem/statem_lib.c#L272

manipulate cert
https://www.dynamsoft.com/codepool/how-to-use-openssl-generate-rsa-keys-cc.html

encryption and decryption
http://hayageek.com/rsa-encryption-decryption-openssl-c/

