# MEAL PLANNER — BACKLOG (full detail)

Full verbose detail for every pending/backlog item. CLAUDE.md carries only a one-line index of the ACTIVE ones and points here. Closed items kept at the bottom for reference. When an item ships, summarize it in CHANGELOG.md and either strike it here or move it to the closed section.

---

## CRITICAL

2. **Recipe images inconsistent** — RENDERING FIXED in v56 (removed proxy, direct load, no emoji fallback). Confirmed working. REMAINING: many recipes have a link but no stored imageUrl (Flank Steak, Grilled Asparagus, Swordfish Kebabs, etc.) — these need a Firebase backfill that fetches the image from the link and writes ONLY the imageUrl field. Needs sign-off (Firebase write). (Largely addressed by v92 sourceRecipeImage + v111 Pexels fallback + backfillMissingImages; remaining = proactive on-save sourcing, see #25.)

3. **DUPLICATE UPLOADS** — PREVENTION DONE v81; CLEANUP STILL PENDING. (a) ✅ broadened dedup — shared findExistingLibraryRecipe() matches by URL OR name+source and is now called on every menuLibrary create-path (confirmRecipeImport, saveDishFromModal bankOnly, executeAddBankRecipe, addDishToTripInBackground, saveImportedToLibrary, saveDishToLibrary). duplicateBankRecipe left alone (intentional duplicate). (c) ✅ all write paths audited. (b) ❌ STILL TODO — clean up the duplicates already in Firebase (e.g. Souvlaki, Esquites). CLEANUP TOOL LIVE (v93): `cleanupDuplicateRecipes()` is a dry-run console tool (lists dup groups via findExistingLibraryRecipe logic, keeps the richest entry); `cleanupDuplicateRecipes({apply:true})` performs the deletes. Never auto-runs. Robbie to run it when ready.

4. **Meal type deletion/re-add flaky** — dishes added back to deleted meals disappear again when another meal is deleted on same day. Firebase listener applying stale snapshots after rapid sequential writes. Verify after v44 sync fix — may partially resolve. NOTE: sync-listener race; needs reproduction + careful guard with live observation. Do NOT touch the sync path blind.

5. **Trip ID null in App Admin on mobile** — shows null on mobile but correct ID on desktop. Needs Robbie's device to reproduce.

6. **Cook photo never shows** — LARGELY FIXED: v93 stamps the cook's photo onto the dish at assign time (doAssignDish → resolvePersonProfile → assignedToPhoto travels to all devices); v71 live-resolves avatars. v107 propagates teammate photos when online. Original root-cause note for the global directory part folds into #19: `_knownUsers` is empty (`[]`) because loadKnownUsers reads the whole `/users` collection, which Firebase rules block (you can read your OWN `/users/{uid}` but not list all of `/users`). The real global name→photo map needs the user directory + rules (#19/#20).

---

## IMPORTANT — UI / behavior

10. **Grocery dedup broken** — Smart Dedup renames items but does not merge quantities with existing matching rows. Creates false duplicate flags and split quantities. Dedup rename and quantity merge must happen together using the same key. ROOT CAUSE CONFIRMED (v82): the aggregator key uses legacyNormKey (`es$`→`e`) but the duplicate-flag banner (aggregateRows ~3524) uses a DIFFERENT normalization (`es$`→``), so the two keys disagree — banner flags dups the merger won't merge. **(v94 unified _groceryNameNorm() so banner + merge use the SAME key — false flags addressed.)** REMAINING / DANGER for any further key change: groceryMeta (store assignments, Bought status) is keyed by the name-derived normKey, and reconcileGroceryMeta (~3543) DELETES any meta key not in the current aggregation output. So ANY change to how the grocery key/name is derived will orphan then DELETE live store assignments unless a key-migration layer is built first. This is why grocery simplification is POST-TRIP only. **Required Stage 0 before any further grocery-key work:** make renames carry old groceryMeta → new key (migrate, don't delete) — for each new row look up meta under new key → legacyKey → name-rename map (old normKey → new normKey carried on the ingredient), and make reconcileGroceryMeta MIGRATE (copy old→new) instead of delete on a recognized rename. Build + verify with real MDW 2026 data, post-trip. The orange-juice quantity-split case is ACCEPTED/dropped (Robbie can't reproduce).

11. **Owner field placeholder never appears** — the placeholder text for the owner field never shows up, needs investigation and fix.

12. **URL import error message misleading on corporate networks** — currently says "Claude may not know this recipe" when the real issue is network blocking. Should say: "Could not fetch the page — this may be blocked by your network. Try on a different connection." (v72 added network-aware wording — verify this is fully covered.)

V. **Vegetarian indicator → VEG pill everywhere** — DONE on plan tab (v60), dish detail view, and dish edit form (green pill toggle, v69), and library cards (v72). The 🌿 the original brief pointed at is in dead renderRecipeCardLocal_unused (v82 note). Effectively done — verify no stray 🌿 remains.

---

## COOKING MODE — its own focused session (NEXT, per Robbie)

C0. **COOKING MODE REDESIGN — "kitchen command center"** (Robbie approved the vision). Reframe cooking mode from a single-recipe slideshow into a hub for a cook juggling several dishes at once, with all info in a clean view. Sub-items in priority order:
   - **C0a (PRIORITY — also a bug): timers that persist + run in parallel.** TODAY: exiting cooking mode stops + hides the timer (Robbie confirmed). WANT: multiple simultaneous timers (one per dish/step) that KEEP running in the background when you leave a step, switch dishes, or exit cooking mode; a persistent "active timers" strip visible even outside cooking mode; clear alert + "what to do now" when one fires; re-entering resumes everything still ticking. (Engine has _cookTimer + _cookDishState per-dish state to build on.)
     **IN PROGRESS — v112 (built, NOT yet verified/pushed):** root bug was exitCookingMode wiping _cookDishState + killing the engine. v112: wall-clock timers (endsAt, correct through phone sleep), one-per-dish; persistent bottom strip (#timerStrip / renderTimerStrip) with per-timer ✕ + tap-to-resume + Clear all; beep+haptic+persistent red DONE chip; Back leaves timers running, explicit endCookingSession() clears. Decisions locked: one timer per dish; bottom strip. Awaiting Robbie's phone test + runRegressionTests() 25/25 before push.
     **LOCK-SCREEN NOTE (decision, 2026-06-05):** Robbie asked for an active lock-screen notification w/ live dish info + countdown. VERDICT: a live, continuously-updating lock-screen/Dynamic-Island timer is iOS-native-only (ActivityKit Live Activities) — NOT possible from a web app/PWA. A fire-time web notification is only possible if installed to Home Screen + iOS 16.4+ + permission + a re-added service worker (app currently unregisters SWs by design) + a push server (none exists; JS timers freeze when locked). DECISION: ship C0a in-app now; true lock-screen lives on the native track (#21).
   - **C0b: multi-dish dashboard** — one screen showing every dish in the meal: current step, running timer, status (prepping/cooking/resting/done); tap a dish to focus while the others keep cooking; an "up next across everything" line.
   - **C0c: coordination/timeline** — extend the existing AI pre-cook overview into a "do this now / start that in 10 min" sequence so dishes finish together.
   - **C0d: clean focus view** — big current step, faint next-step preview, prominent timer, just-this-step ingredients with check-off; strip clutter. EMOJI → DISH PICTURE (Robbie): the cooking screen still shows the recipe emoji (showCookingOverview/renderCookingStep use getRecipeEmoji); replace it with the dish's actual image (use _displayImageUrl / sourced image; fall back to clean accent, not emoji). Removes C1.
   - **C0e: QoL** — keep screen awake (have it), big tap targets, swipe between steps/dishes, stretch: voice "next"/"start timer".
   - **C0f (Robbie): immediate Back/Exit in cooking mode.** Today you can't go back until you tap Start — the cooking overview screen (showCookingOverview) has no exit, so you're stuck on it. Add a visible Back/X to the overview (and throughout cooking mode) so you can leave at any time.
   - **C0g (Robbie): content overlaps the status bar/clock.** The cooking view sits too high — top content runs into the device clock/status-bar area. Add top safe-area padding (env(safe-area-inset-top)) / push content down so nothing hides under the clock.
   - **C0h (Robbie): remove the "cooking for # people" adjuster from cooking mode.** Serving scaling is already done in meal planning (peopleEating/servings), and the cooking-mode adjuster (#cookingFor input, set in cookRecipe/cookMeal) doesn't actually work there. Remove it from cooking mode — quantities should just reflect the plan.
   Fold C1 + C2 (per-dish cook button hidden in view mode) into this session.

C1. Emojis still present in cooking mode (v56 only removed them from recipe library cards). Cooking mode needs its own design pass. (Folds into C0d.)

C2. **Cooking mode — meal-level Cook button FIXED v82; per-dish view-mode button still hidden.** v82 fixed the meal-level "Cook" button (hasCookable now scans recipeBank ∪ _menuLibrary + dish steps). REMAINING (defer with cooking-mode session): the per-dish cook button lives in .dish-footer-row which v49 hides in view mode (only Edit mode shows it). Cooking still reachable today via the dish detail view's Cook button (if the dish has steps).

---

## AI AGENT — redesign (per Robbie)

A1. **AI agent is clunky and ugly** — works well functionally but the UX/visual design needs work. Improve the chat panel look, input area, message styling, and overall interaction flow. Its own design session (like the dish view). v73 raised its z-index so it's reachable over modals; v74 polished bubbles; this is the broader polish.

---

## NEW FEATURES / queued

16. **Group by toggle on recipe library** — DONE v86 (All / By chef / Recently added). Category grouping skipped (recipes have no category field). Could revisit if a category field is added.

18. **App Admin vs Trip Settings restructure** — universal settings must be separated from trip-specific settings. Collapsible sections. Clean separation required before building permissions. First in the admin cluster (#18 → #19 → #20).

19. **User management tab in App Admin** — grid of all users who have logged in, which trips they have accessed, ability to manually add users to trips.
    - **Includes: "cook dropdown should list everyone who's ever logged in" (per Robbie).** Same need — a readable user directory. Root cause: Firebase rules let a user read their OWN /users/{uid} but NOT list /users, so _knownUsers is empty and the cook dropdown can only show current user + known + anyone in presence (v76 interim). The real fix is the user directory + the rules to read it — belongs to this build plus permissions/rules (#20), NOT a one-off patch. DECISION (Robbie): fold the cook-dropdown fix into the bigger user-management/permissions architecture rather than band-aiding.
    - Foundation options to decide during build: (A) allow authenticated read on /users via rules, or (B) maintain a readable userDirectory node written on login. This also fixes cook photos app-wide.

20. **Admin permissions system** — admin roles, Firebase security rules. Build only after #18 is complete. Untested rules can lock out all users — stage carefully WITH Robbie.

21. **iOS Share Extension** (long-term roadmap — NOT for now) — an iOS share-sheet extension to import paywalled recipes (NYT Cooking, etc.) by sharing the rendered page from Safari, where the content is already loaded and visible, bypassing the fetch/paywall problem. Future roadmap only; do not build yet.

22. **Archive trips + "Past trips" view** (Robbie — list only, do NOT build yet) — let the user archive a trip and easily see past/archived trips separately from active ones. Likely an `archived` flag on the trip + an "Archived/Past trips" section or toggle on the landing/trip-picker. Must not delete trip data — archiving only hides from the active list. Decide: per-trip archive action, where past trips surface (landing section vs filter), and whether archived trips still sync/count.

25. **Image sourcing misses simple AI/no-URL recipes** (Robbie). AI-generated "Peach, Arugula & Burrata Salad" pulled no picture. sourceRecipeImage tries the recipe URL first (none here) then Spoonacular complexSearch by the FULL name — a long/specific title (commas, &) rarely matches Spoonacular's ~5k titles. DECISION (Robbie): URL/Microlink image stays ALWAYS the first solution. (a) DONE v108 — simplify the Spoonacular query. (b) DONE v111 — Pexels general food-photo fallback. STILL QUEUED: (i) PROACTIVE sourcing — fire sourceRecipeImage on recipe SAVE/EDIT (saveDishFromModal bankOnly), not just detail-open/backfill, + a self-heal pass for library recipes missing images (mirror the grocery-name self-heal). Note: _imageFetchAttempted marks a recipe "tried" for the session, so after improving, a page reload is needed to retry the ones that already failed. Accepted: AI-generated recipes with no online match may still stay blank.

27. **Grocery/shopping cleanup** (Robbie) — section grouping + better categories. Robbie likes the easy check-off; don't break it. (B) BETTER ITEM CATEGORIZATION — DONE v101/v105 (Spices & Seasonings dept; salt/pepper class fixed; AI dept in cleanGroceryNames). (A) STILL QUEUED — **#27A VISUAL SECTIONS when sorted by Store or Department:** group rows under clear (ideally sticky) headers per store / per department with an icon + a "X of Y" count. The .grocery-section-row mechanism ALREADY emits headers (renderGroceryTable ~line 3847: only when grocerySortMode is store/department, NOT alpha). BUG (headers show on PC, not laptop): line ~603 `.grocery-section-row{display:none!important;}` inside the narrow/mobile (~≤768px) media query HIDES them in the compact card layout — so a narrower window drops them. FIX: un-hide + restyle section headers to work in the mobile/card grid layout so they're consistent on every screen; also surface them in shopping mode; add per-section counts. (Note grocerySortMode is per-device localStorage, so devices can differ.)
   **SHOPPING-MODE CLEANUP (Robbie, 2026-06-06): goals = easy while shopping + interactive for multiple shoppers.** Phase 1 DONE v115 (render-only): decluttered rows (dropped dish provenance), "Hide done" toggle, store-complete green ✓ + auto-collapse, "N left" progress. **Phase 2 — MULTI-SHOPPER (sensitive, NOT built):** (a) **per-item Firebase writes** — saveGroceryStateNow does `trips/{code}.set(currentEvent)` (whole-trip), so two shoppers checking different items concurrently can CLOBBER each other's check-offs (last write wins on the whole groceryMeta) and the `remoteTs<=localTs` guard in subscribeToCurrentTrip can hide the correction. Fix: write only `trips/{code}/groceryMeta/{key}` on a check-off (`.update`) so concurrent different-item check-offs merge. ⚠️ touches the Firebase save/sync path + groceryMeta (data-loss-sensitive) — careful build, TEST ON 2 DEVICES, validateBeforeFirebaseWrite still applies. (b) "**who's shopping now**" line (presence already exists). (c) live check-off animation when a teammate checks something. (d) **split-by-store filter** — DONE v117 (pure render, zero writes): store chips at top of shopping mode, "All" first so full list is one tap away. (e remains.) (e) optional: quick-add item from shopping mode (manualGroceryItems exists).

28. **Trip header photos don't sync across devices/users** (Robbie — list only, sync change so do it CAREFULLY + tested). The header "picture up top" comes from a per-theme GALLERY stored in localStorage (getThemeGallery/setThemeGallery, GALLERY_KEY) = PER DEVICE. Only the single ACTIVE image syncs: setThemeGallery writes trips/{code}/themePhoto {url,posX,posY,theme}; applyThemePhotoFromTrip reads it on open. GAPS: (1) the gallery never syncs — added pictures live only on the device that added them; (2) adding without setting active writes nothing to Firebase; (3) themePhoto only re-applies on reopen, not on a live sync update. FIX (robust): store the gallery in the trip data (e.g. trips/{code}/themeGallery, merged with local defaults on load) so all added pictures are available + consistent for everyone; apply themePhoto/gallery on REMOTE sync updates (subscribeToCurrentTrip) not just initial open; consider that uploaded photos may be large data URLs — host/resize or store as URLs. Touches theming + sync; test on 2 devices. Quick partial if needed: when a photo is added, also offer/auto set-active so at least themePhoto syncs it.

29. **All API keys should stick with the TRIP, not the device/user** (Robbie). The Anthropic key already syncs (saveApiKey → currentEvent.sharedApiKey + commitAndSync; loadSharedApiKey reads it). v110 made the image keys (Spoonacular/Google/Pexels) sync with the trip too. MOSTLY DONE. Robbie plans the CLEANER version (admin-managed keys) as part of admin mode (#18-20) — fold the proper "all keys live on the trip / admin-set" model there.

---

## CLOSED (kept for reference)

0. ~~**Fabricated recipes from URL imports**~~ — FIXED v78 + v79. v79 fetches the ACTUAL page content via Jina Reader (https://r.jina.ai/{url}) and forces Claude to extract ONLY from that content — no prior knowledge, no invention — returning {"error":...} if no real recipe; import stops (nothing saved) if the page can't be read or no recipe is found. CAVEAT: Jina Reader is a free third-party service; if slow/blocked, imports fail by design.

C7. ~~**JSON parse error on AI response**~~ — FIXED v80. Claude sometimes wraps JSON in markdown code fences; shared stripJsonFences() helper applied to every AI-parse site.

C8. ~~**URL import still fabricates recipes when fetch fails**~~ — CONFIRMED ALREADY BLOCKED (v79 empty-page guard <200 chars + no-prior-knowledge prompt). Apparent "fabrication" was paywalled pages returning >200 chars of teaser/login text — now caught by C9.

C9. ~~**Paywall detection missing**~~ — FIXED v80. Known hard-paywall hosts (cooking.nytimes.com, nytimes.com) stop up front; pages with paywall markers that yield no recipe show "This page requires a subscription — copy the recipe text and paste it here instead." Never fabricates.

1. ~~**Recipes reappearing after deletion**~~ — FIXED v93. subscribeToMenuLibrary suppresses _recentlyDeletedRecipeIds for 30s and deleteFromMenuLibrary removes locally, so a stale echo can't resurrect a deleted recipe.

13. ~~**Meal type reappears at bottom after re-add**~~ — FIXED v84 (orderedDayMeals canonical order). Same fix as #9.

9. ~~**Meals should always display in typical order**~~ — FIXED v84. Canonical: Breakfast → Lunch → Dinner → Snack → Drinks → Dessert.

17. ~~**View vs edit mode for dishes**~~ — DONE v64–v70.

23. ~~**Cook time end-to-end**~~ — DONE v104.

24. ~~**Paste Full Recipe should pull STEPS**~~ — DONE v103.

26. ~~**Click a grocery row's dish pill to edit that dish's item inline**~~ — DONE v109. Full edit (item/qty/unit/groceryName) via editDishIngredient; picker when a dish feeds the row via >1 ingredient; no ids shown.

7. ~~**Recipe name cuts off in view mode**~~ — FIXED v72 (wraps).

8. ~~**AI button overlaps send button on mobile**~~ — FIXED v72.

14/15. ~~**Dish cards / detail show assigned cook photo**~~ — DONE v71.
