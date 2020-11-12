## Server

- Get up and Running in VSCode

```bash
just server.js
```

Basic HTTP Server example. Listens on 127.0.0.1:3000

- / - returns a 404
- /json - returns a 200 with request as the json payload
- /async - returns the same json payload with a delay of a second

### TODO

- signal handling - clean shutdown
- POST/PUT bodies
- chunked encoding in bodies
- cookies, etc. etc.
- async for pipelined requests- tricky
- backpressure - pause/resume
- path routing
- query string parsing
- encodings
- multipart
- host routing
- etc. etc.
- error handling
- tests/fuzzing
- add d.ts typescript definitions for intellisense

## Client

### TODO

- write the client - see examples/download
