// Raider Toolkit – ARCTracker relay (Cloudflare Worker)
//
// Keeps the site's ARCTracker app key secret. A visitor's browser sends their own personal key,
// this worker adds the app key and asks ARCTracker for that visitor's profile (name and level), stash, hideout levels, blueprints and completed quests.
//
// Settings in Cloudflare (Worker → Settings → Variables and Secrets):
//   ARC_APP_KEY      (Secret)  your app key from ARCTracker's Developer Dashboard, starts with arc_k1_
//   ALLOWED_ORIGINS  (Text)    https://raidkits.com,https://www.raidkits.com,https://kuroxiio.github.io

const API = "https://arctracker.io/api/v2/user/";
const PER_PAGE = 500;
const MAX_PAGES = 20;

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGINS || "https://raidkits.com").split(",").map((s) => s.trim()).filter(Boolean);
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Headers": "Authorization",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, cors);
    if (!allowed.includes(origin)) return json({ error: "This relay only answers the Raider Toolkit site." }, 403, cors);
    if (!env.ARC_APP_KEY) return json({ error: "The relay is missing its app key." }, 500, cors);

    const auth = req.headers.get("Authorization") || "";
    if (!/^Bearer arc_u1_[A-Za-z0-9_\-]+$/.test(auth)) return json({ error: "Missing or invalid personal key." }, 401, cors);

    const headers = { "X-App-Key": env.ARC_APP_KEY, "Authorization": auth, "Accept": "application/json" };
    const path = new URL(req.url).pathname.replace(/\/+$/, "");

    const single = { "/hideout": "hideout", "/quests": "quests?filter=completed", "/profile": "profile" };
    if (single[path]) {
      const r = await fetch(API + single[path], { headers });
      return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }

    // Blueprints: only the learned ones, so everything that comes back counts as learned.
    const paged = { "/stash": "stash", "/blueprints": "blueprints?filter=learned" };
    if (paged[path]) {
      let all = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const base = API + paged[path];
        const r = await fetch(base + (base.includes("?") ? "&" : "?") + "per_page=" + PER_PAGE + "&page=" + page, { headers });
        if (!r.ok) return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
        const body = await r.json();
        const list = listOf(body);
        // not a plain list (for example grouped by category): pass it on as it is, the site sorts it out
        if (list === null) {
          if (page === 1) return json(body, 200, cors);
          break;
        }
        all = all.concat(list);
        if (list.length < PER_PAGE) break;
      }
      return json({ items: all }, 200, cors);
    }

    return json({ error: "Not found" }, 404, cors);
  },
};

function listOf(j) {
  if (Array.isArray(j)) return j;
  if (!j || typeof j !== "object") return [];
  for (const c of [j.items, j.data, j.stash, j.blueprints, j.results, j.data && j.data.items, j.data && j.data.blueprints]) if (Array.isArray(c)) return c;
  return null;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
