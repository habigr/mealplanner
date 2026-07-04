# MEAL PLANNER — CLAUDE.md

> **Docs layout (read this first):** This file = the rules + current state + what's next. Full per-version history lives in **CHANGELOG.md**. Full verbose detail for every backlog item lives in **BACKLOG.md** (the ACTIVE WORK index below is one line per item — open BACKLOG.md for the full spec before working an item). Keep this file slim so it loads fast every session.

## HIGHEST PRIORITY — NON-NEGOTIABLE

No data loss under any circumstances. There is real live trip data in Firebase. **EVERY trip is equally sensitive and protected — none may EVER be deleted, overwritten, or corrupted under any circumstances (Robbie, 2026-07-03: "FIP is not the only trip I care about anymore — each trip needs to be equally considered sensitive").** FIP 2026 (called out 2026-06-06) is still live data but no longer the *only* protected trip. Never test data/sync/save/Firebase changes against ANY real trip; use a dedicated throwaway test trip and back up first. Because there's no "safe" real trip, redesign/reskin work stays visual-only (CSS/markup), never touching the data/save/sync layer.

Before touching any sync, save, or Firebase logic:
- Never write an empty dishes array to Firebase
- Never overwrite a trip with fewer dishes than currently stored
- Never delete or modify groceryMeta without preserving store assignments
- validateBeforeFirebaseWrite must pass before any Firebase write
- If any operation might risk data, stop and ask before proceeding

Before any build touching sync or save logic, read the current Firebase data structure and confirm the fix cannot overwrite real data with empty or stale data.

---

## SESSION RULES

At the start of every session:
- Read this entire CLAUDE.md file completely
- Run git log to confirm current live version
- Next version = current live version + 1, never reuse a version number
- Confirm what is in progress before starting anything new
- Do not start building until you know exactly what version you are on

At the end of every session:
- Update this file to reflect what was completed, tested, what failed, and what is next (keep it slim — full detail goes to CHANGELOG.md / BACKLOG.md)
- Add a one-line entry per shipped version to CHANGELOG.md; move closed backlog items to BACKLOG.md's closed section
- Update the ACTIVE WORK index + NEXT SESSION below with current priority order
- Robbie will say "session done, update CLAUDE.md" as the signal to do this

---

## PROJECT CONTEXT

- Single HTML file PWA — index.html
- Firebase project: meal-planning-app-e4651
- Live URL: habigr.github.io/mealplanner
- GitHub: habigr/mealplanner
- No framework, no build step, no bundler
- Firebase Realtime Database for sync
- GitHub Pages for hosting — auto-deploys on git push
- All JavaScript in one file, var-based globals, string-based innerHTML rendering

---

## ARCHITECTURE — DO NOT BREAK

- TripStore wrapper exists around currentEvent/currentCode — do not remove globals, 200+ read sites still use them directly
- _isApplyingRemoteChange flag prevents ping-pong sync loop — do not remove
- _isLoadingTrip flag prevents timestamp inflation on initial load — do not remove
- validateBeforeFirebaseWrite runs before every Firebase write — do not bypass
- normalizeEvent handles Firebase object maps for dishes and days — do not simplify
- window.runRegressionTests() must pass 25/25 before any push
- window.checkSyncFreshness() available to verify local matches Firebase
- mpLog, window.mpDiag() diagnostic tools must remain intact

---

## MEAL TYPES — ARCHITECTURE DECISION (LOCKED, Robbie)

Three distinct layers — do NOT conflate them. Lock this in BEFORE touching the App Admin restructure (#18):

- **App-level master list** — controls what meal types are AVAILABLE to select anywhere in the app.
- **Trip-level (`currentEvent.mealTypes`)** — controls which meal types are ACTIVE on that specific trip, AND defines the canonical render order for that trip (see #9).
- **Day-level (`day.meals`)** — controls which meals actually SHOW on each day.

Rule: **removing a meal type from the app master list NEVER affects existing trip data.** Trips keep their own `mealTypes` and `day.meals` untouched. The master list only governs what's offered for new selection going forward.

---

## HOW TO WORK WITH ROBBIE

Before starting any fix:
- Read the relevant code first
- Explain what you found in plain English, not technical jargon
- Ask clarifying questions if anything is unclear about expected behavior
- Write acceptance criteria — exactly what done looks like, on which devices, verified how
- Get confirmation from Robbie before touching anything
- State what you plan to change and why before writing a single line

During a fix:
- Flag immediately if something unexpected is found in the code
- If a previous fix attempt left behind bad or conflicting code, report it before proceeding
- Never make judgment calls silently — surface the decision and ask
- If a change affects more than what was asked, stop and flag it
- If something feels risky, say so out loud before proceeding
- Actively flag concerns if changes affect data flow, permissions, Firebase saving, or sync

After a fix:
- List every function changed with exact rollback instructions
- Generate a targeted manual test checklist specific to what changed
- Note any related issues observed but not fixed
- Update CHANGELOG.md with plain English description of what changed and why

Proactively pause and flag for stabilization if:
- More than 3 bugs introduced in recent builds
- A fix keeps failing or being re-attempted
- Any change touches Firebase write paths, sync logic, or save logic
- Data flow getting more complex instead of simpler
- The same area of code has been fixed more than twice — stop and investigate structurally
- Regression test count is dropping

**Never assume. Never guess. Never make a judgment call without asking first.**

**AUTO-PUSH (Robbie, 2026-07-02):** Once `node --check` passes, push visual/UI/render-only changes without stopping to ask. STILL pause and confirm before pushing anything that touches **sync, save, Firebase writes, or `groceryMeta`/data-shape** — those stay must-ask.

---

## BUILD RULES — EVERY TIME

- node --check must pass before delivering any build — no exceptions
- window.runRegressionTests() must pass 25/25 before every push
- Check git log before building — next version = current + 1
- Never reuse a version number
- Maximum 3-5 changes per build
- No mixing bug fixes with architecture changes or new features in same build
- Read exact code before editing — no assumptions about what is there
- File size sanity check — warn if file shrinks significantly, means code was deleted
- After build, list every changed function with rollback lines
- Generate targeted manual test checklist based only on what changed in that build
- After any build touching sync, save, or Firebase — mandatory observation before next build in that area
- Use test branch for risky changes, only merge to main when confirmed working

---

## AUTOMATED TEST SUITE

Run automatically after every build, do not deliver if any fail:
- node --check — syntax validation, must pass
- All critical functions must exist — commitAndSync, normalizeEvent, openLoadedTrip, renderAll, buildGroceryList, fbWriteTrip, validateBeforeFirebaseWrite, repairCorruptedTripCodes, TripStore.setTrip, TripStore.clearTrip, TripStore.getTrip, TripStore.getCode, TripStore.isLoaded
- No duplicate function definitions anywhere in the file
- Version number valid format (vN) and higher than previous version
- All Phase 0.5 guardrails present — validateBeforeFirebaseWrite, runRegressionTests, mpLog, checkVersionEnforcement
- _isApplyingRemoteChange flag declared
- _isLoadingTrip flag declared
- No undefined variable references in key functions
- File size within reasonable range of previous version

Browser console tests — run before every push:
- window.runRegressionTests() — must pass 25/25
- window.mpDiag() — spot check state after opening a trip
- window.checkSyncFreshness() — verify local matches Firebase after sync test

---

## ACTIVE WORK — index (full detail in BACKLOG.md)

**IMMEDIATE QUEUE (Robbie, 2026-07-02, in this order):**
1. **Tab-bar icons** — IN PROGRESS. `navpreview.html` is live (open `navpreview.html?v=2` in a fresh Safari tab, NOT the PWA); Robbie picks a style (D/E/F/G) → wire the winner into the real bottom nav. (v178's icons weren't landing + were hidden by PWA cache.)
2. **AI agent — add recipe steps (A2)** + **image bugs**: (a) many recipes missing images (root cause unknown — audit `sourceRecipeImage`/#25(i)); (b) wrong-image match (watermelon pulled "al pastor" — tighten image-search relevance). Full spec in BACKLOG.md "AI AGENT" + "IMAGE ISSUES". ⚠️ image writes are data-adjacent.
3. **Modernize the GROCERY VIEW** — bring the grocery/shop screens up to the v134/v167 modern look (ties into #36/#27A). Render-first; anything touching `groceryMeta` is must-ask.

**Then — GROCERY & RECIPE COMPONENT PROGRAM (brief 2026-06-27, full spec in BACKLOG.md):**
- **G1 — one-off store auto-assignment (v139, SHIP FIRST, safe mid-trip).** Auto-`guessStore` on add/edit + `groceryName→lastStore` memory map (resolve: manual → memory → guess → Unassigned) + never-hide-Unassigned in Shop + inline per-row store `<select>`. **Supersedes/closes #10** (the `reconcileGroceryMeta` delete that drops the store on rename). ⚠️ DECIDE at build: re-wire `storeRules` into `guessStore` (currently DEAD — guessStore is a hardcoded dept→store map) or keep the hardcoded guess.
- then **G-backbone** (source-aware grocery lines: `sources[]` on each aggregated line) → **G3** (smart purchase consolidation + retire dedup button; signed-delta override) → **G2** (recipe components; biggest lift, AI-import change). G2/G3 change the model → versioned, backup first, NOT mid-trip.

**Queued (safe / small):**
- **#25(i)** proactive image sourcing on save (fire sourceRecipeImage in saveDishFromModal bankOnly + self-heal pass)
- **#27A** grocery section headers consistent on all screens (un-hide `.grocery-section-row` in the ≤768px media query ~line 603 + restyle for card layout)
- **#3 cleanup** run `cleanupDuplicateRecipes()` (dry-run) then `cleanupDuplicateRecipes({apply:true})` — tool is LIVE

**Bigger / careful:**
- ~~**#28** trip header photos sync~~ — **DROPPED** (v138 removed the entire photo-banner system; replaced by synced color schemes)
- **C0 cooking mode** — DEPRIORITIZED (Robbie: not really used); spec still in BACKLOG.md
- **Admin cluster #18 → #19 → #20** (its own session): #18 split universal vs trip settings (collapsible) → #19 user directory + cook dropdown → #20 Firebase security rules (untested rules can lock out all users — stage WITH Robbie)

**Open bugs (not blockers):**
- **#4** meal delete/re-add flakiness (sync-listener race — needs reproduction + careful guard with live observation; do NOT touch sync path blind)
- **#5** trip-ID-null in App Admin on mobile (needs Robbie's device)
- **#10** grocery key-migration before any further grocery-key change (reconcileGroceryMeta deletes orphaned meta — migrate, don't delete; post-trip)
- **#11** owner field placeholder never appears
- **A1** AI-agent visual redesign (its own design session)

**Accepted / dropped:** orange-juice quantity split (#10 quantity — can't reproduce); AI-generated recipes with no online image match stay blank.

---

## RECENT VERSIONS (last 5 — full history in CHANGELOG.md)

- v178 — **Bottom tab bar — fixed overlap + redrew the whole icon set (fixes v177).** v177 slimmed the bar to 50px but kept 26px icons → icon/label overlapped; and only one icon was swapped so the set stayed mismatched. Fix: bar back to 56px w/ 24px icons + tight padding (no overlap); redrew all four cohesive line icons — All Trips=house, Meal Plan=clean calendar (no dots), Groceries=cart, Trip Settings=sliders (dropped the muddy gear). Render-only, FIP-safe. node --check pass.
- v177 — **Bottom tab bar → authentic iOS look (mobile, render-only, FIP-safe).** Killed the navy "All Trips" chip → clean tab like the others; swapped its back-arrow for a 2×2 grid icon; `-apple-system`/SF Pro labels unified at 10px/500/-0.01em; inactive=`--muted`, active=theme accent (icon+label); kept glass material but replaced the shadow with a 0.5px hairline + slimmed to ~50px; iOS press = dim not springy scale. Appended `v177` CSS block before `</style>` + one markup edit (~line 2030). node --check pass.
- v176 — **Confirm-before-delete for big shrinks (Option A UX fix on v175).** Deleting a whole meal slot used to show the ⚠️ big-shrink confirm but Cancel "deleted anyway" — `removeMealFromDay` mutated local state (dishes vanished) BEFORE the `fbWriteTrip` guard; Cancel only blocked the server write and re-pulled (no data lost, but looked broken). Fix: (1) `removeMealFromDay` shows the big-shrink warning in its **existing single confirm BEFORE deleting** → Cancel = nothing vanishes; (2) single-use `_bigShrinkPreConfirmed` flag set before `commitAndSync()`; (3) `fbWriteTrip` reads-and-clears the flag and skips the second `window.confirm`. Server-truth stale-overwrite guard + the 9→1 corruption catch both UNTOUCHED. Other delete paths keep v175 behavior. Rollback tag `pre-v176-preconfirm-shrink`. node --check pass; **throwaway-trip test + browser 25/25 PENDING — NOT pushed** (write-path change, Robbie tests first).
- v138 — **Color-scheme header — replaces the entire photo-banner system (NO photos).** Ripped out ALL photo machinery (theme gallery functions, `GALLERY_KEY`, the "Themes & Photos" admin tab + panel + dead CSS, every `themePhoto` read/write, the header photo `background-image`/`--chi/--chip/--hi/--dhi/--hp`). Added an **8-option Color Scheme dropdown** in Trip settings (Midnight/Ocean/Forest/Sunset/Plum/Slate/Cherry/Pride) saved on `currentEvent.theme` → **syncs to all trip users**. Each scheme tints the **whole app accent** (`--ta…`) + a header **gradient** (`--hg`); header now shows trip **name + dates**. `mapTheme()` back-compat (larchmont→midnight, fire-island→ocean, adirondacks→forest; unknown→midnight) — old trips not rewritten. FIP-safe (only writes the scheme field; orphan `themePhoto` left harmless). **Backup tag `pre-v138-photo-removal`**. node --check pass; **browser 25/25 + 2-device sync + visual check PENDING.**
- v136 — **Recipe Library sort dropdown (#35), unified with the bank sort.** Recently added / Name A–Z / Most used / Top rated / Quickest-to-cook. Single shared `sortRecipesForLibrary()` (bank's old switch now calls it); `_recipeSort` persists per-device; `setRecipeSort` refreshes both views. Fixed a duplicate-def clash with the pre-existing bank sort (aligned on `'alpha'`). Render-only → FIP-safe.
- v135 — **More polish (CSS-only, FIP-safe): frosted-glass toasts, smoother tab transitions, cinematic banner vignette (does NOT touch the per-theme image/position), slowly-drifting decorative hero rings.** Respects `prefers-reduced-motion`. Banner *image* upgrade is the separate #28 shared-gallery build.
- v134 — **Modern/futuristic polish pass (glass + glow + motion), additive CSS only.** Appended a `v134 polish` block: frosted glass (`backdrop-filter`) on modals / App Admin / drawer / mobile bottom-nav (`--glass` light+dark vars, graceful fallback); soft accent glow + tactile press on buttons (landing New Trip keeps navy glow so it can't go teal); trip-card hover lift + staggered fade-rise entrance; modern `:focus-visible` rings; respects `prefers-reduced-motion`. No JS/data/sync change → FIP-safe. **Backup tag `pre-polish-v133`** = one-command rollback. node --check; visual verify pending.
- v133 — **Import reworked to Robbie's model (#3, supersedes v132): import LOADS details into the editor; the editor's single Save is the only write.** Review-panel primary button relabeled **"Save Details"** → routes to `editRecipeImport` (loads recipe into the bankOnly editor WITHOUT saving). User edits, then the editor Save (`saveDishFromModal`) is the ONE library write → no duplicates, edit-before-save. Removed the redundant "Edit" button. Photo + AI-bot imports both go through this. `confirmRecipeImport` now dead code. node --check; verify on a throwaway import. URL import (`saveImportedToLibrary`) not yet aligned — candidate follow-up.
- v132 — **Fix: photo import no longer saves a recipe twice (#3).** The photo importer is a tab inside the Add-Recipe dish modal; `confirmRecipeImport` saved to the library AND pre-filled the open modal, so the modal's Save saved a 2nd copy (with a fresh id; dedup missed it on `source` mismatch). Fix: after saving, if the dish modal is open, CLOSE it instead of pre-filling (clears `_pendingLibraryRecipe`/`_pendingBankRecipeId`). Edit-before-save still available via the review panel's "Edit". node --check; verify on a throwaway import.

---

## NEXT SESSION — start here

STATE: **v180 is LIVE** (pushed 2026-07-04). Two big things shipped live this session:
- **v179 — GROCERY SECTION REDESIGN** (List/Assign/Shop rebuilt as iOS cards, unified shared Store/Dept/Search dropdown filters across all 3 tabs, Assign Grid⇄List toggle [mobile→list dropdowns], status dropdown removed, SF font, medium-blue #2857c4 accent bar). Built iteratively on a **local Node server** (`node` static server on :8000 serving `redesign.html`) then **promoted into `index.html`**. Visual/render-only; data/save/sync + guardrails untouched. Full detail in CHANGELOG.
- **v180 — bottom nav** = official Phosphor icons w/ iOS outline→fill on active + badge-overlap fix; plus **laptop trackpad scroll fix** (removed `overscroll-behavior:contain` from `main,.page`).

⚠️ **OPEN / NEXT (this redesign):**
1. **Run `window.runRegressionTests()` 25/25 on LIVE** — it was NOT run pre-push (can't run headless). Overdue.
2. **Item sheet (grocery `.gis-*` detail/adjust sheet) still unpolished** — the one grocery piece not rebuilt. Next v181.
3. **Mobile polish continuing** — Robbie flagged fonts/tightness; a mobile tightening pass shipped but keep refining on a phone.
4. **"App has no character anymore" (Robbie, 2026-07-04, FOR LATER)** — a real vibe/personality pass (warmth, illustration, motion, color moments), its own session — NOT a quick tweak.
5. **Cleanup:** `redesign.html` is now a redundant copy of index.html (safe to delete); the Phosphor **grocery-mode** work + SF-font spike is still parked in a **git stash** (`git stash list`) — likely obsolete now, review/drop.
6. Rollback for the whole redesign: tag `pre-grocery-live-v178` or `git revert`.

Prior: **v178 was LIVE** (2026-07-02) — bottom tab bar overlap fix + clean icon set (superseded by v180's Phosphor nav).
Prior: **v177 is LIVE** (pushed 2026-07-02) — bottom tab bar restyled to an authentic iOS look (mobile, render-only): no more navy "All Trips" chip, SF Pro labels, cohesive accent, glass + 0.5px hairline, iOS press-dim. (Superseded by v178's overlap fix + icon redraw.)
Prior: **v176 is LIVE** (pushed 2026-07-02, tested on a throwaway trip by Robbie — "it worked") — confirm-before-delete UX fix for the big-shrink guard (Option A): a whole-meal-slot deletion warns in ONE confirm BEFORE removing anything, so Cancel truly cancels (dishes no longer vanish-then-restore). Server-truth stale guard + 9→1 corruption catch untouched. Rollback tag `pre-v176-preconfirm-shrink`. Follow-up option: extend the same pre-confirm to remove-day + single-dish delete paths (v178).
Prior: **v175 is LIVE** (pushed 2026-07-02) — adds the **big-shrink write guard** (blocks any save dropping >2 dishes / below 70% unless the user confirms; closes the gap v174 missed). ⚠️ **NEEDS a throwaway-trip test** (never FIP): confirm a big deletion prompts + can be cancelled, and a normal 1-dish delete + adds save silently. Rollback tag `pre-v175-shrink-guard`.
**2026-07-02 INCIDENT (resolved):** a stale phone on OLD code wrote a 1-dish partial over the 4th-of-July trip (9 dishes) → recovered from desktop's local backup, restored 9 to Firebase. Root cause: phone was pre-v174 (no guard) when it wrote. Phone later reloaded clean and shows all meals; may still read v173 until GitHub Pages CDN refreshes v174/v175.
Prior: **v174 is LIVE** (pushed 2026-07-02). v141–v173 shipped this session (grocery consolidation, AI-chat overhaul, Cloud-Function recipe import, edit=view cohesion, iOS-native mobile polish, home modernization) — see CHANGELOG.md. **v174 = the data-safety fix** for a mobile/desktop divergence: a wiped+re-added Safari home-screen PWA left a *newer-timestamped partial copy*, so the sync listener's timestamp guard kept refusing the correct larger server copy → mobile showed fewer meals (4th-of-July trip). Fixes: (1) `fbWriteTrip` **read-before-write guard** — blocks a save from any device behind the server (tracks per-trip `_remoteDishCounts`); (2) `forcePullFromServer()` read-only recovery + auto-detect prompt when server has more dishes than shown. **Desktop/Firebase confirmed intact; no data lost.** Rollback tag `pre-v174-write-guard`.
⚠️ **IN PROGRESS:** Robbie recovering his phone — update the Safari home-screen app to v174 (delete+re-add icon), open the 4th-of-July trip, tap the "Update from server" prompt. Confirm mobile then matches desktop.
⚠️ **REGRESSION DEBT:** v139+ pushed without the browser 25/25 (`window.runRegressionTests()`); run it on live when possible. **v174 also needs a 2-device stale-overwrite test on a THROWAWAY trip (never FIP)** — verify a behind device gets blocked + the pull prompt, and a normal deletion still saves.
NEXT grocery step per the program (BACKLOG "GROCERY & RECIPE COMPONENT PROGRAM"): **G-backbone** (`sources[]` on each line) → **G3** (combine limes → one line + buy-count, built on v140's "how many to buy") → **G2** (recipe components). Possible v141 fast-follow: make the meal-plan ingredient tap open the same Item sheet (deferred from v140).

**v138 done:** removed ALL photo machinery; added 8 Color Schemes (Midnight/Ocean/Forest/Sunset/Plum/Slate/Cherry/Pride) in Trip settings, saved on `currentEvent.theme`, synced to all trip users; scheme tints the whole app accent + header gradient (`--hg`); header shows name + dates; `mapTheme()` back-compat (old trips not rewritten). Still worth a quick **2-device scheme-sync spot-check on a THROWAWAY trip** (not FIP) on the live site when convenient.

**UI REFRESH QUEUE (Robbie confirmed 2026-06-27, after the v138 header):** (1) **Grocery + Shopping UI** (#36/#27A) — sticky per-store/dept section headers (fix the ≤768px hide bug), cleaner rows, per-section "X of Y" counts. (2) **AI chat panel** (A1) — visual pass (bubbles/input/flow; Robbie: "clunky and ugly"). (3) **Recipe Library sort control** — restyle on mobile (#35). (4) **Dish edit modal** — more breathing room. (5) **Consistency sweep** — bring older screens up to the v134/v135 polish. ❌ **Cooking mode C0 DEPRIORITIZED** (Robbie: not really used). ❌ **Empty states — leave as-is** (Robbie). **GROCERY FLOW — pinpointed pain (Robbie 2026-06-27): editing an item drops its store assignment.** Bulk store-assign is fine; the friction is end-stage tweaks (substitutions, "we have it," qty/name edits) — editing an item changes its normalized name-key, so `groceryMeta` (store + bought) is orphaned and the item shows UNASSIGNED → must re-assign. This is **backlog #10**. FIX = on edit/rename, **migrate `groceryMeta` old-key→new-key (never delete)** so the store survives the edit. ⚠️ DATA-SENSITIVE (`groceryMeta`; reconcileGroceryMeta currently deletes orphaned meta) — careful build, test on a throwaway trip, NEVER FIP. **Highest-value grocery fix — do BEFORE the visual grocery refresh (#36/#27A).**

Below = the v124–v137 history (all live):
- **Storage saga v124–v128** (confirmed): full-device joined-trips fix, `diagStorage()`/`showDiagReport()` tools, backup de-dupe (5120→3068 KB, FIP intact), missing-data self-heal + `null` orphan prune.
- **Archive #22 — v129/v130** (confirmed): per-user archive (`users/{uid}/trips/{code}.archived`), auto-archive >1 day past end, manual un-archive (`keepActive` flag), live cross-device sync (`subscribeUserTrips`), teal New-Trip button fixed.
- **Image-key sync #29 — v131**; **import rework #3 — v132/v133** (import now LOADS into the editor via "Save Details"→`editRecipeImport`; single editor Save = only write; no dupes).
- **Polish #A1 — v134/v135** (glass+glow+motion, frosted toasts, banner vignette, living hero; CSS-only). **Backup tag `pre-polish-v133`** = one-command rollback.
- **Recipe Library sort #35 — v136** (shared with bank sort).

**⚠️ OPEN / NEXT SESSION:**
1. **Regression overdue** — run `window.runRegressionTests()` 25/25 (logged in, trip open) BEFORE the next Firebase-write feature.
2. **Banner shared-gallery #28 — CONFIRMED NEXT, the careful one** (Robbie: "be careful", 2-device test): user uploads OWN images → **auto-downscale** (avoid base64 bloat) → **shared Firebase gallery** (options apply to ALL trips + users) → per-trip selection writes `themePhoto` → **syncs to all users on the trip**.
3. **#35 sort** — Robbie unsure it works + control is UGLY on phone → verify each option re-orders + restyle for mobile.
4. **#36 grocery UI** — wants better grocery UI; needs scoping (relates to #27/#27A).

**PRIORITY THREAD: storage ✅ → archive ✅ → admin/user-directory.** The big careful build = **#18/19/20**: admin "see users" + per-trip roster + **user tagging** + **Audit Log face photos** all share ONE foundation (a readable user directory). De-risk: write a dedicated readable `userDirectory` node on login instead of the dangerous global `/users` rules change. Security rules staged LAST, live with Robbie. Also queued: **#33** root storage fix (live photos still ~2.4 MB base64; do NOT strip backup beyond v126; restore prefers Firebase), **#34** trip ordering, **#32** copy/duplicate trip, cooking-mode C0.

Next priority = **COOKING-MODE REDESIGN (C0)** — read the C0 spec in BACKLOG.md. Already shipped: C0a (v112 timers), C0d/C0f/C0g (v113), C0h (v114). **Remaining: C0b multi-dish dashboard → C0c coordination timeline → C0e QoL.** Queued safe/small alternatives if Robbie wants a quick win first: **#25(i)** proactive image sourcing on save, **#27A** grocery section headers on all screens, **#3** run cleanupDuplicateRecipes (dry-run then apply).

NOTE: the v99 self-heal spends ~0.1¢/recipe on Robbie's Anthropic key to clean grocery names (cached, one-time); Robbie is OK with it. To make it button-only, gate _autoHealGroceryNames().
