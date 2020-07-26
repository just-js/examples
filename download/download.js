const { fetch } = require('./fetch.js')

function download (args) {
  const url = args[0]
  const fileName = args[1] || './download.tar.gz'
  const socket = fetch(url, fileName)
  const file = { fileName }
  const { buf } = socket
  socket.onSecure = () => {
    socket.write(buf, buf.writeString(`GET ${socket.path} HTTP/1.0\r\nUser-Agent: curl/7.58.0\r\nAccept: */*\r\nHost: ${socket.hostname}\r\n\r\n`))
  }
  socket.onResponse = res => {
    if (res.statusCode === 200) {
      file.fd = just.fs.open(fileName, just.fs.O_WRONLY | just.fs.O_CREAT | just.fs.O_TRUNC)
      if (file.fd < 3) {
        socket.error = new Error(`failed to open output file ${fileName}`)
        socket.close()
        return
      }
      //just.print(JSON.stringify(res.headers, null, '  '))
      const contentLength = parseInt(res.headers['Content-Length'] || 0, 10)
      if (contentLength === 0) return socket.close()
      let total = 0
      const timer = just.setInterval(() => {
        just.print(`${total.toString().padStart(12, ' ')} of ${contentLength}`)
      }, 100)
      socket.onData = (bytes) => {
        just.net.write(file.fd, buf, bytes, buf.offset)
        total += bytes
        if (total === contentLength) {
          just.print(`fetched ${url} to ${fileName} ${total} bytes`)
          just.net.close(file.fd)
          just.clearInterval(timer)
          socket.close()
        }
        buf.offset = 0
      }
      if (buf.offset > 0) {
        just.net.write(file.fd, buf, buf.remaining, buf.offset)
        total += buf.remaining
      }
      buf.offset = 0
      delete socket.parser
    }
  }
  socket.onClose = () => {
    delete socket.parser
    if (socket.onEnd) socket.onEnd(socket.error)
  }
  return socket
}

async function main () {
  download(just.args.slice(2))
    .onEnd = (err) => {
      if (err) return just.print(err.stack)
    }
}

main().catch(err => just.error(err.stack))
