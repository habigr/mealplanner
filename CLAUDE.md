# MEAL PLANNER — CLAUDE.md

> **Docs layout (read this first):** This file = the rules + current state + what's next. Full per-version history lives in **CHANGELOG.md**. Full verbose detail for every backlog item lives in **BACKLOG.md** (the ACTIVE WORK index below is one line per item — open BACKLOG.md for the full spec before working an item). Keep this file slim so it loads fast every session.

## HIGHEST PRIORITY — NON-NEGOTIABLE

No data loss under any circumstances. There is real live trip data in Firebase including active trips like MDW 2026.

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

- v113 — **cooking-mode quick wins.** Pill badge shows full mm:ss + live-updates (was "30m"); overview screen gets safe-area top padding (C0g, no longer under the clock); overview shows the dish photo not the emoji (C0d); Back button on the pre-cook overview (C0f, via exitCookingMode(true) skipRating). Render/CSS only. Live test pending.
- v112 — **C0a cooking timers persist + run in parallel** (cooking-mode redesign pt 1). Wall-clock timers (correct through phone sleep), survive leaving cooking mode, persistent bottom strip (tap-resume / ✕ cancel / Clear all), beep+haptic+red DONE chip, Back vs endCookingSession split. Local UI state only — no Firebase/sync/save. **Built, awaiting Robbie's live test + runRegressionTests 25/25 before it's considered confirmed.** Lock-screen live timer = iOS-native-only → parked on #21.
- v111 — image fallback switched to PEXELS (Google Custom Search deprecating). Order: recipe URL → Spoonacular → Google(if keys) → Pexels. Pexels key syncs with trip. VERIFIED working by Robbie.
- v110 — Google image fallback (superseded by v111) + image keys (Spoonacular/Google/Pexels) now stick with the TRIP (#29).
- v109 — #26 edit a dish's item from the grocery row's dish pill (full ingredient editor; picker when a dish feeds a row via >1 ingredient; no ids shown).

---

## NEXT SESSION — start here

STATE: **v112 shipped C0a** (cooking timers persist + parallel) — built, pushed live, **awaiting Robbie's phone test + runRegressionTests 25/25 to confirm.** If a timer issue shows up, iterate on the cooking block (renderTimerStrip / _startGlobalTimer / exitCookingMode). Prior: shipped v80→v111, 25/25 confirmed at v101 + v109.

Continue the **COOKING-MODE REDESIGN (C0)** — read the C0 spec in BACKLOG.md. Remaining small builds, in order: **C0f** (Back/X on the cooking overview screen), **C0g** (top safe-area padding so content clears the status-bar clock), **C0h** (remove the non-working "cooking for #" adjuster), **C0d** (dish photo instead of emoji + clean focus view). Then the bigger C0b multi-dish dashboard / C0c coordination timeline.

NOTE: the v99 self-heal spends ~0.1¢/recipe on Robbie's Anthropic key to clean grocery names (cached, one-time); Robbie is OK with it. To make it button-only, gate _autoHealGroceryNames().
