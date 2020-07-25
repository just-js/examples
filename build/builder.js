const { copyFile } = require('fs')
const { cwd } = just.sys
const { build } = require('../../just/lib/build.js')

const justDir = `${just.env().JUST_HOME || just.sys.cwd()}/.foo`
const config = {
  destination: justDir
}

function run (fileName = 'just') {
  build(config, (err, process) => {
    if (err) return just.error(err.stack)
    const { pid, status } = process
    if (pid < 0) throw new Error(`bad PID ${pid}`)
    if (status !== 0) throw new Error(`bad status ${status}`)
    copyFile(`${justDir}/just`, `${cwd()}/${fileName}`)
  })
}

run('foo')
