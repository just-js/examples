require('@fetch')
  .fetch(just.args[2])
  .then(res => {
    just.print(JSON.stringify(res.json(), null, '  '))
  })
