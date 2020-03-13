const { udp, net, args } = just
const { create, parse, getFlags, qtypes, qclasses } = just.require('./dnsParser.js')

async function lookup ({ query = 'www.google.com', address = '8.8.8.8', port = 53 }, buf = new ArrayBuffer(65536)) {
  return new Promise(resolve => {
    const fd = net.socket(net.AF_INET, net.SOCK_DGRAM | net.SOCK_NONBLOCK, 0)
    net.bind(fd, address, port)
    loop.add(fd, (fd, event) => {
      const answer = []
      const len = udp.recvmsg(fd, buf, answer)
      const [address, port] = answer
      const message = { length: len, address, port, message: parse(buf, len) }
      just.print(`received ${len} from ${address}:${port}`)
      loop.remove(fd)
      net.close(fd)
      resolve(message)
    })
    const len = create(query, buf, 1)
    const bytes = udp.sendmsg(fd, buf, address, port, len)
    just.print(`send ${bytes} to ${address}:${port}`)
  })
}

function getAnswer (answer) {
  const { name, ttl, qclass, qtype, ip, cname } = answer
  if (qtype === 1) {
    return `${name.join('.').slice(0, 29).padEnd(30, ' ')}${ttl.toString().padEnd(8, ' ')}${qclasses[qclass].padEnd(4, ' ')}${qtypes[qtype].padEnd(8, ' ')}${ip['0']}.${ip['1']}.${ip['2']}.${ip['3']}`
  } else if (qtype === 5) {
    return `${name.join('.').slice(0, 29).padEnd(30, ' ')}${ttl.toString().padEnd(8, ' ')}${qclasses[qclass].padEnd(4, ' ')}${qtypes[qtype].padEnd(8, ' ')}${cname.join('.')}`
  }
}

const params = {
  query: args[2] || 'www.google.com',
  address: args[3] || '8.8.8.8',
  port: parseInt(args[4] || '53', 10)
}

const start = Date.now()

lookup(params)
  .then(result => {
    const elapsed = Date.now() - start
    const { address, port, message, length } = result
    const { id, ancount, qcount, nscount, arcount, RCODE, opCode, question, answer } = message
    just.print(`; <<>> DiG 9.11.3-1ubuntu1.11-Ubuntu <<>> ${args.query}
;; Got answer:
;; ->>HEADER<<- opcode: ${opCode}, status: ${RCODE}, id: ${id}
;; flags: ${getFlags(message)}; QUESTION: ${qcount}, ANSWER: ${ancount}, AUTHORITY: ${nscount}, ADDITIONAL: ${arcount}

;; QUESTION SECTION:
;${question[0].name.join('.').slice(0, 36).padEnd(37, ' ')}${qclasses[question[0].qclass].padEnd(4, ' ')}${qtypes[question[0].qtype].padEnd(8, ' ')}

;; ANSWER SECTION:
${answer.map(getAnswer).join('\n')}

;; Query time: ${elapsed} msec
;; SERVER: ${address}#${port}(${address})
;; WHEN: ${(new Date()).toUTCString()}
;; MSG SIZE  rcvd: ${length}`)
  })
