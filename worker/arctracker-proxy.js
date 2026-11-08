// Raider Toolkit – relay (Cloudflare Worker)
//
// 1. ARCTracker: keeps the site's ARCTracker app key secret. A visitor's browser sends their own personal key,
//    this worker adds the app key and asks ARCTracker for that visitor's profile (name and level), stash, hideout levels, blueprints and completed quests.
// 2. Reports: the site's "Report a problem" form posts to /report, and this worker passes it on to a private Discord channel.
//
// Settings in Cloudflare (Worker → Settings → Variables and Secrets):
//   ARC_APP_KEY      (Secret)  your app key from ARCTracker's Developer Dashboard, starts with arc_k1_
//   ALLOWED_ORIGINS  (Text)    https://raidkits.com,https://www.raidkits.com,https://kuroxiio.github.io
//   DISCORD_WEBHOOK  (Secret)  the Discord webhook URL of the channel that gets the reports (REPORT_WEBHOOK works too)

const API = "https://arctracker.io/api/v2/user/";
const PER_PAGE = 500;
const MAX_PAGES = 20;

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGINS || "https://raidkits.com").split(",").map((s) => s.trim()).filter(Boolean);
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!allowed.includes(origin)) return json({ error: "This relay only answers the Raider Toolkit site." }, 403, cors);
    if (req.method === "POST" && new URL(req.url).pathname.replace(/\/+$/, "") === "/report") return report(req, env, cors);
    if (req.method !== "GET") return json({ error: "Method not allowed" }, 405, cors);
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

// ---- reports from the site to a private Discord channel ----
const REPORT_LIMIT = 3;          // reports per visitor
const REPORT_WINDOW = 15 * 60;   // in this many seconds
async function report(req, env, cors) {
  const hook = String(env.DISCORD_WEBHOOK || env.REPORT_WEBHOOK || "").trim();
  if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(hook)) return json({ error: "Reports are not set up yet." }, 503, cors);
  if (!/^application\/json/i.test(req.headers.get("Content-Type") || "")) return json({ error: "Bad request." }, 400, cors);
  const raw = await req.text();
  if (raw.length > 6000) return json({ error: "That report is too long." }, 413, cors);
  let d; try { d = JSON.parse(raw); } catch (e) { return json({ error: "Bad request." }, 400, cors); }
  const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/@(everyone|here)/gi, "@\u200b$1").trim().slice(0, n);
  if (clean(d.website, 50)) return json({ ok: true }, 200, cors); // hidden field only bots fill in
  const msg = clean(d.msg, 1500), topic = clean(d.topic, 80) || "Report", who = clean(d.who, 40), page = clean(d.page, 120), lang = clean(d.lang, 8), view = clean(d.view, 40);
  if (msg.length < 5) return json({ error: "Please write a little more about what is wrong." }, 400, cors);

  // a few reports per visitor per 15 minutes, counted in Cloudflare's edge cache
  const ip = req.headers.get("CF-Connecting-IP") || "unknown";
  const key = new Request("https://report-limit.invalid/" + encodeURIComponent(ip));
  const cache = caches.default, hit = await cache.match(key);
  const n = hit ? parseInt(await hit.text(), 10) || 0 : 0;
  if (n >= REPORT_LIMIT) return json({ error: "Thanks, we already got a few reports from you. Try again in a little while." }, 429, cors);
  await cache.put(key, new Response(String(n + 1), { headers: { "Cache-Control": "max-age=" + REPORT_WINDOW } }));

  const fields = [{ name: "From", value: who || "Anonymous", inline: true }, { name: "Page", value: view || "unknown", inline: true }];
  if (lang) fields.push({ name: "Language", value: lang, inline: true });
  if (page) fields.push({ name: "Where", value: page.slice(0, 120) });
  const r = await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    username: "Raider Toolkit reports", allowed_mentions: { parse: [] },
    embeds: [{ title: topic, description: msg, color: 0x5ff2ea, fields, timestamp: new Date().toISOString() }],
  }) });
  if (!r.ok) return json({ error: "The report could not be delivered. Try again later." }, 502, cors);
  return json({ ok: true }, 200, cors);
}
