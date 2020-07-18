const pids = []

const args = just.args.slice[2]
if (!args.length) args.push('techempower.js')

pids.push(just.sys.spawn('just', just.sys.cwd(), args))
pids.push(just.sys.spawn('just', just.sys.cwd(), args))

just.setInterval(() => {

}, 1000)
