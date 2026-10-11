// Runs every suite. Usage: node tests/run-all.mjs [suiteName ...]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { stop } from './harness.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const only = process.argv.slice(2)
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mjs') && !['harness.mjs', 'run-all.mjs'].includes(f))
  .filter(f => !only.length || only.includes(f.replace('.mjs', '')))
  // Only import real suites — importing a module RUNS it, so never pick up a stray script.
  .filter(f => /export default async function run\(/.test(fs.readFileSync(path.join(dir, f), 'utf8')))
let total = 0, failed = 0
for (const f of files) {
  console.log(`\n== ${f}`)
  try {
    const r = await (await import(pathToFileURL(path.join(dir, f)))).default()
    total += r.total; failed += r.failed
  } catch (e) { console.log('  SUITE CRASHED: ' + e.message); failed++ }
}
await stop()
console.log(`\nALL SUITES: ${total - failed}/${total} passed${failed ? ' — ' + failed + ' FAILED' : ''}`)
process.exit(failed ? 1 : 0)
