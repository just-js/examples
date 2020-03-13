const { compile, save, evaluate, createMemory } = just.require('wasm')
const { loop } = just.factory

async function main () {
  const fileName = just.path.join(just.path.baseName(just.path.scriptName), './parse.wat')
  const { wasm } = await compile(fileName)
  save('./parse.wasm', wasm)
  const memory = createMemory({ initial: 20 })
  const { buffer } = memory
  just.print(buffer.byteLength)
  const startData = 16384
  const context = { }
  let requests = 0
  const { parse } = evaluate(wasm, context, memory)
  const str = 'GET / HTTP/1.1\r\nHost: foo\r\n\r\n'.repeat(1024)
  const len = buffer.writeString(str, startData)
  function test () {
    for (let i = 0; i < 1000; i++) {
      for (let j = 0; j < 10000; j++) {
        requests += parse(startData, len + startData)
      }
      loop.poll(0)
      just.sys.runMicroTasks()
    }
  }
  just.setInterval(() => {
    const rss = just.memoryUsage().rss
    just.print(`rps ${requests} mem ${rss}`)
    requests = 0
  }, 1000)
  while (1) {
    test()
  }
}

main().catch(err => just.error(err.stack))
