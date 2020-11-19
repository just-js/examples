const { watch, launch } = require('process')
await(watch(launch('tail', ['-f', '/var/log/syslog'])))
just.print('done')