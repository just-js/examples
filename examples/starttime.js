const now = just.sys.hrtime(new BigUint64Array(1))[0]
just.print(just.START)
just.print(now)
just.print(now - just.START)
