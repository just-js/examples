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


todo
- truncate/delete - DONE
- PUT depending on mode - arraybuffer or JS object or text - NOT DOING
- move sock into grid.js
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
