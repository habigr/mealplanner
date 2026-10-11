// Recipe parsing: ingredient lines, quantities/scaling, and schema.org (JSON-LD) recipe extraction.
// Lines here are the shapes real recipe sites publish (NYT, Serious Eats, Bon Appétit, AllRecipes, blogs).
import { openApp, suite, eq, assert } from './harness.mjs'

// [line, quantity, unit, item, packageNote]
const LINES = [
  ['1½ cups flour', '1 1/2', 'cup', 'flour', ''],
  ['1 ½ cups flour', '1 1/2', 'cup', 'flour', ''],
  ['1 1/2 cups whole milk', '1 1/2', 'cup', 'whole milk', ''],
  ['⅓ cup honey', '1/3', 'cup', 'honey', ''],
  ['1/4 teaspoon dried oregano', '1/4', 'tsp', 'dried oregano', ''],
  ['2-3 cloves garlic, minced', '2-3', 'cloves', 'garlic, minced', ''],
  ['2–3 cloves garlic', '2-3', 'cloves', 'garlic', ''],
  ['2 to 3 tablespoons olive oil', '2-3', 'tbsp', 'olive oil', ''],
  ['1 1/2 to 2 cups chicken stock', '1 1/2-2', 'cup', 'chicken stock', ''],
  ['2 tbsp. unsalted butter, softened', '2', 'tbsp', 'unsalted butter, softened', ''],
  ['8 oz. cream cheese, at room temperature', '8', 'oz', 'cream cheese, at room temperature', ''],
  ['1 (14-ounce) can diced tomatoes', '1', 'can', 'diced tomatoes', '(14-oz)'],
  ['2 cans (15 oz each) black beans, drained', '2', 'cans', 'black beans, drained', '(15 oz each)'],
  ['Juice of 1 lemon', '1', '', 'lemon, juiced', ''],
  ['Zest of 2 limes', '2', '', 'limes, zested', ''],
  ['a pinch of red pepper flakes', '1', 'pinch', 'red pepper flakes', ''],
  ['3 large eggs', '3', '', 'large eggs', ''],
  ['1 lb boneless skinless chicken thighs', '1', 'lb', 'boneless skinless chicken thighs', ''],
  ['1.5 kg potatoes', '1.5', 'kg', 'potatoes', ''],
  ['12 ounces penne pasta', '12', 'oz', 'penne pasta', ''],
  ['Kosher salt', '', '', 'kosher salt', ''],
  ['4 Roma tomatoes', '4', '', 'roma tomatoes', ''],
  ['1 small onion, diced', '1', '', 'small onion, diced', ''],
]

export default async function run() {
  const { t, done } = suite('parse')
  const app = await openApp()
  const { page } = app
  try {
    const got = await page.evaluate(ls => ls.map(l => { const p = parseIngLine(l[0]); return [l[0], p.quantity, p.unit, String(p.item).toLowerCase(), p.packageNote || ''] }), LINES)
    for (let i = 0; i < LINES.length; i++) {
      const want = LINES[i].map((x, j) => j === 3 ? x.toLowerCase() : x)
      await t(`ingredient: "${LINES[i][0]}"`, async () => eq(got[i], want))
    }

    await t('quantities: ranges scale both ends, buy math uses the upper bound', async () => {
      const r = await page.evaluate(() => [scaleQty('2-3', 2), scaleQty('1 1/2-2', 2), parseFrac('2-3'), parseFrac('1 1/2'), scaleQty('1/2', 3), parseFrac('1 1/2-2')])
      eq(r, ['4-6', '3-4', 3, 1.5, '1 1/2', 2])
    })

    // ---- schema.org JSON-LD (what the recipe page itself publishes) ----
    const ld = {
      '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage' }, {
        '@type': ['Recipe'], name: 'Grilled Chicken &amp; Peach Salad',
        recipeYield: ['4 to 6', '4 to 6 servings'], totalTime: 'PT1H15M', cookTime: 'PT20M',
        image: [{ '@type': 'ImageObject', url: 'https://example.com/a.jpg' }],
        recipeIngredient: ['1&frac12; lb chicken thighs', '2-3 cloves garlic, minced', '3 peaches'],
        recipeInstructions: [
          { '@type': 'HowToSection', name: 'For the marinade', itemListElement: [{ '@type': 'HowToStep', text: 'Whisk garlic and oil.' }] },
          { '@type': 'HowToSection', name: 'For the salad', itemListElement: [{ '@type': 'HowToStep', text: 'Grill the chicken &amp; peaches.' }] },
        ],
      }],
    }
    const html = `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body></body></html>`
    const r = await page.evaluate(h => _extractRecipeJsonLd(h), html)
    await t('JSON-LD: finds the recipe inside @graph and decodes entities', async () => { assert(r, 'no recipe'); eq(r.name, 'Grilled Chicken & Peach Salad') })
    await t('JSON-LD: servings range "4 to 6" is kept, not turned into 46', async () => eq(r.servings, '4-6'))
    await t('JSON-LD: cook time read from totalTime (1 hr 15 min)', async () => eq(r.cookTime, '1 hr 15 min'))
    await t('JSON-LD: image object url', async () => eq(r.image, 'https://example.com/a.jpg'))
    await t('JSON-LD: ½ entity decoded so the line parses as 1 1/2', async () => eq(r.ingredients[0], '1½ lb chicken thighs'))
    await t('JSON-LD: steps from HowToSections, entities decoded', async () => eq(r.steps, ['Whisk garlic and oil.', 'Grill the chicken & peaches.']))

    const noSteps = `<script type="application/ld+json">${JSON.stringify({ '@type': 'Recipe', name: 'Pantry Pasta', recipeIngredient: ['1 lb pasta', '2 tbsp butter'], recipeYield: '4' })}</script>`
    const r2 = await page.evaluate(h => _extractRecipeJsonLd(h), noSteps)
    await t('JSON-LD: a recipe with ingredients but no steps is still used (not thrown away)', async () => { assert(r2, 'recipe discarded'); eq(r2.ingredients.length, 2); eq(r2.servings, '4') })

    await t('no page errors', async () => eq(app.errors, []))
  } finally { await app.close() }
  return done()
}
