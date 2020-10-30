let size = 0
const { stdin } = process
stdin.on('readable', () => {
  let chunk
  while ((chunk = stdin.read())) size += chunk.length
})
stdin.on('end', () => {
  console.log(size)
})
stdin.on('error', err => {
  console.error(err.stack)
})
