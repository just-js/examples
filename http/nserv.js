require('http').createServer((req, res) => {
  const { url } = req
  if (url === '/json') {
    const { method, url, headers } = req
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ method, url, headers }))
    return
  }
  if (url === '/async') {
    const { method, url, headers } = req
    setTimeout(() => {
      res.end(JSON.stringify({ method, url, headers }))
    }, 1000)
    return
  }
  res.statusCode = 404
  res.end()
}).listen(3000)
