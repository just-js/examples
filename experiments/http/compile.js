const { compile, save } = just.require('wasm')

async function main () {
  const { wasm } = await compile('parse.wat')
  save('./parse.wasm', wasm)
}

main().catch(err => just.error(err.stack))
