const { createServer, createClient } = require('lib/tcp.js')
const { lookup } = require('lib/lookup.js')
const { createParser } = require('lib/http.js')

module.exports = { createServer, createClient, lookup, createParser }
