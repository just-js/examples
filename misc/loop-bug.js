function fixed () {
  return new Promise((resolve, reject) => {
    const timer = just.setInterval(() => {
      resolve()
      // if i dont do nextTick here, when the handle closes, the loop will break and so the next microTask will not run
      just.sys.nextTick(() => just.clearInterval(timer))
    }, 100)
  })
}

function broken () {
  return new Promise((resolve, reject) => {
    const timer = just.setInterval(() => {
      just.clearInterval(timer)
      resolve()
    }, 1)
  })
}

async function run () {
  await broken()
  just.print('test 1')
  await broken()
  just.print('test 2')
}

run()
