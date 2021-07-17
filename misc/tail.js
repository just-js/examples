const { watch, launch } = require('process')
watch(launch('tail', ['-f', '/var/log/syslog'])).then(() => {
  just.print('done')
})
