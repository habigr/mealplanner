# GROCERY + SHOPPING UI — PRESERVATION CHECKLIST

> Purpose: the modern redesign is a **visual skin only**. Every item below EXISTS today and MUST survive the redesign. This is the spec the new grocery/shop screens are held to — if a redesign drops any line here, that's a bug, not a simplification. (Audited from index.html, 2026-07-03.)

## Three modes (tab switch — `setGroceryMode`)
- **List** · **Assign Stores** · **Shop** — must stay three distinct modes.

## List view — per-item data shown
- Item name (plural-aware) — tap opens the **item sheet**
- Quantity + unit (aggregated across dishes)
- **Dish pills** — which dishes use it. **List view: display-only** (info labels, no tap) since v148 — edit routes through item name → item sheet (one edit path). ⚠️ The **Assign-Stores grid** still has tap-to-edit pills (`editDish`); OPEN DECISION (Robbie 2026-07-03) whether to make those info-only too for consistency + retire the now-dead `pickDishIngredient`.
- Store tag(s) — every assigned store
- Inline store dropdown (reassign without leaving the row)
- **Status**: Need / Bought / Have (dropdown) — not just a checkbox
- Quick ✓ checkbox
- Badges: **possible-duplicate**, **multi-store**, **manual item** (with edit/delete)
- Mixed-units hint ("tap to set amount") when units don't combine
- Department/section grouping with **department icons** + per-section headers

## List view — controls
- Progress card (emoji + bar + %, "X of Y", 100% celebration)
- Sort: **Store / Department / A–Z**
- "Needed only" filter
- Add manual item · Export/Share as text · Sync/refresh · Clear filters
- Filter panel: **search box**, department dropdown, store dropdown
- Row **swipe**: right = check, left = uncheck
- Grocery nav badge (count of Need items)

## Item sheet (tap an item)
- Recipe items: list each **source dish** (name + its amount), tap → edit that dish, returns to sheet
- **Quantity tally**: "From dishes" + "Your adjustment (± signed delta)" + "Total to buy", −/+ stepper
- Manual items: editable name (autocomplete) + "how many to buy" + Remove
- Save writes to `groceryMeta` (store, status, buyDelta/buyQty, unit)

## Store assignment
- Auto-guess via `storeRules` + remembered per-name store memory
- Inline per-row store change; **Assign Stores** grid mode (checkbox per store, keyboard nav 1–9/arrows/space, "X left to assign", bulk-assign visible, DUP badge for multi-store)
- Unassigned always visible/pinned
- Active-stores filtering; store rules editor (add/delete/update)

## Shop mode (list)
- Sections grouped by store, **Unassigned pinned top**, collapsible, "X/Y done" per section
- Item: check, name (+DUP), department, quantity, **"who bought?" avatar + name** (green when it's you)
- Store filter chips, search (with "add as new item" when no match), progress "X left · Y of Z", **Hide Done** toggle
- Reset all check-offs

## Shop mode (immersive overlay — `startShoppingMode`)
- Full-screen one-item-at-a-time: big quantity, big name, department+icon
- Progress dots, **✓ Got it** / **Skip**, swipe right=got/left=skip
- **Wake lock** (screen stays on), auto re-acquire on return

## Consolidation
- Cross-unit "how many to buy" via AI (Haiku), cached in `groceryMeta._consol` (buyQty/buyUnit/note)
- Signed-delta override rides along when the suggestion changes
- Fallback "2 cups + 1 oz" parts pile if not yet consolidated
- ⚠️ Known bug to fix separately (same-unit not summing: "1 pt + 3 pt" → should be "4 pt")

## Data / sync
- `groceryMeta` per-item: store(s), status, checkedBy/name/photo/at, buyDelta/buyQty, department, `_consol`
- Audit trail on status changes; `saveGroceryStateNow`; `reconcileGroceryMeta` migration (⚠️ store-drop-on-edit bug = backlog #10)

---
**Rule for the redesign:** restyle the presentation, keep 100% of the above. Anything intentionally changed gets called out to Robbie first — never dropped silently.
