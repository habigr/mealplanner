/**
 * fetchRecipe — server-side recipe fetcher for Meal Planner.
 *
 * Why this exists: sites like Serious Eats / Dotdash block automated fetchers
 * from the browser (CORS + bot-blocking). This function fetches the page with a
 * browser-like User-Agent, then extracts the page's OWN schema.org Recipe
 * structured data (JSON-LD) — deterministically, with ZERO AI. It only ever
 * returns what is actually on the page; it never invents a recipe.
 *
 * Response: { recipe: {name, servings, cookTime, ingredients[], steps[], image, source} }
 *           or { error: "..." } when no real recipe is present.
 */
const {onRequest} = require("firebase-functions/v2/https");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, " ")
    .trim();
}

// Pull a schema.org Recipe out of the page's JSON-LD blocks. Returns null if none/incomplete.
function extractRecipe(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let rec = null;
  while ((m = re.exec(html)) && !rec) {
    let raw = m[1].replace(/<!--[\s\S]*?-->/g, "").trim();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    const found = [];
    (function collect(o) {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) {
        o.forEach(collect);
        return;
      }
      if (o["@graph"]) collect(o["@graph"]);
      const t = o["@type"];
      if (t && (t === "Recipe" || (Array.isArray(t) && t.indexOf("Recipe") >= 0))) found.push(o);
    })(data);
    if (found.length) rec = found[0];
  }
  if (!rec) return null;

  const ings = (rec.recipeIngredient || rec.ingredients || [])
    .map((x) => decodeEntities(x))
    .filter(Boolean);

  const steps = [];
  (function walk(ri) {
    if (!ri) return;
    if (typeof ri === "string") {
      ri.split(/\r?\n/).forEach((s) => {
        s = decodeEntities(s);
        if (s) steps.push(s);
      });
      return;
    }
    if (Array.isArray(ri)) {
      ri.forEach(walk);
      return;
    }
    if (typeof ri === "object") {
      if (ri["@type"] === "HowToSection" && ri.itemListElement) walk(ri.itemListElement);
      else if (ri.text) steps.push(decodeEntities(ri.text));
    }
  })(rec.recipeInstructions);

  const cleanSteps = steps.filter(Boolean);
  if (!ings.length || !cleanSteps.length) return null; // incomplete → caller falls back

  let y = rec.recipeYield;
  if (Array.isArray(y)) y = y[0];
  let img = rec.image;
  if (Array.isArray(img)) img = img[0];
  if (img && typeof img === "object") img = img.url;

  return {
    name: decodeEntities(rec.name),
    servings: String(y || "").replace(/[^0-9]/g, ""),
    cookTime: "",
    ingredients: ings,
    steps: cleanSteps,
    image: typeof img === "string" ? img : "",
  };
}

exports.fetchRecipe = onRequest(
  {cors: true, region: "us-central1", timeoutSeconds: 30, memory: "256MiB"},
  async (req, res) => {
    const url = (req.query && req.query.url) || (req.body && req.body.url) || "";
    if (!url || !/^https?:\/\//i.test(url)) {
      res.status(400).json({error: "Missing or invalid url"});
      return;
    }
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      if (!r.ok) {
        res.json({error: "Page returned " + r.status});
        return;
      }
      const html = await r.text();
      const recipe = extractRecipe(html);
      if (!recipe) {
        res.json({error: "No structured recipe found on page"});
        return;
      }
      try {
        recipe.source = new URL(url).hostname.replace("www.", "");
      } catch (e) {
        recipe.source = "";
      }
      res.json({recipe});
    } catch (e) {
      res.json({error: "Fetch failed: " + (e.message || String(e))});
    }
  }
);
