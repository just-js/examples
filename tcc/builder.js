const buildModule = just.require('../../just/lib/build.js')
const opts = { clean: true, static: true, cleanall: true, dump: true }
const config = just.require('../../just/lib/configure.js').configure('sleep.js', opts)
just.print(JSON.stringify(config, null, '  '))
buildModule.run(config, opts).catch(err => just.error(err.stack))
