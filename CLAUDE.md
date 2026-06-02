# MEAL PLANNER — CLAUDE.md

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
- Update this file to reflect what was completed, tested, what failed, and what is next
- Move completed items to DONE section with version number they were fixed in
- Update PENDING list with current priority order
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

## PENDING ISSUES — FULL LIST

### CRITICAL — Fix these first

1. **Recipes reappearing after deletion** — subscribeToMenuLibrary has no guard, Firebase echoes deleted recipes back minutes later. Workaround: adding any dish forces a fresh write that wins over the echo. Same timestamp guard issue as trips but unfixed in library listener.
2. **Recipe images inconsistent** — RENDERING FIXED in v56 (removed proxy, direct load, no emoji fallback). Confirmed working. REMAINING: many recipes have a link but no stored imageUrl (Flank Steak, Grilled Asparagus, Swordfish Kebabs, etc.) — these need a Firebase backfill that fetches the image from the link and writes ONLY the imageUrl field. Needs sign-off (Firebase write).
3. **Duplicate recipe imports from URL** — v47 added URL dedup by URL string, needs verification.
4. **Meal type deletion/re-add flaky** — dishes added back to deleted meals disappear again when another meal is deleted on same day. Firebase listener applying stale snapshots after rapid sequential writes. Verify after v44 sync fix — may partially resolve.
5. **Trip ID null in App Admin on mobile** — shows null on mobile but correct ID on desktop.
6. **Cook photo never shows (avatar falls back to initials)** — ROOT CAUSE FOUND: `_knownUsers` is empty (`[]`). loadKnownUsers reads the whole `/users` collection, which returns nothing — almost certainly Firebase security rules allow reading your OWN `/users/{uid}` but not listing all of `/users`. Each user's photo IS in Firebase at `users/{uid}/profile.photo` and syncs to their own devices (top-right avatar works), but there's no readable global name→photo map. FIX (planned, needs build): capture the cook's photo onto the dish at assign time (self via getUser(); teammates via per-trip presence which carries name+photo) and store as assignedToPhoto, so it travels to all devices and the avatar reads it directly. Optionally also populate _knownUsers from presence as a display fallback. Touches save/assign path — isolate as its own build.

### IMPORTANT — UI Broken

7. **Recipe name cuts off in view mode when too long** — should wrap, header should expand with it.
8. **AI button overlaps send button on mobile** — both need to be tappable.
9. **Meal type reappears at bottom after re-add** — when a deleted meal type is recreated by adding a dish, it gets pushed to end of day.meals instead of inserted at correct position. Fix: insert at same relative position as in currentEvent.mealTypes order.
10. **Grocery dedup broken** — Smart Dedup renames items but does not merge quantities with existing matching rows. Creates false duplicate flags and split quantities. Dedup rename and quantity merge must happen together using the same key.

### CLEANUP

V. **Vegetarian indicator → VEG pill everywhere** — DONE on plan tab (v60), dish detail view, and dish edit form (green pill toggle, v69). REMAINING: recipe Library cards still show the 🌿 emoji next to the recipe name (renderRecipeCard). Swap for the VEG pill there too for full consistency.


11. **Owner field placeholder never appears** — the placeholder text for the owner field never shows up, needs investigation and fix.
12. **URL import error message misleading on corporate networks** — currently says "Claude may not know this recipe" when the real issue is network blocking. Should say: "Could not fetch the page — this may be blocked by your network. Try on a different connection."
13. **Meal type reappears at bottom after re-add** — see #9 above.

### DISH CARDS AND PROFILE PHOTOS

14. **Plan view dish cards** — show profile photo of assigned cook when dish is assigned to someone. Show nothing when unassigned. No placeholder avatar.
15. **Recipe detail view** — show profile photo and name of assigned cook in detail section. Not on library card, only in detail view. Use existing profile photo from _knownUsers registry. Gracefully handle no photo — show initials fallback only, no broken image.

### COOKING MODE — revisit as a group later (per Robbie)

C1. Emojis still present in cooking mode (v56 only removed them from recipe library cards). Cooking mode needs its own design pass — defer until we tackle cooking mode as a whole.
C2. **Cooking mode may be broken** — Robbie suspects it stopped working after the view/edit mode + dish-view changes (v49/v64+). Needs a diagnostic when we tackle it: verify cookRecipe/cookMeal entry points (dish view Cook button → dishDetailCook → cookRecipe; plan meal "Cook" → cookMeal) actually launch and step through. Lower priority per Robbie but logged.

### AI AGENT — wants a redesign (per Robbie)

A1. **AI agent is clunky and ugly** — works well functionally but the UX/visual design needs work. Improve the chat panel look, input area, message styling, and overall interaction flow. Its own design session (like we did for the dish view). v73 raised its z-index so it's reachable over modals; this is the broader polish.

### NEW FEATURES — After all bugs fixed

16. **Group by toggle on recipe library** — sections by category, owner, date added (most recent first).
17. ~~**View vs edit mode for dishes**~~ — DONE (v64–v70): tap a plan dish → read-only view (showDishDetail) reusing recipe-detail format; Edit → existing form; edit form compacted (v67–v69); 2-row ingredients (v68); imported image shown (v70).
18. **App Admin vs Trip Settings restructure** — universal settings must be separated from trip-specific settings. Collapsible sections. Clean separation required before building permissions.
19. **User management tab in App Admin** — grid of all users who have logged in, which trips they have accessed, ability to manually add users to trips.
20. **Admin permissions system** — admin roles, Firebase security rules. Build only after #18 is complete.

---

## CHANGELOG

- v70 — ingredient column headers Original/Adjusted/Unit; dish detail view shows imported recipe photo (resolved via bankRecipeId → name/url); editDish preserves bankRecipeId so image/link survives edits
- v69 — dish edit form: modal max-height + sticky footer so Save is always reachable on mobile; "Recipe serves" label; ingredient column headers; vegetarian → green pill toggle (:has)
- v68 — compact 2-line ingredient rows on mobile (qty/cooks-for/unit on row 1, name row 2; thin separators so many fit); safe-area header; 15px inputs; pure CSS, collectIngredients untouched
- v67 — dish edit form mobile compaction (modal padding, hide intro, Day/Meal side-by-side, smaller labels/cards)
- v66 — unified Owner/Cook for plan dishes onto assignedTo (label dynamic: "Cook" plan / "Owner" library); kept owner for library attribution; back-compat fallbacks
- v65 — dish view: hide Cook button when no steps; always show cook status (avatar+name or "No cook assigned"); events get no cook line
- v64 — dish detail VIEW trial (showDishDetail): tap a plan dish → read-only view reusing recipe-detail format; Edit → existing form; backup branch backup-v63-pre-dish-view created
- v63 — more meal-level depth (stronger shadow, bigger gap); event dish names render in theme accent color (pill removed)
- v62 — meal-level depth: meal blocks raised cards + more gap; dishes flat bordered rows inside
- v61 — event distinction via "Event" pill (later replaced by accent text in v63); meal labels bigger uppercase
- v60 — plan tab de-clutter: removed meal-type icons + event emoji; event dishes toned down; VEG pill on meta row; dropped redundant "serves" when "For" shown; unified meal-head backgrounds
- v59 — trimmed iPhone footer bottom gap (mobile additive 20px→8px)
- v58 — FOOTER FIXED (real root cause): footer padding-bottom:max(…calc(env())…) was resolving to 0px in Chrome, so buttons sat flush at screen edge. v52–v57 all reused this same broken expression → no change ever. Replaced with plain literal padding:12px 16px 20px + simple calc for mobile safe-area. Diagnosed via live getComputedStyle measurements.
- v57 — grid-template-rows 1fr→minmax(0,1fr) (correct but not the root cause); removed v56 position:fixed footer band-aid; mobile overlay 100dvh
- v56 — removed images.weserv.nl proxy (was causing intermittent image loss), direct imageUrl load with accent-stripe fallback (never emoji); removed emoji from recipe cards entirely; reverted unrequested v54 library-top padding
- v55 — CSS Grid layout for recipe detail footer (bulletproof), images.weserv.nl proxy for recipe images, veg filter now works in library overlay, owner filter dropdown added to library overlay, setRecipeFilter calls renderMenuLibraryOverlay
- v54 — flex:1+min-height:0 panel layout, safe-area via overlay padding, addBankToPlanner routes to trip picker when no days, null trip code/name filtered in showAddToTripPicker
- v53 — owner dropdown always shows current user, clearDishModal loads known users on open
- v52 — recipe detail Library Info section (who added, date, trips used), footer always shows +Plan/Edit/Cook buttons, desktop modal top breathing room
- v51 — recipe card image thumbnails, desktop centered modals, veg badge, paywall note, isPaywalledSource helper
- v50 — recipe detail full-screen overlay, view/edit modes, hero image, ingredient/step layout, Add to Plan flow
- v49 — view/edit mode toggle for planner, mobile density improvements, visual polish
- v48 — removed redundant syncFromFirebase from subscribeToCurrentTrip, addDishToTripInBackground writes full trip, checkLibraryHealth() and runSmokeTests()
- v47 — addBankToPlanner closes library overlay before opening dish modal, URL import deduplication by URL
- v46 — addDishToTripInBackground uses TripStore.setTrip()
- v45 — subscribeToCurrentTrip and refreshCurrentTrip use TripStore.setTrip(), dead code removed, grocery search debounced
- v44 — _isLoadingTrip flag, autosave updatedAt guard, mpLog on timestamp guard blocks, window.checkSyncFreshness()
- v43 — removeMealFromDay crash fixed, duplicate trip title removed, dark mode button removed, Add a dish text removed, blank trip grocery warning suppressed, guessDept adds Beverages category
- v42 — blank trip grocery warning suppressed, guessDept Beverages routing
- v41 — version mismatch banner added
- v40 — background Firebase refresh skips renderAll when not newer
- v39 — _isApplyingRemoteChange flag stops ping-pong sync loop
- v38 — syncFromFirebase migrated to TripStore.setTrip
- v37 — restoreFromBackup migrated, sync validation guards added
- v36 — createTrip migrated to TripStore, Firebase callbacks logged
- v35 — TripStore wrapper Phase 1A, openLoadedTrip and goToLanding migrated
- v34 — Phase 0.5 guardrails, mpLog, validateBeforeFirebaseWrite, runRegressionTests, checkVersionEnforcement
- v33 — repairCorruptedTripCodes, renderLanding null key filter
- v32 — openLoadedTrip currentCode assignment fixed

---

## DONE

- Phase 0.5 complete — mpLog, validateBeforeFirebaseWrite, runRegressionTests, checkVersionEnforcement, window.mpDiag ✅
- Phase 1A complete — TripStore wrapper, openLoadedTrip and goToLanding migrated ✅
- Phase 1B complete — createTrip migrated, Firebase callbacks logged ✅
- Phase 1C complete — restoreFromBackup migrated, syncFromFirebase and subscribeToCurrentTrip validation guards ✅
- Phase 1D complete — syncFromFirebase migrated to TripStore.setTrip ✅
- Phase 2A complete — _isApplyingRemoteChange flag, ping-pong loop broken ✅
- Phase 2B complete — background Firebase refresh timestamp check ✅
- v44 sync fix — _isLoadingTrip flag, autosave guard, timestamp block logging ✅
- v45 dead code cleanup, TripStore consistency ✅
- v47 Add to Plan overlay bug fixed, URL dedup added ✅
- removeMealFromDay crash fixed ✅
- Duplicate trip title removed from plan tab ✅
- Dark mode button removed ✅
- Add a dish text removed from empty meal slots ✅
- Blank trip grocery warning suppressed ✅
- guessDept routes beverages to Beverages department ✅
- Version mismatch banner added ✅
- v56 recipe images: removed flaky proxy, direct load, emoji fallback eliminated ✅
- v56 emoji removed from recipe cards (clean accent stripe for no-image) ✅
- v56 reverted unrequested library-top mobile shift ✅
- v58/v59 recipe detail footer cutoff — root cause was max()/env() padding-bottom resolving to 0px; fixed with literal padding ✅
- v60–v63 plan tab de-clutter + meal-level depth (emojis removed, event accent text, VEG pill, unified backgrounds, raised meal cards) ✅
- v64–v65 dish detail VIEW (view/edit split for plan dishes) ✅
- v66 Owner/Cook unified onto assignedTo for plan dishes (owner kept for library) ✅
- v67–v69 dish edit form mobile compaction + scroll-to-Save fix (sticky footer) + veg pill toggle ✅
- v68 compact 2-line ingredient editor on mobile (Original/Adjusted/Unit + name) ✅
- v70 dish view shows imported recipe photo (survives edits via preserved bankRecipeId) ✅
