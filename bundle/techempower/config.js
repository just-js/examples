const files = [
  'lib/md5.js',
  'lib/tcp.js',
  'lib/dns.js',
  'lib/pg.js',
  'lib/http.js',
  'lib/lookup.js',
  'lib/monitor.js',
  'lib/stringify.js',
  'lib/connection.js'
]

const version = '0.0.1'

const capabilities = [] // list of allowed internal modules, api calls etc. TBD

const modules = [{
  name: 'http',
  obj: [
    'modules/http/http.o',
    'modules/http/picohttpparser.o'
  ]
}, {
  name: 'html',
  obj: [
    'modules/html/html.o'
  ]
}]

module.exports = { version, files, modules, capabilities }
