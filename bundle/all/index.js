function testLib (name, lib) {
  just.print(`testing ${name}`)
  const library = just.library(`${lib || name}.so`, name)
  just.print(JSON.stringify(Object.getOwnPropertyNames(library[name]), null, '  '))
}

testLib('html')
testLib('http')
testLib('blake3')
testLib('zlib')
testLib('ffi')
testLib('tcc')
testLib('crypto', 'openssl')
testLib('tls', 'openssl')
testLib('pg')
