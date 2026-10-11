// READ-ONLY look at the live Meal Planner database. It can only issue HTTP GETs (no set/update/delete
// exists in this file) and prints SIZES and COUNTS, not trip contents.
//   node tests/prod-read.mjs sizes          → every trip: total size, # embedded photos, biggest fields
//   node tests/prod-read.mjs trip <code>    → one trip broken down by top-level field
const DB = 'https://meal-planning-app-e4651-default-rtdb.firebaseio.com'
const get = async p => { const r = await fetch(`${DB}/${p}.json`, { method: 'GET' }); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json() }
const kb = n => (n / 1024).toFixed(0) + ' KB'
const imgs = s => (s.match(/data:image/g) || []).length

function breakdown(trip) {
  const rows = Object.entries(trip || {}).map(([k, v]) => { const s = JSON.stringify(v) || ''; return [k, s.length, imgs(s)] })
  return rows.sort((a, b) => b[1] - a[1])
}

const [cmd, arg] = process.argv.slice(2)
if (cmd === 'trip') {
  const t = await get('trips/' + encodeURIComponent(arg))
  const s = JSON.stringify(t); console.log(`${arg}: ${kb(s.length)}, ${imgs(s)} embedded photos`)
  for (const [k, n, i] of breakdown(t).slice(0, 12)) console.log(`  ${k.padEnd(22)} ${kb(n).padStart(8)}  photos:${i}`)
  // where the photos live, by field name
  const where = {}; (function walk(o, path) { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (typeof v === 'string' && v.startsWith('data:image')) { const key = path.replace(/\/[^/]*$/, '/*') + '.' + k; where[key] = (where[key] || 0) + v.length } else walk(v, path + '/' + k) } })(t, '')
  console.log('  photo bytes by field:'); for (const [k, n] of Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`    ${kb(n).padStart(8)}  ${k}`)
} else {
  const codes = Object.keys((await (await fetch(`${DB}/trips.json?shallow=true`, { method: 'GET' })).json()) || {})
  console.log(`${codes.length} trips`)
  const out = []
  for (const c of codes) { const s = JSON.stringify(await get('trips/' + encodeURIComponent(c))); out.push([c, s.length, imgs(s)]) }
  for (const [c, n, i] of out.sort((a, b) => b[1] - a[1])) console.log(`  ${c.padEnd(28)} ${kb(n).padStart(8)}  photos:${i}`)
}
