const { fetch } = require('@fetch')

async function main () {
  const [url, fileName] = just.args.slice(2)
  const result = await fetch(url, fileName)
  just.print(JSON.stringify(result, null, '  '))
}

main().catch(err => just.error(err.stack))
