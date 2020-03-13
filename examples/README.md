# Environment

## count.js

counts the bytes piped to stdin. uses the event loop and non blocking sockets
```bash
$ dd if=/dev/zero bs=65536 count=1000000 | just examples/count.js
1000000+0 records in
1000000+0 records out
65536000000 bytes (66 GB, 61 GiB) copied, 13.5417 s, 4.8 GB/s
38 Gbit/sec
```

## count-sync.js

synchronous version of count.js. no event loop. just standard blocking calls
```bash
$ dd if=/dev/zero bs=65536 count=1000000 | just examples/count-sync.js
1000000+0 records in
1000000+0 records out
65536000000 bytes (66 GB, 61 GiB) copied, 13.4929 s, 4.9 GB/s
38 Gbit/sec
```

## server.js

dumb tcp web server for benchmarking. uses event loop, sockets, timers
- 245k non pipelined rps

## unixserver.js

dumb unix domain socket web server for benchmarking. uses event loop, sockets, timers
- 392k non pipelined rps

## client.js

tcp http client to stress the server with 128 clients
- 245k non pipelined rps

## unixclient.js

unix domain socket http client to stress the server with 128 clients
- 392k non pipelined rps

## read.js

synchronous reading of /dev/zero from filesystem
```bash
$ just examples/read.js 100000
152 Gbit/sec
{
  "rss": 17022976,
  "total_heap_size": 3166208,
  "used_heap_size": 610556,
  "external_memory": 274816,
  "heap_size_limit": 1493172224,
  "total_available_size": 1491831024,
  "total_heap_size_executable": 573440,
  "total_physical_size": 1724396
}
```

## starttime.js

displays the time to js being active
- 4ms for initial isolate
- 1.5ms for subsequent isolates

## httpd.js

tcp http server using picohttpparser
- 235k non pipelined rps with headers parsed
- 130k non pipelined rps with headers fully converted to JS

## httpc.js

tcp http client using picohttpparser
- 235k non pipelined rps with headers parsed
- 130k non pipelined rps with headers fully converted to JS

## thread.js

- spawns and waits for as many threads as possible in a tight loop
- processes event loop between runs

## thread-ipc.js

- spawns a thread with a shared buffer and a socketpair fd
- sends data over the pipe to the thread
- makes atomic reads and writes on the shared buffer

## child.js

- spawn a child process and read stdin and stderr

## loop.js

- run multiple event loops

## http-simple-client.js

- synchronous http get request

## udp.js

- sending and receiving inet dgrams

## signal.js

- blocking and intercepting signals on the event loop

## gzip.js

- same as gzip -c. reads uncompressed input from stdin and writes compressed output to stdout

```bash
tar -cv --to-stdout scratch/ | just experiments/gzip.js | just experiments/gunzip.js | wc -c
time dd if=/dev/zero bs=65536 count=10000 | just --trace-gc experiments/gzip.js | just --trace-gc experiments/gunzip.js | wc -c
```

## gunzip.js

- same as gzip -d. reads compressed input from stdin and writes uncompressed output to stdout

```bash
tar -cv --to-stdout scratch/ | just experiments/gzip.js | just experiments/gunzip.js | wc -c
time dd if=/dev/zero bs=65536 count=10000 | just --trace-gc experiments/gzip.js | just --trace-gc experiments/gunzip.js | wc -c
```
