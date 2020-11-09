const type = 'module'

const files = [
  'lib/tcp.js',
  'lib/dns.js',
  'lib/http.js',
  'lib/lookup.js'
]

const capabilities = []

const modules = [{
  name: 'http',
  obj: [
    'modules/http/http.o',
    'modules/http/picohttpparser.o'
  ]
}]

module.exports = { type, files, modules, capabilities }
