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

## PENDING ISSUES — FULL LIST

### CRITICAL — Fix these first

0. ~~**Fabricated recipes from URL imports**~~ — FIXED v78 + v79. v78 stopped the no-title case. v79 fixed the ROOT cause: Microlink only returns title/image (never the recipe), so Claude was reconstructing recipes from training data + title → wrong/invented recipes (e.g. Rick Bayless al pastor returned a different al pastor). v79 now fetches the ACTUAL page content via Jina Reader (https://r.jina.ai/{url}) and the prompt forces Claude to extract ONLY from that content — no prior knowledge, no invention — returning {"error":...} if no real recipe is present; import stops (nothing saved) if the page can't be read or no recipe is found. CAVEAT: Jina Reader is a free third-party service; if it's slow/blocked, imports fail (by design — better than fabricating). Verify on the failing URLs. NOTE: Robbie reports URL import is STILL broken — see C7/C8/C9 below for the live issues.

**URL IMPORT — C7/C9 FIXED in v80; C8 confirmed already-blocked. Awaiting Robbie's live verification (NYT link + a normal recipe link).**

C7. ~~**JSON parse error on AI response**~~ — FIXED v80. — Claude sometimes wraps the JSON in markdown code fences (```json … ```) which breaks JSON.parse and the import fails. FIX: strip markdown code fences (leading/trailing ``` and ```json) before JSON.parse EVERYWHERE an AI response is parsed — not just URL import. Audit all JSON.parse call sites on AI output (url-import, recipe-builder, AI add, any agent response) and apply a shared stripFences helper.

C8. ~~**URL import still fabricates recipes when fetch fails**~~ — CONFIRMED ALREADY BLOCKED (v79 empty-page guard <200 chars + no-prior-knowledge prompt). The "fabrication" Robbie saw was actually paywalled pages returning >200 chars of teaser/login text, now caught by C9 (v80). Verify on the failing URLs.

C9. ~~**Paywall detection missing**~~ — FIXED v80. Known hard-paywall hosts (cooking.nytimes.com, nytimes.com) stop up front; pages with paywall markers that yield no recipe show: "This page requires a subscription — copy the recipe text and paste it here instead." Never fabricates.

1. ~~**Recipes reappearing after deletion**~~ — FIXED v93 (merged from branch). subscribeToMenuLibrary now suppresses _recentlyDeletedRecipeIds for 30s and deleteFromMenuLibrary removes locally, so a stale echo can't resurrect a deleted recipe. Verify on live.
2. **Recipe images inconsistent** — RENDERING FIXED in v56 (removed proxy, direct load, no emoji fallback). Confirmed working. REMAINING: many recipes have a link but no stored imageUrl (Flank Steak, Grilled Asparagus, Swordfish Kebabs, etc.) — these need a Firebase backfill that fetches the image from the link and writes ONLY the imageUrl field. Needs sign-off (Firebase write).
3. **DUPLICATE UPLOADS** — PREVENTION DONE v81; CLEANUP STILL PENDING. (a) ✅ broadened dedup — shared findExistingLibraryRecipe() matches by URL OR name+source and is now called on every menuLibrary create-path (confirmRecipeImport, saveDishFromModal bankOnly, executeAddBankRecipe, addDishToTripInBackground, saveImportedToLibrary, saveDishToLibrary). duplicateBankRecipe left alone (intentional duplicate). (c) ✅ all write paths audited. (b) ❌ STILL TODO — clean up the duplicates already in Firebase (e.g. Souvlaki, Esquites). (b) CLEANUP TOOL NOW LIVE (v93): `cleanupDuplicateRecipes()` is a dry-run console tool (lists dup groups via findExistingLibraryRecipe logic, keeps the richest entry); `cleanupDuplicateRecipes({apply:true})` performs the deletes. Never auto-runs. Robbie to run it when ready.
4. **Meal type deletion/re-add flaky** — dishes added back to deleted meals disappear again when another meal is deleted on same day. Firebase listener applying stale snapshots after rapid sequential writes. Verify after v44 sync fix — may partially resolve.
5. **Trip ID null in App Admin on mobile** — shows null on mobile but correct ID on desktop.
6. **Cook photo never shows** — LARGELY FIXED: v93 stamps the cook's photo onto the dish at assign time (doAssignDish → resolvePersonProfile → assignedToPhoto travels to all devices); v71 live-resolves avatars. Original root-cause note kept below for the global directory part (folds into #19). ROOT CAUSE: `_knownUsers` is empty (`[]`). loadKnownUsers reads the whole `/users` collection, which returns nothing — almost certainly Firebase security rules allow reading your OWN `/users/{uid}` but not listing all of `/users`. Each user's photo IS in Firebase at `users/{uid}/profile.photo` and syncs to their own devices (top-right avatar works), but there's no readable global name→photo map. FIX (planned, needs build): capture the cook's photo onto the dish at assign time (self via getUser(); teammates via per-trip presence which carries name+photo) and store as assignedToPhoto, so it travels to all devices and the avatar reads it directly. Optionally also populate _knownUsers from presence as a display fallback. Touches save/assign path — isolate as its own build.

### IMPORTANT — UI Broken

7. **Recipe name cuts off in view mode when too long** — should wrap, header should expand with it.
8. **AI button overlaps send button on mobile** — both need to be tappable.
9. **Meals should always display in typical order** (Robbie) — meal sections must ALWAYS render following `currentEvent.mealTypes` order, even after a meal is removed and re-added (do NOT render in raw `day.meals` array order, which puts re-added meals at the bottom). Canonical order: Breakfast → Lunch → Dinner → Snack → Drinks → Dessert. This also fixes the old "meal reappears at bottom after re-add" bug (#13). Fix: sort each day's meals (or the render order in renderPlanner/renderMealBlock) by each meal's index in `currentEvent.mealTypes` (falling back to getDefaultMealTypes / the dishMeal select order) instead of raw day.meals array order.
10. **Grocery dedup broken** — Smart Dedup renames items but does not merge quantities with existing matching rows. Creates false duplicate flags and split quantities. Dedup rename and quantity merge must happen together using the same key. ROOT CAUSE CONFIRMED (v82 investigation): the aggregator key uses legacyNormKey (`es$`→`e`) but the duplicate-flag banner (aggregateRows ~3524) uses a DIFFERENT normalization (`es$`→``), so the two keys disagree — banner flags dups the merger won't merge. **DANGER for any fix:** groceryMeta (store assignments, Bought status) is keyed by the name-derived normKey, and reconcileGroceryMeta (~3543) DELETES any meta key not in the current aggregation output. So ANY change to how the grocery key/name is derived (incl. the planned groceryName field, #P2) will orphan then DELETE live store assignments unless a key-migration layer is built first. This is why grocery simplification is POST-TRIP only. Required Stage 0 before any grocery-name work: make renames carry old groceryMeta → new key (migrate, don't delete).

### CLEANUP

V. **Vegetarian indicator → VEG pill everywhere** — DONE on plan tab (v60), dish detail view, and dish edit form (green pill toggle, v69). REMAINING: recipe Library cards still show the 🌿 emoji next to the recipe name (renderRecipeCard). Swap for the VEG pill there too for full consistency.


11. **Owner field placeholder never appears** — the placeholder text for the owner field never shows up, needs investigation and fix.
12. **URL import error message misleading on corporate networks** — currently says "Claude may not know this recipe" when the real issue is network blocking. Should say: "Could not fetch the page — this may be blocked by your network. Try on a different connection."
13. **Meal type reappears at bottom after re-add** — see #9 above.

### DISH CARDS AND PROFILE PHOTOS

14. **Plan view dish cards** — show profile photo of assigned cook when dish is assigned to someone. Show nothing when unassigned. No placeholder avatar.
15. **Recipe detail view** — show profile photo and name of assigned cook in detail section. Not on library card, only in detail view. Use existing profile photo from _knownUsers registry. Gracefully handle no photo — show initials fallback only, no broken image.

### COOKING MODE — revisit as a group later (per Robbie)

C0. **COOKING MODE REDESIGN — "kitchen command center" (Robbie approved the vision; its own session, AFTER the current confirmed round).** Reframe cooking mode from a single-recipe slideshow into a hub for a cook juggling several dishes at once, with all info in a clean view. Sub-items in priority order:
   - **C0a (PRIORITY — also a bug): timers that persist + run in parallel.** TODAY: exiting cooking mode stops + hides the timer (Robbie confirmed). WANT: multiple simultaneous timers (one per dish/step) that KEEP running in the background when you leave a step, switch dishes, or exit cooking mode; a persistent "active timers" strip visible even outside cooking mode; clear alert + "what to do now" when one fires; re-entering resumes everything still ticking. (Engine has _cookTimer + _cookDishState per-dish state to build on.)
   - **C0b: multi-dish dashboard** — one screen showing every dish in the meal: current step, running timer, status (prepping/cooking/resting/done); tap a dish to focus while the others keep cooking; an "up next across everything" line.
   - **C0c: coordination/timeline** — extend the existing AI pre-cook overview into a "do this now / start that in 10 min" sequence so dishes finish together.
   - **C0d: clean focus view** — big current step, faint next-step preview, prominent timer, just-this-step ingredients with check-off; strip clutter (includes C1 emoji removal).
   - **C0e: QoL** — keep screen awake (have it), big tap targets, swipe between steps/dishes, stretch: voice "next"/"start timer".
   Fold C1 + C2 (per-dish cook button hidden in view mode) into this session.

C1. Emojis still present in cooking mode (v56 only removed them from recipe library cards). Cooking mode needs its own design pass — defer until we tackle cooking mode as a whole. (Folds into C0d.)
C2. **Cooking mode — meal-level Cook button FIXED v82; per-dish view-mode button still hidden.** v82 fixed the meal-level "Cook" button (hasCookable now scans recipeBank ∪ _menuLibrary + dish steps). REMAINING (defer with cooking-mode session): the per-dish cook button lives in .dish-footer-row which v49 hides in view mode. Original diagnosis below.
C2-orig. **Cooking mode — engine works, entry buttons gone (diagnosed).** The cooking engine (cookRecipe/cookMeal/_findRecipeForCook/#cookingMode/renderCookingStep) is intact and correctly wired; _findRecipeForCook even resolves a plan dish via bankRecipeId or its own steps. The "not working" is discoverability: (a) the per-dish cook button is in .dish-footer-row which v49 HIDES in view mode (only Edit mode shows it); (b) the meal-level "Cook" button has a real bug — its hasCookable check (renderMealBlock, ~line 2883) only scans currentEvent.recipeBank, but recipes now live in _menuLibrary, so it almost never appears. FIX when we do cooking mode: hasCookable should check (recipeBank ∪ _menuLibrary) AND the dish's own steps. Cooking still reachable today via the dish detail view's Cook button (if the dish has steps). Per Robbie: cooking mode deferred to its own later session.

### AI AGENT — wants a redesign (per Robbie)

A1. **AI agent is clunky and ugly** — works well functionally but the UX/visual design needs work. Improve the chat panel look, input area, message styling, and overall interaction flow. Its own design session (like we did for the dish view). v73 raised its z-index so it's reachable over modals; this is the broader polish.

A2. **AI agent input doesn't clear after send (desktop) — FIX NEXT ITERATION (Robbie).** On desktop, after pressing Send/Enter the AI chat textarea keeps the sent text, so you can't immediately type the next message. Expected: on send (button OR Enter), clear the input (#aiChatInput) and reset its auto-grow height so it's ready for the reply. Check sendAiChat() / the Enter handler — the input.value is not being cleared (regression; was working before). Also verify the build-recipe send path (sendBuildRecipeMessage) clears its input too.

### NEW FEATURES — After all bugs fixed

16. **Group by toggle on recipe library** — sections by category, owner, date added (most recent first).
17. ~~**View vs edit mode for dishes**~~ — DONE (v64–v70): tap a plan dish → read-only view (showDishDetail) reusing recipe-detail format; Edit → existing form; edit form compacted (v67–v69); 2-row ingredients (v68); imported image shown (v70).
18. **App Admin vs Trip Settings restructure** — universal settings must be separated from trip-specific settings. Collapsible sections. Clean separation required before building permissions.
19. **User management tab in App Admin** — grid of all users who have logged in, which trips they have accessed, ability to manually add users to trips.
    - **Includes: "cook dropdown should list everyone who's ever logged in" (per Robbie).** This is the same need — a readable user directory. Root cause: Firebase rules let a user read their OWN /users/{uid} but NOT list /users, so _knownUsers is empty and the cook dropdown can only show current user + known + anyone in presence (v76 interim). The real fix is the user directory + the rules to read it — which belongs to this build (#19) plus permissions/rules (#20), NOT a one-off patch. DECISION (Robbie): fold the cook-dropdown fix into the bigger user-management/permissions architecture rather than band-aiding now.
    - Foundation options to decide during build: (A) allow authenticated read on /users via rules, or (B) maintain a readable userDirectory node written on login. This also fixes cook photos app-wide.
20. **Admin permissions system** — admin roles, Firebase security rules. Build only after #18 is complete.

21. **iOS Share Extension** (long-term roadmap, Robbie — NOT for now) — an iOS share-sheet extension to import paywalled recipes (NYT Cooking, etc.) by sharing the rendered page from Safari, where the content is already loaded and visible, bypassing the fetch/paywall problem. Future roadmap only; do not build yet.

23. **Cook time end-to-end (Robbie, list only — do NOT build yet)** — cooking time from recipe import must persist to the LIBRARY and travel to the MEAL PLAN dish, and show on the DISPLAY/detail view of BOTH for every recipe. Current state to verify/finish: a `cookTime` field already exists (normalizeDish keeps it; URL/photo import extracts it; renderRecipeCard shows ⏱ and showRecipeDetail shows it in the meta row). Gaps likely: (a) confirm cookTime is copied onto the plan dish when a recipe is added (addDishToTripInBackground / addBankToPlanner / saveDishFromModal) and preserved on edit; (b) confirm showDishDetail (the meal-plan dish view) renders cookTime in its meta row like showRecipeDetail does; (c) confirm imports reliably populate it. Make it visible and consistent in both places.

24. **Paste Full Recipe should pull STEPS (Robbie, list only — do NOT build yet)** — the "Paste Full Recipe" parse (pasteFullRecipe ~line 3235) extracts ingredients ONLY; its prompt schema is {name,servings,ingredients,notes} and it explicitly says "Exclude … instructions". So pasted recipes have NO cooking steps → cooking mode won't work for them. URL import + photo import already pull steps. FIX: add "steps":[...] to the paste schema, remove "instructions" from the exclusion, and call populateSteps(recipe.steps) in applyParsedRecipe (~line 3204) — same populateSteps the URL import uses. Small, additive.

26. **Click a grocery row's dish pill to edit that dish's item inline (Robbie) — list only.** On the grocery list each row shows .grocery-dish-pill chips (renderGroceryTable ~line 3800) naming the dish(es) the item comes from — currently DISPLAY-ONLY. Want: click a dish pill → edit that dish's grocery item (at least the grocery name; ideally also the raw item/qty) → saves back onto the dish in the meal plan → re-flows into the grocery tab. So you can fix something spotted on the list without navigating back to the dish. FEASIBLE — builds on v100. NEEDED: aggregateRows currently carries dish NAME only (row.dishes / row.usedFor) — add the dish ID + the ingredient index per contribution so the pill can target the exact dish+ingredient; then wire the pill onclick. (A row can aggregate several dishes, so each pill edits its own dish's copy.)
   DECISIONS LOCKED (Robbie): **Q1 = full edit** — clicking the pill edits the WHOLE ingredient (item, quantity, unit, AND groceryName), not just the grocery name. It must save back onto the dish and flow EVERYWHERE exactly as if edited on the main meal-plan dish screen (commitAndSync → renderAll + buildGroceryList; same effect as editing the ingredient in the dish editor). So this opens a small ingredient editor (qty/unit/item/grocery name), not just a name prompt. **Q2 = tiny picker** when a single dish has 2+ ingredients rolling into the same grocery row (expected rare) — let the user pick which ingredient. **Never show raw IDs** in any UI — show the ingredient text / dish name only; ids are internal.

28. **Trip header photos don't sync across devices/users (Robbie) — list only, sync change so do it CAREFULLY + tested.** The header "picture up top" comes from a per-theme GALLERY stored in localStorage (getThemeGallery/setThemeGallery, GALLERY_KEY) = PER DEVICE. Only the single ACTIVE image syncs: setThemeGallery writes trips/{code}/themePhoto {url,posX,posY,theme}; applyThemePhotoFromTrip reads it on open. GAPS: (1) the gallery never syncs — added pictures live only on the device that added them; (2) adding without setting active writes nothing to Firebase; (3) themePhoto only re-applies on reopen, not on a live sync update. FIX (robust): store the gallery in the trip data (e.g. trips/{code}/themeGallery, merged with local defaults on load) so all added pictures are available + consistent for everyone; apply themePhoto/gallery on REMOTE sync updates (subscribeToCurrentTrip) not just initial open; consider that uploaded photos may be large data URLs — host/resize or store as URLs. Touches theming + sync; test on 2 devices. Quick partial if needed: when a photo is added, also offer/auto set-active so at least themePhoto syncs it.

27. **Grocery/shopping cleanup (Robbie) — section grouping + better categories.** Robbie likes the easy check-off; don't break it. Two parts: (A) **VISUAL SECTIONS when sorted by Store or Department** — group rows under clear (ideally sticky) headers per store / per department with an icon + a "X of Y" count. The .grocery-section-row mechanism ALREADY emits headers (renderGroceryTable ~line 3847: only when grocerySortMode is store/department, NOT alpha). BUG Robbie hit (headers show on PC, not laptop): line ~603 `.grocery-section-row{display:none!important;}` inside the narrow/mobile (~≤768px) media query HIDES them in the compact card layout — so a narrower window drops them. FIX: un-hide + restyle section headers to work in the mobile/card grid layout so they're consistent on every screen; also surface them in shopping mode; add per-section counts. (Also note grocerySortMode is per-device localStorage, so devices can differ.) (B) **BETTER ITEM CATEGORIZATION (guessDept)** — currently confusing: "pepper" / "salt and pepper" land in Produce because the produce rule matches the word "pepper". FIX: add a **Spices & Seasonings** dept (salt, pepper, black pepper, cumin, paprika, oregano, cinnamon, chili powder, garlic powder, bay leaf, etc.); only bell/red/green/jalapeño/chili PEPPER → Produce; tighten other keyword false-positives. Consider letting the user tap an item to re-assign its dept (may already exist). If rules stay imperfect, AI-categorization is a later option (costs spend; keep code-based for now).

25. **Image sourcing misses simple AI/no-URL recipes (Robbie) — list only.** AI-generated "Peach, Arugula & Burrata Salad" pulled no picture. sourceRecipeImage tries the recipe URL first (none here) then Spoonacular complexSearch by the FULL name — a long/specific title (commas, &) rarely matches Spoonacular's ~5k titles, so it returns nothing. DECISION (Robbie): URL/Microlink image stays ALWAYS the first solution. Then (a) simplify the Spoonacular query (strip commas/&/prep words, try the core dish e.g. "burrata salad"). DEFER (b) the general Unsplash/Pexels fallback for now — only add if too many still come up blank. Note: _imageFetchAttempted marks a recipe "tried" for the session, so after improving, a page reload is needed to retry the ones that already failed.

22. **Archive trips + "Past trips" view** (Robbie, requested — list only, do NOT build yet) — let the user archive a trip and easily see past/archived trips separately from active ones. Likely an `archived` flag on the trip + an "Archived/Past trips" section or toggle on the landing/trip-picker. Must not delete trip data — archiving only hides from the active list. Decide: per-trip archive action, where past trips surface (landing section vs filter), and whether archived trips still sync/count.

---

## CHANGELOG

- v100 — edit grocery names: tap any ingredient in a recipe or dish detail view to set/override its grocery-list name (editGroceryName via promptAction, prefilled with the current name). Recipe detail edits the library recipe (targeted menuLibrary/{id}/ingredients write); dish detail edits the plan dish (commitAndSync). Rebuilds the grocery list + re-renders the detail. A hint line + pill tooltip indicate it's tappable. renderGroupedIngredientsHtml now takes a ctx {type,id}.
- v99 — grocery names work FRONT-TO-BACK. Root insight: groceryName lives on ingredients, which exist in TWO copies — library recipes AND the trip's dishes (copied on add-to-plan). The grocery list + meal plan read from currentEvent.dishes, so cleaning only the library (v96) never reached them → no pills on the meal plan. Now: (a) _cleanTripDishes() cleans the OPEN trip's dishes + commitAndSync; (b) SELF-HEALING _autoHealGroceryNames() runs from buildGroceryList — first time a trip's grocery list builds, it auto-fills any missing names (once/trip/session, re-entry guarded, transparent "Tidying grocery names…" toast), then renderAll so the plan pills appear; (c) the backfill button now cleans library AND the open trip; (d) adding a cleaned recipe to a plan already inherits groceryName (normalizeDish preserves it). So regardless of how an ingredient arrives (URL/photo/paste/manual), it gets a grocery name and the pill shows everywhere + the list merges by it. Shared helpers: _cleanIngredientNames, _ingNeedsGroceryName, _tripHasMissingGroceryNames. NOTE: pill only shows when the grocery name differs from the item (by design). Auto-heal uses the Anthropic key (bounded to the open trip's dishes, once/session).
- v98 — FIX: backfills said "open the Recipe Library first" when run from App Admin (can't be in both). New _ensureLibraryLoaded() one-shot fetches menuLibrary on demand (no-op if a live subscription already populated it); both backfillGroceryNames + backfillMissingImages now load the library themselves and show "Loading your recipes…". So "Clean grocery names (AI)" / "Backfill missing images" just work from anywhere.
- v97 — FIX: "Clean grocery names" crashed when run with no trip open. backfillGroceryNames called buildGroceryList → aggregateRows did currentEvent.dishes.forEach on a null currentEvent. Fix: aggregateRows returns [] if !currentEvent (defensive root fix); backfillGroceryNames + the at-import trigger only call buildGroceryList when a trip is open. PLUS (Robbie's request): both backfills now show TOAST notifications instead of console-only — start ("Cleaning grocery names for N…" / "Sourcing images for N…"), done ("✓ Cleaned N recipes, M more — run again" / "✓ Added N images (M had no online match)"), and clear messages for no-key / library-not-open.
- v96 — grocery simplification Stage 2b: AI grocery-name cleaning. cleanGroceryNames(items) = one batched Haiku call that simplifies each ingredient to its shopping-list name (strips qty/package/brand/prep words; keeps real distinctions like "crushed tomatoes"; NEVER invents/adds/merges). _applyGroceryNames(recipe) sets ingredient.groceryName for ones missing it and persists a TARGETED write to menuLibrary/{id}/ingredients (guarded: only when there are ingredients + actual changes; preserves all ingredient fields). Runs (a) at import (confirmRecipeImport, async non-blocking) and (b) via window.backfillGroceryNames() / the new Settings button "Clean grocery names (AI)" (15 recipes/run, paced 1s). The cleaned name flows into the v95 pill + the v94 grocery-list merge. NEXT v97: editable "Grocery name" field in the dish edit form for manual overrides.
- v95 — grocery simplification Stage 2a: show BOTH names. normalizeDish now PRESERVES a per-ingredient groceryName (it previously rebuilt ingredients with only known fields, so groceryName would've been dropped on every load — this is the must-fix foundation). Inline 🛒 pill (.grocery-name-pill) shows the grocery-list name next to the original ingredient in the detail views (renderGroupedIngredientsHtml → recipe + dish detail) and the plan card's collapsed ingredient list — only when it differs from the item, so no clutter. Uses groceryDisplayName (heuristic now; AI fills groceryName in v96). Render-only + one additive normalize field; stored ingredients untouched. NEXT v96: AI cleaning at import + window.backfillGroceryNames() tool. v97: editable Grocery name field in the dish edit form.
- v94 — GROCERY SIMPLIFICATION Stage 1 (#10/#2, option A exact-unit, render-only, NO writes to dish data). (a) groceryDisplayName(ing) = stored groceryName if present (Stage 2 AI later) else heuristic (text before first comma, drop trailing parenthetical); aggregateRows now merges on this cleaned name so "crushed tomatoes, drained" merges with "crushed tomatoes". (b) _groceryNameNorm() is now the SINGLE name normalization used by BOTH the merge key (legacyNormKey) and the duplicate-flag banner — they previously used different plural rules, which is why the banner flagged dups the merger wouldn't merge (#10 false flags + split qty). The stored dish ingredients are NEVER modified — this only changes how the grocery list groups/displays. Grocery meta (store assignments) re-keys to cleaned names (Robbie: not using grocery state now, acceptable). NEXT: run diagGroceryItem('orange juice') to confirm the quantity-split root cause for Stage 3; Stage 2 = AI groceryName at import.
- v93 — MERGED the overnight-data-risk branch items to live (reviewed; 25/25 regression confirmed on v92 first). Cherry-picked: #1 menuLibrary echo guard (subscribeToMenuLibrary suppresses _recentlyDeletedRecipeIds for 30s + deleteFromMenuLibrary removes locally — deleted recipes stop reappearing); #3 window.cleanupDuplicateRecipes() (dry-run console tool; deletes only on {apply:true}); #6 cook photo stamped at assign time (doAssignDish uses resolvePersonProfile so assignedToPhoto travels); #10 window.diagGroceryItem() (read-only grocery diagnostic — prerequisite for the grocery quantity fix). #1 touches the sync listener and #6 the save path (both additive); re-run runRegressionTests() to confirm 25/25 on v93.
- v92 — auto-source recipe images (#5, Robbie's spec). New sourceRecipeImage(recipe,opts): (1) the recipe URL's OWN photo via Microlink (always preferred), (2) else a similar dish via Spoonacular complexSearch (needs image API key), then PERSISTS to menuLibrary/{id}/imageUrl (targeted write, like v75) — guarded to library recipes only (fromLibrary / in _menuLibrary) so it never writes a bogus entry for a plan-dish id. Triggers (each only when no real image): opening a library recipe detail; saving a bank recipe (force-updates when a URL was just added → "URL added later updates image"); confirming an import (fills photo-imported recipes that now have no image). window.backfillMissingImages() console tool fills up to 25 image-less library recipes, paced 1.2s. New Settings card "Recipe Image Key (Spoonacular)" — getImageApiKey/saveImageApiKey/clearImageApiKey (local-only key; found images persist so all devices see them) + a Backfill button; syncAdminInputs populates it. _imageFetchAttempted dedups per session. NEEDS a Spoonacular key (free, spoonacular.com/food-api) for the online-search fallback; URL-photo path works without it. NOT runtime-verified (can't test Spoonacular/CORS/vision from here).
- v91 — FIX wrong recipe images (Robbie): uploaded screenshots must NOT be the recipe image. (a) photo/AI import no longer stores the screenshot as recipe.imageUrl (removed the line in _extractRecipeFromImages); (b) replaced v90's _fallbackRecipeImage (library-borrow, which spread one screenshot to 4 recipes) with _displayImageUrl(recipe) = show imageUrl ONLY if it's a real http(s) URL — this also DROPS already-stored data: screenshot images at render time (no Firebase write) so the 4 wrong images disappear; (c) no more borrowing another recipe's photo. Wired into renderRecipeCard + both detail heroes (and the dish→library resolution). STILL TODO (asked Robbie): online image sourcing — recipe URL first (Microlink already does this for URL imports), then a similar dish online for photo-imported recipes that have no URL. Render-only, no writes.
- v90 — recipe image fallback (#5, render-time) + finish v89 button on mobile. _fallbackRecipeImage(recipe): when a recipe has no image of its own (and, for plan dishes, no linked-library image), borrow one from another library recipe whose name shares a significant (>3 char) word — wired into renderRecipeCard, showRecipeDetail hero, showDishDetail hero (last resort). RENDER-TIME ONLY — never writes to Firebase, so nothing wrong persists and it's trivially reversible. ALSO: #aiPhotoBtn gets the 36px mobile treatment so the AI chat 📷/✶/↑ buttons don't crowd. CAVEATS (eyeball these): borrowed images can look slightly off (showing a similar recipe's photo); plan dish CARDS still don't show image thumbnails (adding them is a layout decision — deferred); true "source from URL then persist" backfill is window.backfillRecipeImages (v75) + needs the fallback-source decision for a persistent version. NOT runtime-verified.
- v89 — AI assistant photo import (#4): 📷 button + hidden multi-file input in the AI chat input row → aiChatImportFromPhotos → reuses the v87 vision core (_extractRecipeFromImages) → standard import review panel (Save → library, v81 dedup). Posts chat status messages; same strict no-fabrication contract. Additive, client-side; save path is the existing reviewed one. NOT runtime-verified.
- v88 — pull-to-refresh on the home/landing screen no longer errors "No trip open" (#1). The global pull handler (setupPullToRefresh touchend) now branches: if a trip is open → refreshCurrentTrip; else (landing) → loadUserTripsFromFirebase + renderLanding + "Refreshed." toast. Render/data-read only, no writes.
- v87 — Photo import overhaul + mobile import-card fit. (a) MOBILE FIT (#3): entry-tabs wrap (flex-wrap) + 2×2 on ≤560px, shorter labels (Paste Recipe / Ingredients), removed duplicate 'active' on pasteRecipePanel so only one panel shows on open. (b) PHOTO IMPORT: dropped capture="environment" so iPhone shows the Photo Library (pick screenshots) + added multiple; new drop/paste zone — paste a screenshot (Ctrl/⌘+V, scoped so it never hijacks text paste) or drag images in; MULTI-IMAGE staging with thumbnails + remove + "Extract recipe from photos" so a recipe spanning several screenshots is combined in ONE Claude vision call. Refactored into shared _extractRecipeFromImages(dataUrls) (reused by the AI bot in v89); importFromImage kept as a back-compat single-file wrapper; first image → recipe.imageUrl. Same strict no-fabrication contract. Additive, client-side only, no Firebase/data changes. NOT runtime-verified (paste/camera/album behaviour needs real devices).
- v86 — recipe library GROUP-BY toggle (#16): All / By chef / Recently added, rendered at the top of the library overlay (renderMenuLibraryOverlay). Owner groups by r.owner||r.addedBy; date groups by savedAt/addedAt month, most-recent first, with formatted "Month YYYY" headers + counts. New _recipeGroupBy state + setRecipeGroupBy(). Render-only, no data writes. NOTE while here: #7 (recipe name wrap in view) and #8 (AI Build vs Send button overlap on mobile) were ALREADY fixed in v72 (index.html lines ~1399 and ~1403); #14/#15 (cook avatar on plan card + detail) already done in v71. Verified present, not re-done. "Category" grouping skipped — recipes have no category field (would require inventing one); offered the two groupings that map to real fields. NOT runtime-verified.
- v85 — IMPORT FROM PHOTO (new) + import transparency. New "📷 Photo" tab in the dish-modal import card: camera/file → _downscaleImage (canvas, max 900px, JPEG q.72) → Claude vision (claude-haiku-4-5, base64 image block) with the SAME strict no-fabrication contract as URL import ({"error"} if no recipe, extract only what's visible) → existing showRecipeReviewPanel → confirmRecipeImport (v81 dedup). Downscaled photo stored as recipe.imageUrl (fixes "paste has no image"). switchEntryMode extended with 'photo'. Reuses stripJsonFences/getApiKey/showRecipeReviewPanel/makeId/getTodayStr. Transparency: URL-import no-recipe failures now say "nothing was imported (no recipe invented)" + point to Paste/Photo; success toast names source ("Extracted from the page at <host>"). Additive, no Firebase/sync changes. NOT runtime-verified (can't test vision extraction from here).
- v84 — meals render in canonical order (#9/#13) — orderedDayMeals() sorts a day's meals by trip mealTypes then canonical Breakfast→Lunch→Dinner→Snack→Drinks→Dessert; returns a sorted COPY, never mutates day.meals (display-only). Fixes "re-added meal jumps to bottom".
- v83 — ingredient sort toggle (Section / Recipe order / A–Z) at top of detail-view ingredients (setIngSort re-renders open detail; showRecipeDetail now nulls _dishDetailId) + cooking blank fix (getCurrentCookingRecipe uses _findRecipeForCook so a plan dish resolves instead of rendering blank). Render/lookup only.
- v82 — pre-trip safe build (render-only, no data writes). P0: meal-level Cook button now appears for _menuLibrary recipes — renderMealBlock hasCookable scans recipeBank ∪ _menuLibrary (matching what cookMeal already resolves from) and also counts a dish's own steps (fixes C2 meal-level bug). P1: (a) removed notes/expandable body + "tap for notes" from plan dish cards (notes still reachable via showDishDetail); (b) recipe + dish detail views group ingredients by grocery department (shared renderGroupedIngredientsHtml using guessDept; single-group recipes render flat); (c) strip baked-in "Step N:"/"N." prefixes from steps in both detail views (cleanStepText, delimiter-anchored so "2 eggs, beaten" is safe). NOTE: the briefed "VEG pill on library cards" was already done in v72 — the 🌿 the brief pointed at is in dead renderRecipeCardLocal_unused; skipped. GROCERY SIMPLIFICATION (P2) DEFERRED to post-trip — see #10 note (changing the name-derived grocery key would orphan groceryMeta and reconcileGroceryMeta would delete live store assignments).
- v81 — duplicate-upload PREVENTION (#3, prevention half). New shared findExistingLibraryRecipe(recipe,excludeId) helper (match = same normalized URL OR same name+source; conservative; never deletes), applied to EVERY menuLibrary create-path: saveDishToLibrary (upgraded from name-only), saveImportedToLibrary, executeAddBankRecipe (AI add), confirmRecipeImport (URL import), addDishToTripInBackground (reuses existing lib id so the trip dish points at it), and saveDishFromModal bankOnly (NEW saves only — editing path untouched). On a match the path reuses the existing recipe and shows "already in your library" instead of writing a second entry. Prevention only — no existing data read/changed/deleted. CLEANUP of EXISTING duplicates still pending (Robbie chose prevention-only this build).
- v80 — URL import hardening. (C7) shared stripJsonFences() helper applied to the two AI-parse sites that lacked it: <actions> parser and <recipe_draft> parser (URL-import parser already stripped fences). (C9) paywall handling in backgroundImportAndReview: known hard-paywall hosts (cooking.nytimes.com, nytimes.com) stop up front with "This page requires a subscription — copy the recipe text and paste it here instead."; and if Claude finds no recipe AND the page text has paywall markers, the same subscription message shows instead of the generic "no recipe." (C8) confirmed: v79's empty-page guard + no-prior-knowledge prompt already block pure fabrication; the apparent "fabrication" was paywalled pages returning >200 chars of teaser/login text — now caught by C9. No Firebase/sync/save logic touched (all changes are in the fetch/parse path before any write).
- v79 — URL import extracts from REAL page content via Jina Reader (r.jina.ai); prompt forbids prior knowledge/invention; stops (nothing saved) if page unreadable or no recipe. Verified working (correct recipe pulled).
- v78 — stop URL import when no page title fetched (no fabrication from empty content)
- v77 — Microlink cache-bust (&force=true) + confirm-the-page step before parsing
- v76 — cook dropdown/assign picker include presence users via getAssignableUsers() (newly-joined teammates show when online); interim for the user-directory need (#19)
- v75 — image backfill tool window.backfillRecipeImages() (console-triggered, targeted menuLibrary/{id}/imageUrl writes only, rate-limited); verified URL-import dedup (#7) intact
- v74 — AI assistant polish: fixed unstyled recipe-builder/url-import messages (ai-msg-user/ai-msg-ai had no CSS), flatter header/cleaner bubbles/input; AI fab lifts above dish modal Save footer
- v73 — AI chat fab+panel z-index raised (9150/9151) so the assistant is reachable over modals (dish edit, recipe detail, library)
- v72 — quick wins: recipe detail name wraps; AI "Build Recipe" icon-only on mobile (no send-button overlap); VEG pill on library cards (no more 🌿 emoji); network-aware URL import error message
- v71 — cook avatar photos via live resolution (resolvePersonProfile: getUser → presence → known users → initials); no data writes/bloat
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

- **Session v80→v101 (2026-06-04/05)** — URL-import hardening + paywall (C7/C8/C9), import-from-photo (album/multi-shot/paste/drop) + AI-bot photo import, dup PREVENTION (#3a) + dup-cleanup tool (#3b live), recipe-image fix (no screenshots) + auto-sourcing (Spoonacular) + image fallback, echo guard (#1), cooking blank fix, meal order (#9/#13), pull-refresh fix, library group-by (#16), cook-photo-at-assign (#6), and **grocery simplification (#10/#2) front-to-back** (AI groceryName, 🛒 pill everywhere, self-heal, tap-to-edit, fixed section categorizer). 25/25 regression confirmed on v101. See CHANGELOG for per-version detail. ✅

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
- v71 cook avatar photos (live resolution, self + online teammates) ✅
- v72 quick wins (name wrap, AI/send button, VEG pill on library cards, import error wording) ✅
- v73 AI chat reachable over modals (z-index) ✅
- v74 AI assistant polish + fixed unstyled message bubbles ✅
- v75 recipe image backfill (all linked library recipes filled with photos) ✅
- #7 URL-import duplicate guard verified intact ✅ (NOTE: insufficient — see #3, dup uploads still occur)
- v76 cook dropdown includes presence users (interim) ✅
- v77 Microlink cache-bust + confirm-page step ✅
- v78 stop import when page unfetchable (no fabrication) ✅
- v79 URL import reads REAL page content via Jina Reader, no fabrication — VERIFIED working ✅

## OVERNIGHT AUTONOMOUS RUN (2026-06-04) — SUMMARY

Ran the agreed list (everything EXCEPT #18 App Admin restructure and #21 iOS Share Extension) unattended. Safe render-only work pushed to **live `main`**; data/sync/delete work committed to branch **`overnight-data-risk`** (NOT deployed — review before merge). Every build: `node --check` + static checks (version/tag/title agree, no NEW duplicate functions, guardrail flags present). **Browser `runRegressionTests()` 25/25, phone testing, and vision-extraction quality were NOT verifiable from here** — live builds are "landed, syntax-clean, not human-verified."

**LIVE (main, deployed) — test on phone:**
- v83 ingredient sort toggle (Section/Recipe/A–Z) + cooking blank fix (getCurrentCookingRecipe→_findRecipeForCook).
- v84 meals in canonical order (display-only).
- v85 **Import from Photo** (Claude vision, no-fabrication, photo→imageUrl) + import transparency wording.
- v86 recipe library **group-by** (All/By chef/Recently added).
- (v82 earlier: meal-level cook button, notes off cards, grouped ingredients, step-prefix strip.)
- Stale list items verified already-done: #7 name-wrap + #8 AI/Send overlap (v72); #14/#15 cook photos (v71). Not re-done.

**BRANCH `overnight-data-risk` (NOT deployed — review/test before merging; no APP_VERSION bump, set at merge):**
- **#1** menuLibrary echo guard — `_recentlyDeletedRecipeIds` (30s TTL) so a stale snapshot can't resurrect a deleted recipe; `deleteFromMenuLibrary` records id + removes locally.
- **#3** `window.cleanupDuplicateRecipes()` — DRY-RUN by default; lists dup groups (key = findExistingLibraryRecipe), keeps richest; deletes only on `cleanupDuplicateRecipes({apply:true})`.
- **#6** cook photo stamped at assign time — `doAssignDish` uses `resolvePersonProfile` so `assignedToPhoto` travels to all devices.
- **#10 (diag only)** `window.diagGroceryItem('orange juice')` — non-destructive; shows per-dish scaled qty/unit + the `normKey` merge key, and counts distinct keys (>1 = split-quantity root cause).

**DEFERRED — built blind would be unsafe; need runtime testing / your input (NOT done):**
- **#4** meal delete/re-add — sync-listener race (stale snapshot after rapid writes). Lives in the trip sync/timestamp path; needs reproduction + careful guard with live observation. Did NOT touch the sync path speculatively.
- **#10 (real fix)** grocery key-migration: the merge key derives from the ingredient name; `reconcileGroceryMeta` (~line 3543) DELETES any `groceryMeta` key not in the current aggregation, so changing the name/key without a migration layer WIPES live store assignments. **Required design:** before changing any key, for each new row look up meta under new key → legacyKey → and a name-rename map (old normKey → new normKey carried on the ingredient), and make `reconcileGroceryMeta` MIGRATE (copy old→new) instead of delete on a recognized rename. Build + verify with real MDW 2026 data, post-trip. Use `diagGroceryItem` to confirm the split first.
- **#19/#20** user directory + Firebase security rules — untested rules can lock out all users; needs careful design + staged testing, with you. (Excludes #18.)
- **A1** AI agent redesign — you wanted this as its own design session.
- **#5** trip-ID-null on mobile — not reproducible without your device.

**AM checklist (live):** hard-refresh to v86. (1) cooking a plan dish with steps no longer blanks; (2) ingredient sort toggle works in detail view; (3) meals show in canonical order; (4) 📷 Photo import a recipe photo → review → saves with the photo as image; (5) library group-by toggle; (6) `window.runRegressionTests()` = 25/25. Then review the `overnight-data-risk` branch together before merging any of it.

---

## NEXT SESSION — start here

STATE (session ended at v101): this session shipped v80→v101. **25/25 regression CONFIRMED on v101.** Working tree clean. DONE this session: URL-import hardening + paywall (C7/C8/C9), import-from-photo (album/multi-shot/paste/drop) + AI-bot photo, dup PREVENTION (#3) + a dup-cleanup console tool, recipe image fix + auto-sourcing (Spoonacular), echo guard (#1), cooking blank fix, meal order (#9), pull-refresh fix, library group-by (#16), and **grocery simplification (#10/#2) DONE front-to-back** (AI-cleaned groceryName, 🛒 pill everywhere, self-heal on the plan, tap-to-edit, fixed section categorizer). Robbie is living with v101 / testing before more features.

1. **Confirm v101 in real use first** (grocery pills+sections+edit, imports, image sourcing, sync on a 2nd device). Fix anything that surfaces on this STABLE base before adding features.
2. **Existing-duplicate cleanup (#3, cleanup half) — tool is LIVE:** run `cleanupDuplicateRecipes()` (dry-run, lists groups) then `cleanupDuplicateRecipes({apply:true})` to remove dupes already in Firebase (keeps the richest entry; never auto-runs).
3. **BIG NEXT FEATURE (its own focused session): App Admin / user-management / permissions cluster #18 → #19 → #20.** #18 first (split universal vs trip settings, collapsible), then #19 (user directory + cook dropdown), then #20 (Firebase security rules — untested rules can lock out all users; stage carefully WITH Robbie).
4. **Remaining bugs (not blockers):** #4 meal delete/re-add flakiness (sync-listener race — needs reproduction + careful guard with live observation; do NOT touch the sync path blind); #5 trip-ID-null on mobile (needs Robbie's device); A1 AI-agent visual redesign (its own design session).
5. **Dropped/accepted:** orange-juice quantity split (#10 quantity — Robbie can't reproduce); AI-generated recipes with no online image match stay blank (accepted).

NOTE: the v99 self-heal spends ~0.1¢/recipe on Robbie's Anthropic key to clean grocery names (cached, one-time); Robbie is OK with it. To make it button-only, gate _autoHealGroceryNames().
