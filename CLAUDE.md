# MEAL PLANNER — CLAUDE.md

> **Docs layout (read this first):** This file = the rules + current state + what's next. Full per-version history lives in **CHANGELOG.md**. Full verbose detail for every backlog item lives in **BACKLOG.md** (the ACTIVE WORK index below is one line per item — open BACKLOG.md for the full spec before working an item). Keep this file slim so it loads fast every session.

## HIGHEST PRIORITY — NON-NEGOTIABLE

No data loss under any circumstances. There is real live trip data in Firebase. **FIP 2026 is THE protected live trip — it must NEVER be deleted or overwritten under any circumstances (Robbie, 2026-06-06).** Never test data/sync changes against FIP 2026; use a throwaway test trip and back FIP 2026 up first.

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

**Next up (Robbie's priority):**
- **C0 — COOKING MODE REDESIGN** (its own session). Order: C0a persistent/parallel timers (also fixes timer-dies-on-exit bug) → C0f immediate Back/Exit → C0g status-bar overlap → C0h remove "cooking for # people" adjuster → C0d dish picture not emoji + clean view → C0b multi-dish dashboard → C0c coordination timeline → C0e QoL. Folds in C1/C2.

**Queued (safe / small):**
- **#25(i)** proactive image sourcing on save (fire sourceRecipeImage in saveDishFromModal bankOnly + self-heal pass)
- **#27A** grocery section headers consistent on all screens (un-hide `.grocery-section-row` in the ≤768px media query ~line 603 + restyle for card layout)
- **#3 cleanup** run `cleanupDuplicateRecipes()` (dry-run) then `cleanupDuplicateRecipes({apply:true})` — tool is LIVE

**Bigger / careful:**
- **#28** trip header photos sync (per-device localStorage gallery; sync change — test on 2 devices)
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

- v136 — **Recipe Library sort dropdown (#35), unified with the bank sort.** Recently added / Name A–Z / Most used / Top rated / Quickest-to-cook. Single shared `sortRecipesForLibrary()` (bank's old switch now calls it); `_recipeSort` persists per-device; `setRecipeSort` refreshes both views. Fixed a duplicate-def clash with the pre-existing bank sort (aligned on `'alpha'`). Render-only → FIP-safe.
- v135 — **More polish (CSS-only, FIP-safe): frosted-glass toasts, smoother tab transitions, cinematic banner vignette (does NOT touch the per-theme image/position), slowly-drifting decorative hero rings.** Respects `prefers-reduced-motion`. Banner *image* upgrade is the separate #28 shared-gallery build.
- v134 — **Modern/futuristic polish pass (glass + glow + motion), additive CSS only.** Appended a `v134 polish` block: frosted glass (`backdrop-filter`) on modals / App Admin / drawer / mobile bottom-nav (`--glass` light+dark vars, graceful fallback); soft accent glow + tactile press on buttons (landing New Trip keeps navy glow so it can't go teal); trip-card hover lift + staggered fade-rise entrance; modern `:focus-visible` rings; respects `prefers-reduced-motion`. No JS/data/sync change → FIP-safe. **Backup tag `pre-polish-v133`** = one-command rollback. node --check; visual verify pending.
- v133 — **Import reworked to Robbie's model (#3, supersedes v132): import LOADS details into the editor; the editor's single Save is the only write.** Review-panel primary button relabeled **"Save Details"** → routes to `editRecipeImport` (loads recipe into the bankOnly editor WITHOUT saving). User edits, then the editor Save (`saveDishFromModal`) is the ONE library write → no duplicates, edit-before-save. Removed the redundant "Edit" button. Photo + AI-bot imports both go through this. `confirmRecipeImport` now dead code. node --check; verify on a throwaway import. URL import (`saveImportedToLibrary`) not yet aligned — candidate follow-up.
- v132 — **Fix: photo import no longer saves a recipe twice (#3).** The photo importer is a tab inside the Add-Recipe dish modal; `confirmRecipeImport` saved to the library AND pre-filled the open modal, so the modal's Save saved a 2nd copy (with a fresh id; dedup missed it on `source` mismatch). Fix: after saving, if the dish modal is open, CLOSE it instead of pre-filling (clears `_pendingLibraryRecipe`/`_pendingBankRecipeId`). Edit-before-save still available via the review panel's "Edit". node --check; verify on a throwaway import.

---

## NEXT SESSION — start here

STATE: **v136 live — end of day 2026-06-19.** Big day, shipped **v124→v136**, all live + FIP-safe (every build since v126 = node --check only):
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
