// Shared test harness for the Meal Planner.
//
// HERMETIC BY CONSTRUCTION: the Firebase SDK scripts are aborted, so `db`/`auth` stay null and the app
// runs local-only (every Firebase write path is guarded on `db`). Tests can therefore never read or
// write a real trip. `openApp` ASSERTS this (db === null) before handing the page to a test.
// Every other outbound host is aborted too unless a test stubs it (e.g. api.anthropic.com).
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }

let server, base, browser
export async function start() {
  if (base) return base
  // LIVE=1 runs the same suites against the deployed site (still hermetic: Firebase is blocked).
  if (process.env.LIVE) { base = 'https://habigr.github.io/mealplanner'; browser = await chromium.launch(); return base }
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p === '/') p = '/index.html'
    const f = path.join(ROOT, p)
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end() }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    fs.createReadStream(f).pipe(res)
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch()
  return base
}
export async function stop() {
  if (browser) await browser.close()
  if (server) await new Promise(r => server.close(r))
  browser = server = base = null
}

const iso = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10) }
export const dayISO = (offset = 0) => iso(Date.now() + offset * 86400000)

// A small, realistic trip: 3 days starting today, two dishes with ingredients, one store assignment.
export function seedTrip(over = {}) {
  const d0 = dayISO(0), d1 = dayISO(1), d2 = dayISO(2)
  return {
    code: 'test1', id: 'trip-test1', name: 'Test Trip', location: 'Testville', theme: 'midnight',
    startDate: d0, endDate: d2,
    days: [
      { id: 'day1', date: d0, label: 'Day 1', meals: ['Breakfast', 'Lunch', 'Dinner'] },
      { id: 'day2', date: d1, label: 'Day 2', meals: ['Breakfast', 'Lunch', 'Dinner'] },
      { id: 'day3', date: d2, label: 'Day 3', meals: ['Breakfast', 'Lunch', 'Dinner'] },
    ],
    dishes: [
      { id: 'dish1', dayId: 'day1', meal: 'Dinner', name: 'Lemon Garlic Salmon', servings: 4, peopleEating: 4,
        ingredients: [
          { item: 'salmon fillets', quantity: '2', unit: 'lbs', groceryName: 'Salmon', groceryDept: 'Seafood' },
          { item: 'lemons', quantity: '2', unit: '', groceryName: 'Lemon', groceryDept: 'Produce' },
          { item: 'garlic', quantity: '4', unit: 'cloves', groceryName: 'Garlic', groceryDept: 'Produce' },
        ], steps: ['Heat oven to 400F.', 'Roast salmon 12 minutes.'] },
      { id: 'dish2', dayId: 'day2', meal: 'Lunch', name: 'Greek Salad', servings: 4, peopleEating: 4,
        ingredients: [
          { item: 'cucumber', quantity: '1', unit: '', groceryName: 'Cucumber', groceryDept: 'Produce' },
          { item: 'feta', quantity: '8', unit: 'oz', groceryName: 'Feta', groceryDept: 'Dairy' },
        ], steps: [] },
    ],
    recipeBank: [], groceryMeta: {}, auditLog: {}, manualGroceryItems: [],
    ...over,
  }
}

const BLOCK = [/gstatic\.com\/firebasejs/, /firebaseio\.com/, /cloudfunctions\.net/, /r\.jina\.ai/, /microlink\.io/,
  /spoonacular\.com/, /googleapis\.com/, /pexels\.com/, /api\.anthropic\.com/, /firebaseapp\.com/]

/**
 * Open the app on an iPhone-sized viewport.
 * opts.trip      – trip object to seed (default seedTrip()); null = no trip (landing page)
 * opts.anthropic – async (body) => replyText | fullResponseObject. Stubs api.anthropic.com.
 * opts.routes    – [{ match: RegExp, handle: async (route) => void }] extra stubs
 * opts.apiKey    – seed a fake Anthropic key (default true)
 */
export async function openApp(opts = {}) {
  await start()
  const trip = opts.trip === undefined ? seedTrip() : opts.trip
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: !opts.desktop, hasTouch: !opts.desktop })
  const errors = [], calls = { anthropic: [] }
  await ctx.addInitScript(({ trip, apiKey }) => {
    if (sessionStorage.getItem('__seeded')) return // reloads keep what the app saved
    sessionStorage.setItem('__seeded', '1')
    localStorage.clear()
    localStorage.setItem('mealPlanner.user.v1', JSON.stringify({ name: 'Test Cook', firstName: 'Test' }))
    if (apiKey) localStorage.setItem('mealPlanner.apiKey', 'sk-test-not-real')
    if (trip) {
      localStorage.setItem('mealPlanner.trips.v1', JSON.stringify({ [trip.code]: trip }))
      localStorage.setItem('mealPlanner.deviceTrips.v1', JSON.stringify([trip.code]))
    }
  }, { trip, apiKey: opts.apiKey !== false })
  for (const r of opts.routes || []) await ctx.route(r.match, r.handle)
  await ctx.route(/api\.anthropic\.com/, async route => {
    if (!opts.anthropic) return route.abort()
    const body = JSON.parse(route.request().postData() || '{}')
    calls.anthropic.push(body)
    let out = await opts.anthropic(body)
    if (typeof out === 'string') out = { id: 'msg_test', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', content: [{ type: 'text', text: out }], usage: { input_tokens: 10, output_tokens: 10 } }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) })
  })
  await ctx.route(url => BLOCK.some(b => b.test(url.href)), route => route.abort())
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push('pageerror: ' + e.message))
  page.on('dialog', d => d.accept())
  await page.goto(base + '/' + (trip ? '#trip=' + trip.code : ''))
  await page.waitForFunction(() => document.readyState === 'complete')
  const hermetic = await page.evaluate(() => typeof db !== 'undefined' && db === null && typeof firebase === 'undefined')
  if (!hermetic) { await ctx.close(); throw new Error('HARNESS NOT HERMETIC — Firebase loaded; refusing to run tests') }
  if (trip) await page.waitForFunction(c => window.currentEvent && currentEvent.code === c, trip.code, { timeout: 10000 })
  return { page, ctx, errors, calls, close: () => ctx.close() }
}

// ---- tiny assertion runner -------------------------------------------------
export function suite(name) {
  const results = []
  const t = async (label, fn) => {
    try { await fn(); results.push({ label, ok: true }) }
    catch (e) { results.push({ label, ok: false, err: String(e && e.message || e).split('\n')[0] }) }
  }
  const done = () => {
    const fail = results.filter(r => !r.ok)
    for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label}${r.ok ? '' : '  —  ' + r.err}`)
    console.log(`${name}: ${results.length - fail.length}/${results.length} passed`)
    return { name, total: results.length, failed: fail.length }
  }
  return { t, done }
}
export function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed') }
export function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || 'not equal'}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`) }
export async function shot(page, name) {
  fs.mkdirSync(path.join(ROOT, 'tests', 'out'), { recursive: true })
  const f = path.join(ROOT, 'tests', 'out', name + '.png')
  await page.screenshot({ path: f })
  return f
}
