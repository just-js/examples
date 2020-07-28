const { download } = require('fetch.js')

async function main () {
  const res = await download(just.args.slice(2))
  just.print(JSON.stringify(res, null, '  '))
}

main().catch(err => just.error(err.stack))
