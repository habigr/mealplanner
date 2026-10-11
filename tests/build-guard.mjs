// Static checks on index.html — no browser.
//  • every inline <script> passes `node --check`
//  • no duplicate top-level function definitions (a later one silently replaces the earlier)
//  • file hasn't shrunk >3% vs the last commit (sign that code was deleted by accident)
//  • CSS guard: every selector in css-baseline.json still has a rule. A bad edit once deleted a whole
//    CSS block in TripPlanner and every UI test still passed — this catches that.
//    After an INTENTIONAL CSS removal: `node tests/build-guard.mjs --rebaseline`
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { suite, assert } from './harness.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE = path.join(ROOT, 'tests', 'css-baseline.json')

function cssSelectors(html) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
  const out = new Set()
  for (const m of css.matchAll(/(^|[\s,>+~(])\.([a-zA-Z][\w-]{2,})/g)) out.add(m[2])
  for (const m of css.matchAll(/#([a-zA-Z][\w-]{2,})(?=[\s{,:.>\[])/g)) out.add('#' + m[1])
  return out
}

export default async function run() {
  const { t, done } = suite('build-guard')
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')

  await t('every inline <script> passes node --check', async () => {
    const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim())
    assert(blocks.length > 0, 'no inline scripts found')
    blocks.forEach((src, i) => {
      const f = path.join(os.tmpdir(), `mp-check-${process.pid}-${i}.js`)
      fs.writeFileSync(f, src)
      try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }) }
      catch (e) { throw new Error(`script block ${i}: ${String(e.stderr).split('\n').slice(0, 4).join(' | ')}`) }
      finally { fs.unlinkSync(f) }
    })
  })

  await t('no duplicate function definitions in the app script', async () => {
    const js = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n')
    // Known pre-existing dead duplicates (later definition wins; earlier is dead code). Remove from this
    // list once the dead copy is deleted. Anything NEW fails the build.
    const KNOWN = new Set(['toggleGroceryFilter', 'requestWakeLock', 'releaseWakeLock'])
    const seen = {}, dups = []
    for (const m of js.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) { if (seen[m[1]] && !KNOWN.has(m[1])) dups.push(m[1]); seen[m[1]] = 1 }
    assert(!dups.length, 'duplicates: ' + [...new Set(dups)].join(', '))
  })

  await t('index.html has not shrunk >3% vs last commit', async () => {
    let prev
    try { prev = execFileSync('git', ['show', 'HEAD:index.html'], { cwd: ROOT, maxBuffer: 64 << 20 }).length } catch { return }
    const now = Buffer.byteLength(html)
    assert(now >= prev * 0.97, `shrunk from ${prev} to ${now} bytes`)
  })

  await t('CSS guard: no baseline selector lost its styles', async () => {
    const have = cssSelectors(html)
    if (process.argv.includes('--rebaseline') || !fs.existsSync(BASELINE)) {
      fs.writeFileSync(BASELINE, JSON.stringify([...have].sort(), null, 0).replace(/","/g, '",\n"'))
      console.log(`  (wrote CSS baseline: ${have.size} selectors)`)
      return
    }
    const want = JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
    const lost = want.filter(s => !have.has(s))
    assert(!lost.length, `${lost.length} selectors lost all CSS rules: ${lost.slice(0, 12).join(' ')}${lost.length > 12 ? ' …' : ''} (if intentional: --rebaseline)`)
  })

  await t('APP_VERSION and APP_VERSION_TAG agree', async () => {
    const v = (html.match(/var APP_VERSION='(v\d+)'/) || [])[1]
    const tag = (html.match(/var APP_VERSION_TAG='Meal Planner (v\d+)'/) || [])[1]
    assert(v && v === tag, `APP_VERSION=${v} TAG=${tag}`)
  })

  return done()
}
