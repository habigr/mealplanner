// Device storage: profile photos must live ONCE per person per trip, not copied onto every dish / grocery line.
import { openApp, suite, eq, assert, seedTrip } from './harness.mjs'

export default async function run() {
  const { t, done } = suite('storage')
  const app = await openApp({ trip: seedTrip() })
  const { page } = app
  try {
    // A realistic profile photo: 400px JPEG at 0.92 (what the profile cropper produces), noisy so it doesn't compress away.
    const photo = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d'); for (let i = 0; i < 4000; i++) { x.fillStyle = `hsl(${i * 37 % 360},60%,${30 + i % 50}%)`; x.fillRect(Math.random() * 400, Math.random() * 400, 12, 12) } return c.toDataURL('image/jpeg', 0.92) })
    await t('fixture photo is realistically large (>30 KB)', async () => assert(photo.length > 30000, 'only ' + photo.length))

    // Legacy shape: 2 dishes + 40 checked grocery lines, each carrying its own copy of the photo.
    const before = await page.evaluate(p => {
      currentEvent.dishes.forEach(d => { d.assignedTo = 'Robbie'; d.assignedToInitials = 'RH'; d.assignedToPhoto = p })
      currentEvent.groceryMeta = {}
      for (let i = 0; i < 40; i++) currentEvent.groceryMeta['item' + i] = { status: 'Bought', checkedBy: 'RH', checkedByName: 'Robbie', checkedByPhoto: p }
      return JSON.stringify(currentEvent).length
    }, photo)

    const n = await page.evaluate(async () => { _photoCompactDone = {}; return _maybeCompactTripPhotos(currentEvent.code) })
    const after = await page.evaluate(() => ({
      size: JSON.stringify(currentEvent).length,
      people: Object.keys(currentEvent.people || {}),
      avatarLen: ((currentEvent.people || {}).robbie || {}).photo?.length || 0,
      dishCopies: currentEvent.dishes.filter(d => d.assignedToPhoto).length,
      lineCopies: Object.values(currentEvent.groceryMeta).filter(m => m.checkedByPhoto).length,
      resolved: resolvePersonProfile('Robbie').photo === currentEvent.people.robbie.photo,
      dishes: currentEvent.dishes.length, lines: Object.keys(currentEvent.groceryMeta).length,
      stillBought: Object.values(currentEvent.groceryMeta).filter(m => m.status === 'Bought' && m.checkedByName === 'Robbie').length,
    }))
    await t('legacy copies folded: 42 copies → 1 avatar', async () => { eq(n, 42); eq(after.people, ['robbie']); eq(after.dishCopies, 0); eq(after.lineCopies, 0) })
    await t('the one avatar is small (<12 KB)', async () => assert(after.avatarLen > 500 && after.avatarLen < 12000, 'avatar ' + after.avatarLen))
    await t(`trip shrinks >90% (${Math.round(before / 1024)} KB → ${Math.round(after.size / 1024)} KB)`, async () => assert(after.size < before * 0.1, `${before} → ${after.size}`))
    await t('nothing else lost: same dishes, same lines, still Bought by Robbie', async () => { eq(after.dishes, 2); eq(after.lines, 40); eq(after.stillBought, 40) })
    await t('screens resolve Robbie\'s face from the trip avatar', async () => assert(after.resolved))
    await t('meal plan shows the cook\'s photo, not just initials', async () => {
      await page.evaluate(() => { navTo('planner'); renderAll() })
      await page.waitForTimeout(300)
      const imgs = await page.evaluate(() => [...document.querySelectorAll('#planner img')].filter(i => i.src.startsWith('data:image')).length)
      assert(imgs >= 1, 'no avatar image rendered in planner')
    })

    await t('a NEW check-off stamps the trip avatar instead of copying the photo', async () => {
      const r = await page.evaluate(async p => {
        localStorage.setItem('mealPlanner.user.v1', JSON.stringify({ name: 'Test Cook', initials: 'TC', photo: p }))
        const key = aggregateRows()[0].key // a real grocery line
        updateGroceryMeta(key, 'status', 'Bought')
        await new Promise(r => setTimeout(r, 500))
        return { copy: (currentEvent.groceryMeta[key] || {}).checkedByPhoto, stamped: !!(currentEvent.people['test cook'] || {}).photo }
      }, photo)
      eq(r, { copy: '', stamped: true })
    })
    await t('no page errors', async () => eq(app.errors, []))
  } finally { await app.close() }
  return done()
}
