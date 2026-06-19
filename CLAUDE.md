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

- v130 — **Archive fixes: un-archive sticks + syncs live across devices; New Trip button no longer teal.** (1) un-archiving a PAST trip was being re-archived by `autoArchivePastTrips` → added a `keepActive` flag (set on manual un-archive, cleared on archive) that auto-archive skips. (2) live cross-device sync via read-only `subscribeUserTrips()` listener on `users/{uid}/trips`. (3) "+ New Trip" button pinned to brand navy `#1a3260` (was `var(--theme-accent)` → teal on some themes). FIP-safe (per-user flags + read listener). node --check; manual test skipped at Robbie's request.
- v129 — **Archive trips (per-user) — BACKLOG #22.** Trips tuck into a collapsible "Archived (N)" section on the home screen instead of cluttering "Your Trips". Stored as `users/{uid}/trips/{code}.archived` (per-user, never touches trip data → reversible + FIP-safe). `autoArchivePastTrips()` archives any trip >1 day past `endDate` (no endDate → never); un-archive is MANUAL-only via Trip Details → Archive toggle; `recordTripForUser` uses `.update` so re-opening preserves the flag (viewing never un-archives). FIP option (a): FIP + MDW auto-archive now, Juneteenth (upcoming) stays active. 25/25 guest.
- v128 — **Fix: a trip missing from one device's cache now re-fetches itself + `null` orphan cleanup.** iPhone showed only 2 of 3 trips (Juneteenth missing) + a `null` trip in App Admin → Data. Cause: Juneteenth's code was in the device list but its DATA was missing from the local cache (storage-full save failure), and v124's `loadUserTripsFromFirebase` only re-fetched trips ABSENT from the device list. Fix: (1) re-fetch any account trip whose data isn't in `getAllTrips()` nor `_accountTrips` (catches data-missing-from-cache too); (2) `repairCorruptedTripCodes` prunes `null`/invalid/non-object keys from the local cache. FIP-safe (re-fetch = read; prune = local only). 25/25 guest.
- v127 — **On-screen "Storage & Diagnostics" readout (no console — for phones).** App Admin → Data → "Show storage & diagnostics" + `window.showDiagReport()`: version, sign-in state (account vs Guest), trips cached on THIS device vs on your Firebase ACCOUNT (`_accountTripCodes`) with ⚠ mismatch flags, + localStorage per-key sizes/total. Read-only → FIP-safe. Built to check phone storage without a console AND to diagnose surfaces showing different trip lists (expected cause: a surface in Guest/different login shows only its local trips). 25/25 guest.
- v126 — **Stop the local backup from duplicating embedded photos — frees ~2.4 MB.** `diagStorage()` showed Robbie's phone AT the 5 MB cap, ~95% from FIP 2026's **128 base64 photos (~2.4 MB) kept twice** (live cache + backup). Fix: backup is now image-light — `_stripDataImagesForBackup` blanks `data:image` blobs on a CLONE; `saveLocalBackup` stores the light copy; one-time `_migrateStripBackupImages` (in `startAppAfterAuth`) frees the existing blob on load. **Restore now PREFERS Firebase** (fetches live trip first; only falls back to the image-light backup if Firebase is empty) → can never blank FIP's photos. FIP-safe: live cache + Firebase untouched, nothing deleted. Root fix (photos→hosted URLs/IndexedDB so the live copy + Firebase also shrink) still a follow-up (#33). 25/25 guest (Robbie). Expect ~2.7 MB total after deploy.

---

## NEXT SESSION — start here

STATE: **v129 shipped (2026-06-18, pushed live)** — Archive trips (per-user, BACKLOG #22): trips tuck into a collapsible "Archived (N)" section on the home screen instead of cluttering "Your Trips"; flag on `users/{uid}/trips/{code}.archived` (never touches trip data → FIP-safe); `autoArchivePastTrips()` archives any trip >1 day past `endDate` (no endDate → never); un-archive is MANUAL-only via Trip Details → Archive; `recordTripForUser` uses `.update` so re-opening preserves the flag. 25/25 guest. **⏳ WAITING ON ROBBIE (live, logged in): reload to v129 → FIP (ended Jun 16) + MDW (ended May 25) auto-archive into "Archived (2)", Juneteenth (Jun 19–21, upcoming) stays in Your Trips; test Un-archive from Trip Details → Archive; confirm archived state syncs across devices.** Storage saga (v124–v128) DONE + confirmed: v126 freed storage (5120→3068 KB, FIP intact), v128 self-heal of missing-data trips confirmed on iPhone, v127 added the on-screen `showDiagReport()` tool. `diagStorage()` measurement that drove this: Robbie's phone was AT the 5 MB cap, ~95% = FIP's 128 base64 photos kept TWICE (live cache + backup). v124 (joined trips on full device) + v125 (`diagStorage`) shipped + live, 25/25. **PRIORITY THREAD (Robbie, 2026-06-18): storage → archive → admin.** Storage ✅ (v124–128) + archive ✅ (#22 = v129, pending live confirm). NEXT options: (a) **root storage fix (#33)** — convert the 128 base64 photos to hosted URLs / IndexedDB so the LIVE cache copy + the Firebase record also shrink (v126 only freed the duplicate backup copy; the live copy is still ~2.4 MB; new photos still save as base64 via `compressPhoto`→`toDataURL`, so without this they keep re-bloating). NOTE for #33: do NOT strip images from the backup beyond what v126 does, and keep restore preferring Firebase. (b) **#18/19/20 admin & access** (global-admin model, three delete levels, security rules last + staged live). Also queued/deferred: **#29 API keys** (Robbie 2026-06-18: only the Anthropic key syncs across devices, image keys don't — verify + fix), **#34 consistent trip ordering** (home vs App Admin Data — "eventually"), **#32 copy/duplicate trip**. (Cooking-mode C0 still queued, not immediate.) FIP-safe: no write-path change, nothing deleted. **v122** (adjusted-amount override, dish-level single source of truth) also shipped + confirmed 25/25. Small related follow-up if Robbie wants it: the grocery "Edit ingredient" popup now edits the override (not the base) — flip it back to base editing if that's preferred. Storage note: iOS localStorage (~5MB) fills with trips/images/backups; if it bites again, options are real (non-deleting) reductions — e.g. stop keeping a full local backup copy per trip (saveLocalBackup), or store recipe images by URL only.

Next priority = **COOKING-MODE REDESIGN (C0)** — read the C0 spec in BACKLOG.md. Already shipped: C0a (v112 timers), C0d/C0f/C0g (v113), C0h (v114). **Remaining: C0b multi-dish dashboard → C0c coordination timeline → C0e QoL.** Queued safe/small alternatives if Robbie wants a quick win first: **#25(i)** proactive image sourcing on save, **#27A** grocery section headers on all screens, **#3** run cleanupDuplicateRecipes (dry-run then apply).

NOTE: the v99 self-heal spends ~0.1¢/recipe on Robbie's Anthropic key to clean grocery names (cached, one-time); Robbie is OK with it. To make it button-only, gate _autoHealGroceryNames().
