// Raider Toolkit – sync (Cloudflare Worker)
//
// Keeps a shopping list (and a route, and followed quests and keys) the same on raidkits.com and in the
// desktop app. Turned on by the user, never by default.
//
// How it works: the user's sync code (made in their browser or the app, for example RTS-7K2Q-…) never leaves
// their devices. They send only a SHA-256 hash of it, and that hash is the storage key here. Without the code
// nobody can find or read a synced list, and the code can't be worked out from what is stored.
//
// Stored per code: the list, the route and the followed quests and keys, with the time each was last changed.
// No name, e-mail, account or IP address. A synced list is deleted after 180 days without changes, or straight
// away when the user presses "Delete synced data".
//
// Storage: a Cloudflare D1 database (binding DB) with one table,
//   CREATE TABLE sync (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL);
// The first version kept lists in Workers KV (binding SYNC); a list still there is moved over the first time it is read.
//
//   GET    /s/<hash>   the synced data, or 404
//   PUT    /s/<hash>   saves { v, t: { shop, route, follow }, shop, route, follow } (at most 64 KB)
//   DELETE /s/<hash>   deletes it
//
// Settings (worker/sync.wrangler.toml): the D1 binding DB, the old KV binding SYNC, and ALLOWED_ORIGINS.

const MAX = 64 * 1024;
const TTL = 180 * 24 * 3600;
const ORIGINS = ["https://raidkits.com", "https://www.raidkits.com", "https://kuroxiio.github.io", "tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"];

export default {
  async fetch(req, env) {
    const allowed = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean) : ORIGINS;
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!allowed.includes(origin)) return json({ error: "Sync only answers Raider Toolkit." }, 403, cors);
    // reports from the desktop app: handed to the relay worker (service binding), which keeps the Discord webhook
    if (req.method === "POST" && new URL(req.url).pathname === "/report") {
      if (!env.RELAY) return json({ error: "Reports are not set up yet." }, 503, cors);
      const raw = await req.text();
      if (raw.length > 6000) return json({ error: "That report is too long." }, 413, cors);
      const r = await env.RELAY.fetch("https://relay/report", { method: "POST", body: raw, headers: { "Content-Type": "text/plain;charset=UTF-8", "Origin": "https://raidkits.com", "CF-Connecting-IP": req.headers.get("CF-Connecting-IP") || "unknown" } });
      return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!env.DB) return json({ error: "Sync isn't set up." }, 503, cors);

    const m = new URL(req.url).pathname.match(/^\/s\/([0-9a-f]{64})\/?$/);
    if (!m) return json({ error: "Not found." }, 404, cors);
    const id = m[1];

    if (req.method === "GET") {
      const v = await load(env, id);
      return v ? new Response(v, { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } }) : json({ error: "Nothing synced with this code." }, 404, cors);
    }
    if (req.method === "DELETE") {
      await env.DB.prepare("DELETE FROM sync WHERE id = ?").bind(id).run();
      if (env.SYNC) await env.SYNC.delete("s:" + id).catch(() => {});
      return json({ ok: true }, 200, cors);
    }
    if (req.method === "PUT") {
      const raw = await req.text();
      if (new TextEncoder().encode(raw).length > MAX) return json({ error: "That list is too big to sync." }, 413, cors);
      let d;
      try { d = JSON.parse(raw); } catch (e) { return json({ error: "Not valid data." }, 400, cors); }
      const clean = check(d);
      if (!clean) return json({ error: "Not valid data." }, 400, cors);
      // keep whichever part is newer, so two devices saving at once never lose each other's changes
      let old = null;
      try { old = JSON.parse((await load(env, id)) || "null"); } catch (e) {}
      const out = old ? merge(old, clean) : clean;
      const body = JSON.stringify(out), now = Date.now();
      await env.DB.prepare("INSERT INTO sync (id, data, updated) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET data = ?2, updated = ?3").bind(id, body, now).run();
      // now and then, clear out lists nobody has changed for 180 days
      if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM sync WHERE updated < ?").bind(now - TTL * 1000).run().catch(() => {});
      return new Response(body, { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }
    return json({ error: "Not allowed." }, 405, cors);
  },
};

/* the stored JSON text for one code, or null. Moves a list over from the old KV storage the first time it is asked for. */
async function load(env, id) {
  const row = await env.DB.prepare("SELECT data FROM sync WHERE id = ?").bind(id).first();
  if (row) return row.data;
  if (!env.SYNC) return null;
  const old = await env.SYNC.get("s:" + id).catch(() => null);
  if (!old) return null;
  await env.DB.prepare("INSERT OR IGNORE INTO sync (id, data, updated) VALUES (?, ?, ?)").bind(id, old, Date.now()).run();
  await env.SYNC.delete("s:" + id).catch(() => {});
  return old;
}

const PARTS = ["shop", "route", "follow"];
function check(d) {
  if (!d || typeof d !== "object" || d.v !== 1 || !d.t || typeof d.t !== "object") return null;
  const out = { v: 1, t: {} };
  for (const p of PARTS) {
    const t = Number(d.t[p]) || 0;
    if (t < 0 || t > Date.now() + 5 * 60 * 1000) return null;   // no times from the future
    out.t[p] = t;
    out[p] = d[p] === undefined ? null : d[p];
    if (out[p] !== null && typeof out[p] !== "object") return null;
  }
  return out;
}
function merge(a, b) {
  const out = { v: 1, t: {} };
  for (const p of PARTS) {
    const ta = Number((a.t || {})[p]) || 0, tb = Number(b.t[p]) || 0;
    if (tb >= ta) { out.t[p] = tb; out[p] = b[p]; } else { out.t[p] = ta; out[p] = a[p] === undefined ? null : a[p]; }
  }
  return out;
}
function json(o, status, cors) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
