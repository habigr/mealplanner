// Dish editor round-trips: opening a dish and saving it must not lose or rewrite anything.
import { openApp, suite, eq, assert } from './harness.mjs'

export default async function run() {
  const { t, done } = suite('editor')
  const app = await openApp({ anthropic: async () => '[]' })
  const { page } = app
  try {
    await t('edit → save keeps every ingredient field (grocery name, aisle, amounts)', async () => {
      const before = await page.evaluate(() => JSON.parse(JSON.stringify(currentEvent.dishes.find(d => d.id === 'dish1').ingredients)))
      await page.evaluate(() => editDish('dish1'))
      await page.waitForTimeout(400)
      await page.evaluate(() => saveDishFromModal())
      await page.waitForTimeout(800)
      const after = await page.evaluate(() => currentEvent.dishes.find(d => d.id === 'dish1').ingredients)
      const pick = a => a.map(i => [i.item.toLowerCase(), i.quantity, i.unit, i.groceryName, i.groceryDept])
      eq(pick(after), pick(before))
    })
    await t('a plain edit → save makes no AI calls (nothing to relabel)', async () => eq(app.calls.anthropic.length, 0))
    await t('a user-set grocery name is never replaced by the AI labeller', async () => {
      const r = await page.evaluate(async () => {
        const ings = [{ item: 'lime juice', groceryName: 'Lime', groceryDept: '' }]
        window.cleanGroceryNames = async items => items.map(() => ({ grocery: 'Lime Juice', dept: 'Produce' }))
        await _cleanIngredientNames(ings)
        return [ings[0].groceryName, ings[0].groceryDept]
      })
      eq(r, ['Lime', 'Produce'])
    })
    await t('dish count unchanged after save', async () => eq(await page.evaluate(() => currentEvent.dishes.length), 2))
    await t('no page errors', async () => eq(app.errors, []))
  } finally { await app.close() }
  return done()
}
