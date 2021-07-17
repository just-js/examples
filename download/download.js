const { download } = require('./fetch.js')

async function main () {
  const [url, fileName] = just.args.slice(2)
  const result = await download(url, fileName)
  just.print(JSON.stringify(result, null, '  '))
}

main().catch(err => just.error(err.stack))
