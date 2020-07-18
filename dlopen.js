just.print(BigInt(just.hrtime()) - BigInt(just.START))
const { http } = just.library('../modules/picohttp/http.so', 'http')
just.print(JSON.stringify(Object.getOwnPropertyNames(http)))
