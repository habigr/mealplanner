// Smoke: app boots hermetically, every main screen renders real content, built-in regression suite passes.
import { openApp, suite, assert, eq, shot } from './harness.mjs'

export default async function run() {
  const { t, done } = suite('smoke')

  await t('landing page renders (no trip) and is not blank', async () => {
    const app = await openApp({ trip: null })
    try {
      await app.page.waitForTimeout(800)
      const txt = await app.page.evaluate(() => document.body.innerText.trim().length)
      assert(txt > 40, 'landing body text too short: ' + txt)
      eq(app.errors, [], 'page errors')
      await shot(app.page, 'smoke-landing')
    } finally { await app.close() }
  })

  const app = await openApp()
  const { page } = app
  try {
    await t('trip opens from local storage', async () => {
      const name = await page.evaluate(() => currentEvent.name)
      eq(name, 'Test Trip')
    })
    await t('built-in runRegressionTests() 25/25', async () => {
      const r = await page.evaluate(() => window.runRegressionTests())
      const failed = (r.results || []).filter(x => !x.pass && !x.ok).map(x => x.name || x.label || JSON.stringify(x))
      assert(r.fail === 0, 'failed: ' + failed.join('; '))
      assert(r.pass >= 25, 'only ' + r.pass + ' passed')
    })
    await t('meal plan shows both seeded dishes', async () => {
      await page.evaluate(() => navTo('planner'))
      await page.waitForTimeout(300)
      const txt = await page.locator('#planner').innerText()
      assert(txt.includes('Lemon Garlic Salmon'), 'salmon missing from planner')
      assert(txt.includes('Greek Salad'), 'salad missing from planner')
      await shot(page, 'smoke-planner')
    })
    await t('grocery list aggregates seeded ingredients', async () => {
      await page.evaluate(() => navTo('grocery'))
      await page.waitForTimeout(300)
      const rows = await page.evaluate(() => aggregateRows().map(r => r.item || r.name))
      for (const n of ['Salmon', 'Lemon', 'Garlic', 'Cucumber', 'Feta']) assert(rows.some(r => String(r).toLowerCase().includes(n.toLowerCase())), n + ' missing from grocery rows: ' + rows.join(','))
      await shot(page, 'smoke-grocery')
    })
    await t('trip settings renders', async () => {
      await page.evaluate(() => navTo('setup'))
      await page.waitForTimeout(300)
      const len = await page.evaluate(() => document.body.innerText.length)
      assert(len > 100)
      await shot(page, 'smoke-settings')
    })
    await t('tab-bar count badges: the number fits inside its circle', async () => {
      const r = await page.evaluate(() => [...document.querySelectorAll('.bottom-nav .nav-badge')].filter(b => b.offsetParent).map(b => {
        const range = document.createRange(); range.selectNodeContents(b)
        const t = range.getBoundingClientRect(), c = b.getBoundingClientRect(), bw = parseFloat(getComputedStyle(b).borderTopWidth)
        return { text: b.textContent, fits: t.top >= c.top + bw - 0.5 && t.bottom <= c.bottom - bw + 0.5 }
      }))
      assert(r.length >= 1, 'no visible badges to check')
      assert(r.every(x => x.fits), 'clipped: ' + JSON.stringify(r))
    })
    await t('no page errors during the whole session', async () => eq(app.errors, []))
  } finally { await app.close() }

  return done()
}
