/**
 * Utility function to generate an array of N values populated with provided
 * map function. There seems to be no simpler/quicker way to do this in JS.
 * @param {string} n     - Size of the array to create
 * @param {string} field - The map function which will create each array value
 */
function sprayer (max = 100) {
  const ar = [0]
  for (let i = 0; i < max; i++) {
    ar[i + 1] = (new Array(i + 1)).fill(1)
  }
  return (n, fn) => ar[n % (max + 1)].map(fn)
}

/**
 * Stringify replacement for pretty printing JS objects
 */

let memo = new Map()

function replacer (k, v) {
  try {
    if (typeof v === 'object') {
      if (memo.has(v)) return '<repeat>'
      memo.set(v)
    }
    if (typeof v === 'bigint') {
      return Number(v)
    }
    if (!v) {
      if (typeof v !== 'boolean' && typeof v !== 'number') return '<empty>'
    }
    if (v.constructor && v.constructor.name === 'ArrayBuffer') {
      return 'ArrayBuffer ' + v.byteLength
    }
    if (v.constructor && v.constructor.name === 'Uint8Array') {
      return 'Uint8Array ' + v.length
    }
  } catch (err) {
    just.error(`${AR}error in stringify replacer${AD}\n${err.stack}`)
  }
  return v
}

const { ANSI } = require('@binary')
const { AD, AG, AR, AB, AM, AC, AY } = ANSI

const stringify = (o, sp = '  ') => {
  memo = new Map()
  const text = JSON.stringify(o, replacer, sp)
  if (!text) return
  return text.replace(/\s{8}"(.+)":/g, `        ${AB}$1${AD}:`)
    .replace(/\s{6}"(.+)":/g, `      ${AC}$1${AD}:`)
    .replace(/\s{4}"(.+)":/g, `    ${AG}$1${AD}:`)
    .replace(/\s\s"(.+)":/g, `  ${AY}$1${AD}:`)
    .replace(/([{}])/g, `${AM}$1${AD}`)
    .replace(/\[(.+)\]/g, `${AG}[${AD}$1${AG}]${AD}`)
    .replace(/"<empty>"/g, `${AC}<empty>${AD}`)
    .replace(/"<repeat>"/g, `${AC}<repeat>${AD}`)
}

/**
 * Postgres Helper for Generating bulk update SQL Starement
 */

const postgres = require('@pg')

/**
 * Generate a Bulk Update SQL statement definition which can be passed to
 * sock.create. For a given table, identity column and column to be updated, it 
 * will generate a single SQL statement to update all fields in one statement
 *
 * @param {string} table   - The name of the table
 * @param {string} field   - The name of the field we want to update
 * @param {string} id      - The name of the id field
 * @param {string} updates - The number of rows to update in the statement
 * @param {string} type    - The name of the table
 */
function generateBulkUpdate (table, field, id, updates = 5, type = postgres.constants.BinaryInt) {
  function getIds (count) {
    const updates = []
    for (let i = 1; i < (count * 2); i += 2) {
      updates.push(`$${i}`)
    }
    return updates.join(',')
  }
  function getClauses (count) {
    const clauses = []
    for (let i = 1; i < (count * 2); i += 2) {
      clauses.push(`when $${i} then $${i + 1}`)
    }
    return clauses.join('\n')
  }
  const formats = [type]
  const sql = []
  sql.push(`update ${table} set ${field} = CASE ${id}`)
  sql.push(getClauses(updates))
  sql.push(`else ${field}`)
  sql.push(`end where ${id} in (${getIds(updates)})`)
  return { formats, name: `${table}.${updates}`, params: updates * 2, sql: sql.join('\n') }
}

function sortByMessage (a, b) {
  if (a.message > b.message) return 1
  if (a.message < b.message) return -1
  return 0
}

module.exports = { stringify, sprayer, generateBulkUpdate, sortByMessage }
