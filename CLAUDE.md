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

- v126 — **Stop the local backup from duplicating embedded photos — frees ~2.4 MB.** `diagStorage()` showed Robbie's phone AT the 5 MB cap, ~95% from FIP 2026's **128 base64 photos (~2.4 MB) kept twice** (live cache + backup). Fix: backup is now image-light — `_stripDataImagesForBackup` blanks `data:image` blobs on a CLONE; `saveLocalBackup` stores the light copy; one-time `_migrateStripBackupImages` (in `startAppAfterAuth`) frees the existing blob on load. **Restore now PREFERS Firebase** (fetches live trip first; only falls back to the image-light backup if Firebase is empty) → can never blank FIP's photos. FIP-safe: live cache + Firebase untouched, nothing deleted. Root fix (photos→hosted URLs/IndexedDB so the live copy + Firebase also shrink) still a follow-up (#33). 25/25 guest (Robbie). Expect ~2.7 MB total after deploy.
- v125 — **Read-only `window.diagStorage()` storage diagnostic (measure before slimming the cache, #33).** Console tool: total localStorage vs ~5 MB iOS cap, per-key table + embedded-`data:`-image counts, per-trip breakdown for the `trips` cache and `backups`. Reads only → FIP-safe. Run on the LIVE site on the actual full device (localhost is a separate near-empty origin). Scoping findings: the backup keeps a full copy of EVERY trip (prime redundant sink) → v126 caps it to ~3 recent; do NOT strip images from the backup (`restoreFromBackup`→`commitAndSync` would push blanks to Firebase = data loss). 25/25 guest (Robbie).
- v124 — **Joined trips now show on a storage-full device (flip side of v123).** Trips joined on another device didn't appear on Robbie's (full) iPhone but showed on desktop (same account). `renderLanding` built the home list only from localStorage, so on a full device (writes swallowed by v123's `_safeLSSet`) joined trips never landed in `getDeviceTrips()`. Fix: home list now driven by the Firebase account trip-list held in memory (new `_accountTrips`/`_accountTripCodes`); `loadUserTripsFromFirebase` populates them + re-renders; `renderLanding` shows the UNION of device-cached + in-memory account trips; `deleteTripFromDevice` clears the in-memory entry. Guest unaffected. No write-path change, nothing deleted → FIP-safe. 25/25 (Robbie). Does NOT free storage — that's v125 next (#33).
- v123 — **iOS storage-full no longer blocks the cloud save.** Robbie's iPhone hit QuotaExceededError (full localStorage); the unguarded `setAllTrips` threw, and since saves are local-first-then-cloud the throw skipped the Firebase write → iPhone edits silently not saving + red error banner. New `_safeLSSet` wraps localStorage writes (setAllTrips/setDeviceTrips/setUserData): on quota error it warns + one calm toast + returns false WITHOUT throwing, so fbWriteTrip always runs. NOTHING deleted (no eviction) — full device just stops caching locally, self-heals from Firebase. No write-path change → FIP-safe. Verified 25/25 + quota-simulation showed fbWriteTrip ran with all dishes.
- v122 — **Adjusted-amount override (dish-level, single source of truth).** New additive ingredient field `qtyOverride` — empty = auto-scale as before; non-empty = a manual amount shown verbatim everywhere with no math. Dish-editor "Adjusted" box is now editable (was readonly) + amber when overridden; threaded through normalizeDish (survives sync) / collectIngredients / addIngredientRow / editDish; all read sites honour it (grocery aggregateRows, cooking, detail view). Detail view now shows SCALED (was original — the reported bug); grocery "Edit ingredient" popup shows the adjusted + a "Recipe base: X" hint and saves as override (base quantity left editable in the full editor). Cooking mode now uses scaleQty (fractions scale right). Original quantity never modified → FIP-safe, opt-in, no backfill. Confirmed 25/25.

---

## NEXT SESSION — start here

STATE: **v126 shipped (2026-06-18, pushed live)** — backup no longer duplicates FIP's 128 base64 photos; one-time migration frees ~2.4 MB on load; restore now prefers Firebase (can't blank FIP). 25/25 guest (Robbie). **⏳ WAITING ON ROBBIE (live, real device): reload, run `window.diagStorage()` → backup should be tiny + total ~2.7 MB; open FIP → confirm all photos still show.** `diagStorage()` measurement that drove this: Robbie's phone was AT the 5 MB cap, ~95% = FIP's 128 base64 photos kept TWICE (live cache + backup). v124 (joined trips on full device) + v125 (`diagStorage`) shipped + live, 25/25. **PRIORITY THREAD (Robbie, 2026-06-18): storage → archive → admin.** NEXT options: (a) **root storage fix (#33)** — convert the 128 base64 photos to hosted URLs / IndexedDB so the LIVE cache copy + the Firebase record also shrink (v126 only freed the duplicate backup copy; the live copy is still ~2.4 MB). New photos still save as base64 via `compressPhoto`→`toDataURL`, so without this they'll keep re-bloating — worth doing. Then (b) **#22 archive** (per-user, design LOCKED) → (c) **#18/19/20 admin & access** (global-admin model, three delete levels, security rules last + staged live). Also queued: **#32 copy/duplicate trip**. (Cooking-mode C0 still queued but not immediate.) NOTE for #33: do NOT strip images from the backup beyond what v126 does, and keep restore preferring Firebase. v123 confirmed earlier. FIP-safe: no write-path change, nothing deleted. **v122** (adjusted-amount override, dish-level single source of truth) also shipped + confirmed 25/25. Small related follow-up if Robbie wants it: the grocery "Edit ingredient" popup now edits the override (not the base) — flip it back to base editing if that's preferred. Storage note: iOS localStorage (~5MB) fills with trips/images/backups; if it bites again, options are real (non-deleting) reductions — e.g. stop keeping a full local backup copy per trip (saveLocalBackup), or store recipe images by URL only.

Next priority = **COOKING-MODE REDESIGN (C0)** — read the C0 spec in BACKLOG.md. Already shipped: C0a (v112 timers), C0d/C0f/C0g (v113), C0h (v114). **Remaining: C0b multi-dish dashboard → C0c coordination timeline → C0e QoL.** Queued safe/small alternatives if Robbie wants a quick win first: **#25(i)** proactive image sourcing on save, **#27A** grocery section headers on all screens, **#3** run cleanupDuplicateRecipes (dry-run then apply).

NOTE: the v99 self-heal spends ~0.1¢/recipe on Robbie's Anthropic key to clean grocery names (cached, one-time); Robbie is OK with it. To make it button-only, gate _autoHealGroceryNames().
