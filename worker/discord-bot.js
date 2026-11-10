// Raider Toolkit – Discord bot (Cloudflare Worker)
//
// Slash commands answered straight from this worker, so no PC has to stay on:
//   /item <name>          value, recycling, crafting, what it is needed for and where to find it
//   /weapon <code|name>   a weapon build from the site's "Copy build code" (ARC-…): picture, tier, attachments, DPS
//   /list <link|code>     a shared shopping list from the site, in short
//   /share <link|code>    anything shared from the site: weapon codes, shopping lists, skill builds and routes
//   /quest <name>         trader, maps, objectives, hand-ins and rewards
//   /key <name>           which door a key opens, where, and how to get it
//   /mapconditions [map]  map conditions now and the next one per map, with live countdowns
//   /build [name]         recommended 2.x skill builds, with a link that opens them in the planner
//   /raidkits             what the bot does and a link to the site
//
// Names autocomplete as you type, and the choice sends the item's ID, so the bot always gets the exact item.
//
// The data comes from <site>/bot.json, which the site's daily build writes, so the bot is always as up to date as the site.
//
// Setup (Cloudflare → Workers & Pages → Create → Worker, paste this file, Deploy):
//   Worker → Settings → Variables and Secrets:
//     DISCORD_PUBLIC_KEY  (Text)    General Information → Public Key, in the Discord Developer Portal
//     DISCORD_APP_ID      (Text)    General Information → Application ID
//     DISCORD_BOT_TOKEN   (Secret)  Bot → Reset Token. Only used to register the commands.
//     DATA_URL            (Text, optional) defaults to https://raidkits.com/bot.json
//   Then open https://<this worker>/register once in the browser to register the commands,
//   and set General Information → Interactions Endpoint URL to https://<this worker>/interactions
//   Open /register again whenever the command list in this file changes.

const DEFAULT_DATA = "https://raidkits.com/bot.json";
const ACCENT = 0x62f3ea;
const RARITY = { Common: 0x9aa3ad, Uncommon: 0x22d65f, Rare: 0x3fa9ff, Epic: 0xc06bff, Legendary: 0xffc400, Amplified: 0xff5d8f };
const REGIONS = [["eu", "Europe", 0], ["na", "North America", 7], ["sa", "South America", 6], ["as", "Asia", -5], ["oc", "Oceania", -9]];
const MAP_ORDER = ["dam", "buried", "space", "gate", "stella", "riven", "pendola"];
const MAP_NAMES = { dam: "Dam Battlegrounds", buried: "Buried City", space: "The Spaceport", gate: "The Blue Gate", stella: "Stella Montis", riven: "Riven Tides", pendola: "Pendola Pass" };

// everywhere: servers, DMs with the bot and private chats (when users add the bot to their own account)
const WHERE = { integration_types: [0, 1], contexts: [0, 1, 2] };
const COMMANDS = [
  { name: "item", description: "Look up an item: value, recycling, crafting and where to find it", ...WHERE,
    options: [{ type: 3, name: "name", description: "Item name", required: true, autocomplete: true }] },
  { name: "weapon", description: "Share a weapon build: paste the code from the weapon calculator", ...WHERE,
    options: [{ type: 3, name: "code", description: "Build code (ARC-…) or a weapon name", required: true, autocomplete: true, max_length: 400 }] },
  { name: "list", description: "Share a shopping list: paste its share link or code", ...WHERE,
    options: [{ type: 3, name: "link", description: "Share link or code from the shopping list", required: true, max_length: 6000 }] },
  { name: "share", description: "Share something from Raider Toolkit: a weapon code, shopping list, skill build or route link", ...WHERE,
    options: [{ type: 3, name: "link", description: "The link or code you copied on the site", required: true, max_length: 6000 }] },
  { name: "quest", description: "A quest: trader, maps, objectives and rewards", ...WHERE,
    options: [{ type: 3, name: "name", description: "Quest name", required: true, autocomplete: true }] },
  { name: "key", description: "Which door a key opens and how to get it", ...WHERE,
    options: [{ type: 3, name: "name", description: "Key name", required: true, autocomplete: true }] },
  { name: "mapconditions", description: "Map conditions now and next, with timers", ...WHERE,
    options: [
      { type: 3, name: "map", description: "Only this map", choices: MAP_ORDER.map((k) => ({ name: MAP_NAMES[k], value: k })) },
      { type: 3, name: "region", description: "Server region (default Europe)", choices: REGIONS.map((r) => ({ name: r[1], value: r[0] })) },
    ] },
  { name: "build", description: "Recommended 2.x skill builds", ...WHERE,
    options: [{ type: 3, name: "name", description: "Build name (leave empty for the list)", autocomplete: true }] },
  { name: "raidkits", description: "What this bot does, and a link to Raider Toolkit", ...WHERE },
];

let CACHE = { t: 0, d: null };

let BOT_ENV = {};
export default {
  async fetch(req, env, ctx) {
    BOT_ENV = { app: env.DISCORD_APP_ID };
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    if (req.method === "POST" && (path === "/interactions" || path === "")) return interactions(req, env);
    if (req.method === "GET" && path === "/register") return register(env);
    return new Response("Raider Toolkit bot is running.", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  },
};

/* ---------- Discord plumbing ---------- */
async function interactions(req, env) {
  const body = await req.text();
  if (!(await verify(req, body, env.DISCORD_PUBLIC_KEY))) return new Response("Bad signature", { status: 401 });
  const i = JSON.parse(body);
  if (i.type === 1) return reply({ type: 1 });                                   // Discord's PING
  let d;
  try { d = await data(env); } catch (e) {
    if (i.type === 4) return reply({ type: 8, data: { choices: [] } });
    return msg({ content: "Couldn't load the Raider Toolkit data right now. Try again in a minute.", flags: 64 });
  }
  const name = i.data && i.data.name, opts = optMap(i.data && i.data.options);
  if (i.type === 4) return reply({ type: 8, data: { choices: autocomplete(d, name, i.data.options) } });
  if (i.type !== 2) return msg({ content: "Unknown request.", flags: 64 });
  try {
    if (name === "item") return msg(itemReply(d, opts.name));
    if (name === "weapon") return msg(weaponReply(d, opts.code));
    if (name === "list") return msg(await listReply(d, opts.link));
    if (name === "share") return msg(await shareReply(d, opts.link));
    if (name === "quest") return msg(questReply(d, opts.name));
    if (name === "key") return msg(keyReply(d, opts.name));
    if (name === "mapconditions") return msg(condReply(d, opts.map, opts.region));
    if (name === "build") return msg(buildReply(d, opts.name));
    if (name === "raidkits") return msg(aboutReply(d));
  } catch (e) {
    return msg({ content: "Something went wrong with that command. It has been noted, try again later.", flags: 64 });
  }
  return msg({ content: "Unknown command.", flags: 64 });
}
function reply(o) { return new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json" } }); }
function msg(data) { return reply({ type: 4, data: Object.assign({ allowed_mentions: { parse: [] } }, data) }); }
function optMap(list) { const o = {}; (list || []).forEach((x) => { o[x.name] = x.value; }); return o; }

async function verify(req, body, pk) {
  const sig = req.headers.get("X-Signature-Ed25519"), ts = req.headers.get("X-Signature-Timestamp");
  if (!sig || !ts || !pk) return false;
  const hex = (h) => new Uint8Array((h.match(/../g) || []).map((b) => parseInt(b, 16)));
  const msgBytes = new TextEncoder().encode(ts + body);
  for (const alg of [{ name: "Ed25519" }, { name: "NODE-ED25519", namedCurve: "NODE-ED25519" }]) {
    try {
      const key = await crypto.subtle.importKey("raw", hex(pk), alg, false, ["verify"]);
      return await crypto.subtle.verify(alg, key, hex(sig), msgBytes);
    } catch (e) { /* try the older name */ }
  }
  return false;
}

async function register(env) {
  if (!env.DISCORD_APP_ID || !env.DISCORD_BOT_TOKEN) return new Response("Set DISCORD_APP_ID and DISCORD_BOT_TOKEN first.", { status: 400 });
  const r = await fetch("https://discord.com/api/v10/applications/" + env.DISCORD_APP_ID + "/commands", {
    method: "PUT", headers: { Authorization: "Bot " + env.DISCORD_BOT_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(COMMANDS),
  });
  const txt = await r.text();
  if (!r.ok) return new Response("Discord said " + r.status + ":\n" + txt, { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response("Registered: /" + COMMANDS.map((c) => c.name).join(", /") + "\nNew commands can take a minute to show up in Discord.",
    { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

async function data(env) {
  if (CACHE.d && Date.now() - CACHE.t < 10 * 60 * 1000) return CACHE.d;
  try {
    const r = await fetch(env.DATA_URL || DEFAULT_DATA, { cf: { cacheTtl: 900, cacheEverything: true } });
    if (!r.ok) throw new Error("data " + r.status);
    const d = await r.json();
    d.site = d.site || "https://raidkits.com/";
    CACHE = { t: Date.now(), d };
    return d;
  } catch (e) {
    if (CACHE.d) return CACHE.d;          // keep answering with the last good copy
    throw e;
  }
}

/* ---------- search ---------- */
function norm(s) { return String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function rank(list, q, getName) {
  q = norm(q);
  if (!q) return list.slice();
  const words = q.split(" ");
  const scored = [];
  for (const x of list) {
    const n = norm(getName(x));
    let s = -1;
    if (n === q) s = 0; else if (n.startsWith(q)) s = 1; else if (n.split(" ").some((w) => w.startsWith(q))) s = 2;
    else if (n.includes(q)) s = 3; else if (words.every((w) => n.includes(w))) s = 4;
    if (s >= 0) scored.push([s, n.length, x]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return scored.map((x) => x[2]);
}
function find(list, q) {
  if (!q) return null;
  return list.find((x) => x.id === q) || rank(list, q, (x) => x.n)[0] || null;
}
function autocomplete(d, cmd, options) {
  const f = (options || []).find((o) => o.focused) || {};
  const list = { item: d.items, key: d.keys, build: d.builds, quest: d.quests, weapon: d.weapons }[cmd] || [];
  if (cmd === "weapon" && /^arc-/i.test(String(f.value || "").trim())) return [];   // a pasted code is sent as typed (choices are capped at 100 characters)
  return rank(list, f.value, (x) => x.n).slice(0, 25).map((x) => ({
    name: (cmd === "build" ? x.n + " · " + x.by : cmd === "key" && x.m ? x.n + " · " + x.m : cmd === "quest" && x.tr ? x.n + " · " + x.tr : cmd === "weapon" ? x.n + " · " + x.t : x.n).slice(0, 100), value: x.id,
  }));
}

/* ---------- replies ---------- */
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
function list(arr, max, sep) {
  if (!arr || !arr.length) return "";
  const shown = arr.slice(0, max).join(sep || ", ");
  return cut(shown + (arr.length > max ? (sep === "\n" ? "\n" : ", ") + "and " + (arr.length - max) + " more" : ""), 1024);
}
function footer(d) { return { text: "Raider Toolkit · patch " + d.patch + " · data " + d.built }; }
function button(label, url) { return { type: 1, components: [{ type: 2, style: 5, label, url }] }; }
function notFound(what, q) { return { content: "No " + what + " matches “" + cut(String(q || ""), 60) + "”. Pick one from the list as you type.", flags: 64 }; }

function itemReply(d, q) {
  const it = find(d.items, q);
  if (!it) return notFound("item", q);
  const url = d.site + "#items?q=" + encodeURIComponent(it.n);
  const fields = [
    { name: "Value", value: fmt(it.v), inline: true },
    { name: "Rarity", value: it.r || "–", inline: true },
    { name: "Type", value: it.t || "–", inline: true },
  ];
  if (it.w != null) fields.push({ name: "Weight", value: String(it.w), inline: true });
  if (it.s) fields.push({ name: "Stack", value: String(it.s), inline: true });
  if (it.f) fields.push({ name: "Loot category", value: it.f, inline: true });
  if (it.rc) fields.push({ name: "Recycles into", value: list(it.rc.map((x) => x[1] + "× " + x[0]), 10) });
  if (it.cb) fields.push({ name: "Crafted at", value: cut(it.cb + (it.rp ? " from " + it.rp.map((x) => x[1] + "× " + x[0]).join(", ") : ""), 1024) });
  if (it.ws) fields.push({ name: "Needed for upgrades", value: list(it.ws.map((x) => x[0] + " (" + x[1] + "×)"), 12) });
  if (it.qs) fields.push({ name: "Quests that ask for it", value: list(it.qs, 10) });
  if (it.cr) fields.push({ name: "Used to craft", value: list(it.cr, 12) });
  if (it.g) fields.push({ name: "Where to find it", value: cut(it.g + (it.gm && it.gm.length ? "\nMaps: " + it.gm.join(", ") : ""), 1024) });
  const embed = { title: it.n, url, color: RARITY[it.r] || ACCENT, fields: fields.slice(0, 25), footer: footer(d) };
  if (it.d) embed.description = cut(it.d, 400);
  if (it.ic) embed.thumbnail = { url: d.site + "i/" + it.id + ".webp" };
  return { embeds: [embed], components: [button("Open in Raider Toolkit", url)] };
}

/* map conditions: same rotation and region shift as the site's map page */
function evAt(ev, m, h, off) {
  const c = ev.m[m]; if (!c) return "";
  const per = ev.per, mod = (a) => ((a % per) + per) % per;
  const parts = (c[mod(h - off)] || "").split(" + ").filter((x) => x && x !== "Redirection");
  if (m === "pendola" && (c[mod(h)] || "").indexOf("Redirection") > -1) parts.push("Redirection");
  return parts.join(" + ");
}
function evState(ev, m, now, off) {
  const t0 = Date.parse(ev.t0), H = 3600000, h = Math.floor((now - t0) / H);
  const cur = evAt(ev, m, h, off);
  let k = 1;
  if (cur) while (k < ev.per && evAt(ev, m, h + k, off) === cur) k++;              // how long the current one runs
  const ends = t0 + (h + k) * H;
  let j = k;
  while (j <= ev.per && !evAt(ev, m, h + j, off)) j++;
  const next = j <= ev.per ? evAt(ev, m, h + j, off) : "";
  return { cur, ends, next, at: t0 + (h + j) * H };
}
const ts = (ms, f) => "<t:" + Math.floor(ms / 1000) + ":" + (f || "R") + ">";

/* ---------- the other cards: one clean style (the item card above stays as it is) ---------- */
const MUTED = 0x34304a, SKILL = 0xb98cff;
function card(d, o) { return Object.assign({ author: { name: "Raider Toolkit", url: d.site, icon_url: d.site + "icon-192.png" }, color: ACCENT }, o); }
function links(...b) { return [{ type: 1, components: b.filter(Boolean).slice(0, 5).map((x) => ({ type: 2, style: 5, label: x[0], url: x[1] })) }]; }
const mapPic = (d, k) => (d.mapimg && d.mapimg[k] ? d.site + d.mapimg[k] : null);
const mapName = (d, k) => (d.maps && d.maps[k]) || MAP_NAMES[k] || k;

function keyReply(d, q) {
  const k = find(d.keys, q);
  if (!k) return notFound("key", q);
  const it = d.items.find((x) => x.id === k.id), fields = [];
  if (k.get) fields.push({ name: "How to get it", value: cut(k.get, 1024) });
  if (k.loot) fields.push({ name: "Inside", value: cut(k.loot, 1024) });
  const e = card(d, { title: k.n, url: d.site + "#keys", description: (k.m ? "**" + k.m + "** · " : "") + cut(k.door || "", 1500), fields });
  if (it && it.ic) e.thumbnail = { url: d.site + "i/" + it.id + ".webp" };
  return { embeds: [e], components: links(["All keys", d.site + "#keys"]) };
}

function questReply(d, q) {
  const x = find(d.quests || [], q);
  if (!x) return notFound("quest", q);
  const top = [x.tr, x.m && x.m.length ? x.m.join(", ") : ""].filter(Boolean).join(" · ");
  const fields = [];
  if (x.g && x.g.length) fields.push({ name: "Hand in", value: list(x.g.map((r) => r[1] + "× " + r[0]), 6, "\n"), inline: true });
  if (x.r && x.r.length) fields.push({ name: "Rewards", value: list(x.r.map((r) => r[1] + "× " + r[0]), 6, "\n"), inline: true });
  const obj = (x.o || []).slice(0, 6).map((o) => "› " + o).join("\n");
  return { embeds: [card(d, { title: x.n, url: d.site + "#quests", description: cut((top ? "**" + top + "**\n" : "") + obj, 2000), fields })], components: links(["Quest tracker", d.site + "#quests"]) };
}

function condReply(d, map, region) {
  const ev = d.ev;
  if (!ev || !ev.m) return { content: "No map condition data right now.", flags: 64 };
  const reg = REGIONS.find((r) => r[0] === region) || REGIONS[0], now = Date.now();
  const keys = (map ? [map] : MAP_ORDER).filter((k) => ev.m[k]);
  if (!keys.length) return { content: "No condition data for that map.", flags: 64 };
  const embeds = keys.map((k, n) => {
    const s = evState(ev, k, now, reg[2]);
    const lines = [s.cur ? "🟢 **" + s.cur + "** · ends " + ts(s.ends) : "⚪ No condition right now"];
    lines.push(s.next ? "Next: **" + s.next + "** " + ts(s.at) + " · " + ts(s.at, "t") : "Nothing else in the next day");
    const e = { title: mapName(d, k), url: d.site + "#maps", description: lines.join("\n"), color: s.cur ? ACCENT : MUTED };
    const pic = mapPic(d, k);
    if (pic) { if (map) e.image = { url: pic }; else e.thumbnail = { url: pic }; }
    if (n === 0) e.author = { name: "Map conditions · " + reg[1], url: d.site + "#maps", icon_url: d.site + "icon-192.png" };
    if (n === keys.length - 1) e.footer = { text: "From the recorded rotation · check the in-game map before you count on it" };
    return e;
  });
  return { embeds, components: links(["Open the maps", d.site + "#maps"]) };
}

/* skill builds: the site's share code is one character per point, in tree order */
const SKA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function skillSummary(d, code) {
  const T = d.skills; if (!T) return null;
  const c = {};
  let pts = 0;
  for (const ch of code) { const id = T.ids[SKA.indexOf(ch)]; if (id) { c[id] = (c[id] || 0) + 1; pts++; } }
  if (!pts) return null;
  const per = T.br.map((b) => [b.n, b.ids.reduce((n, id) => n + (c[id] || 0), 0)]);
  const picks = [].concat(...T.br.map((b) => b.pick.filter((id) => c[id]).map((id) => T.n[id] || id)));
  return { pts, per, picks };
}
function skillCard(d, title, sum, note, url) {
  const fields = sum.per.map((x) => ({ name: x[0], value: "**" + x[1] + "**", inline: true }));
  if (sum.picks.length) fields.push({ name: "Key picks", value: list(sum.picks, 10) });
  return card(d, { title, url, color: SKILL, description: note || undefined, fields });
}
function buildReply(d, q) {
  const builds = d.builds || [];
  if (!q) {
    const lines = builds.map((b) => "**[" + b.n + "](" + d.site + "#skills?b=" + b.code + ")** · " + b.by + (b.tags && b.tags.length ? " · *" + b.tags.join(", ") + "*" : ""));
    return { embeds: [card(d, { title: "Recommended skill builds", url: d.site + "#skills", color: SKILL, description: cut(lines.join("\n") + "\n\nPick one with `/build name:`, or share your own with `/share`.", 4096) })],
      components: links(["Open the skill tree", d.site + "#skills"]) };
  }
  const b = find(builds, q);
  if (!b) return notFound("build", q);
  const planner = d.site + "#skills?b=" + b.code;
  const sum = { pts: b.pts, per: b.per, picks: b.picks || [] };
  const e = skillCard(d, b.n, sum, (b.note ? b.note + "\n" : "") + "*" + [b.by, ...(b.tags || [])].filter(Boolean).join(" · ") + " · " + b.pts + " points*", planner);
  return { embeds: [e], components: links(["Open in the planner", planner], b.url && ["Read the guide", b.url]) };
}

/* weapon build codes: ARC- + base64url("RT1|weapon|owned|from tier|to tier|amplified|slot=mod,slot=mod") */
const ROMAN = ["", "I", "II", "III", "IV", "V"];
const SLOT_NAME = { muzzle: "Muzzle", special: "Special", grip: "Grip", magazine: "Magazine", stock: "Stock" };
const SLOT_ORDER = ["muzzle", "special", "grip", "magazine", "stock"];
function b64uText(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
function readWeaponCode(d, code) {
  try {
    const p = new TextDecoder().decode(b64uText(String(code).trim().replace(/^ARC-/i, ""))).split("|");
    const w = d.weapons.find((x) => x.id === p[1]);
    if (p[0] !== "RT1" || !w) return null;
    const to = Math.min(w.nt, Math.max(1, +p[4] || w.nt)), mods = {};
    (p[6] || "").split(",").filter(Boolean).forEach((kv) => { const a = kv.split("="); if (w.slots[a[0]] && w.slots[a[0]].includes(a[1]) && d.mods[a[1]]) mods[a[0]] = a[1]; });
    return { w, to, amp: p[5] === "1", mods };
  } catch (e) { return null; }
}
function weaponReply(d, q) {
  q = String(q || "").trim();
  const m = q.match(/ARC-[A-Za-z0-9_-]+/i);
  let b = m ? readWeaponCode(d, m[0]) : null;
  const code = b ? m[0] : "";
  if (!b && m) return { content: "That build code couldn't be read. Copy it again with **Copy build code** in the weapon calculator.", flags: 64 };
  if (!b) { const w = find(d.weapons, q); if (!w) return notFound("weapon", q); b = { w, to: w.nt, amp: false, mods: {} }; }
  const w = b.w, url = d.site + "#weapons" + (code ? "?code=" + encodeURIComponent(code) : "");
  const slots = SLOT_ORDER.filter((k) => w.slots[k]);
  const desc = code
    ? (slots.map((k) => "`" + SLOT_NAME[k].padEnd(8) + "` " + (b.mods[k] ? "**" + d.mods[b.mods[k]].n + "**" : "–")).join("\n") || "No attachment slots")
    : "Slots: " + (slots.map((k) => SLOT_NAME[k]).join(", ") || "none") + "\n*Paste a code from Copy build code to share a build with its attachments.*";
  const dps = w.dps[b.to - 1], mag = w.mag[b.to - 1], fields = [];
  if (dps != null) fields.push({ name: "DPS", value: fmt(dps), inline: true });
  if (mag != null) fields.push({ name: "Magazine", value: String(mag), inline: true });
  fields.push({ name: w.t, value: w.r, inline: true });
  const e = card(d, { title: w.n + (w.nt > 1 ? " · Tier " + ROMAN[b.to] : "") + (b.amp ? " · Amplified" : ""), url, color: RARITY[w.r] || ACCENT, description: desc, fields });
  if (w.img) e.image = { url: d.site + "w/" + w.id + ".webp" };
  return { embeds: [e], components: links([code ? "Open this build" : "Weapon calculator", url]) };
}

/* shared shopping lists: "#list?share=" + "z" (deflate-raw) or "j" (plain) + base64url JSON {v, g:[{k, l, i:{item: qty}, n}]} */
async function listReply(d, q) {
  const m = String(q || "").match(/share=([A-Za-z0-9_-]+)/), code = m ? m[1] : String(q || "").trim();
  let g;
  try {
    if (!/^[zj][A-Za-z0-9_-]+$/.test(code)) throw 0;
    let bytes = b64uText(code.slice(1));
    if (code[0] === "z") bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    g = JSON.parse(new TextDecoder().decode(bytes)).g;
    if (!Array.isArray(g)) throw 0;
  } catch (e) {
    return { content: "That shopping list link couldn't be read. Use **Share list** on the site and paste the whole link.", flags: 64 };
  }
  const names = {}; d.items.forEach((x) => { names[x.id] = x.n; });
  const tot = {};
  g.forEach((x) => Object.entries(x.i || {}).forEach(([k, n]) => { if (names[k] && +n > 0) tot[k] = (tot[k] || 0) + Math.min(+n, 99999); }));
  const ids = Object.keys(tot).sort((a, b) => tot[b] - tot[a]);
  const url = d.site + "#list?share=" + code;
  const half = Math.ceil(Math.min(ids.length, 10) / 2), col = (a) => a.map((k) => tot[k] + "× " + names[k]).join("\n");
  const fields = [];
  if (ids.length) {
    fields.push({ name: "Needs", value: col(ids.slice(0, half)), inline: true });
    if (ids.length > 1) fields.push({ name: "​", value: col(ids.slice(half, 10)), inline: true });
  }
  const desc = "For " + list(g.map((x) => cut(String(x.l || "Shared list"), 60)), 4) + (ids.length > 10 ? "\n*and " + (ids.length - 10) + " more items*" : "");
  return {
    embeds: [card(d, { title: "Shopping list · " + ids.length + " item" + (ids.length === 1 ? "" : "s"), url: url.length <= 2000 ? url : d.site + "#list", color: 0x5ff2ea, description: desc, fields })],
    components: links(["Open the full list", url.length <= 512 ? url : d.site + "#list"]),
  };
}

/* shared routes: "#maps?route=r" + base64url JSON {k: map, s: spawn, e: exit, n: max stops, i: items, x: exit name, c: stops} */
function routeReply(d, code) {
  let o;
  try { o = JSON.parse(new TextDecoder().decode(b64uText(code.slice(1)))); } catch (e) { o = null; }
  const k = o && String(o.k || ""), m = k.indexOf("stella_") === 0 ? "stella" : k;
  if (!o || !MAP_NAMES[m] || !Array.isArray(o.i)) return { content: "That route link couldn't be read. Press **Share route** on the map page and paste the whole link.", flags: 64 };
  const names = {}; d.items.forEach((x) => { names[x.id] = x.n; });
  const its = o.i.filter((id) => names[id]).map((id) => names[id]);
  const url = d.site + "#maps?route=" + code;
  const where = mapName(d, m) + (m === "stella" ? (k.endsWith("_u") ? " (upper)" : " (lower)") : "");
  const e = card(d, { title: "Route · " + where, url: url.length <= 2000 ? url : d.site + "#maps", color: 0xb98cff,
    description: [(o.c ? "**" + o.c + " stops**" : ""), o.x ? "out at **" + o.x + "**" : ""].filter(Boolean).join(" · ") || "A planned route",
    fields: its.length ? [{ name: "Looking for", value: list(its, 12) }] : [] });
  const pic = mapPic(d, m); if (pic) e.thumbnail = { url: pic };
  return { embeds: [e], components: links(["Open the route", url.length <= 512 ? url : d.site + "#maps"]) };
}

/* /share: works out what was pasted */
async function shareReply(d, q) {
  q = String(q || "").trim();
  if (/ARC-[A-Za-z0-9_-]+/i.test(q)) return weaponReply(d, q);
  const r = q.match(/route=(r[A-Za-z0-9_-]+)/) || q.match(/^(r[A-Za-z0-9_-]{20,})$/);
  if (r) return routeReply(d, r[1]);
  if (/share=/.test(q) || /^[zj][A-Za-z0-9_-]{10,}$/.test(q)) return listReply(d, q);
  const s = q.match(/skills\?(?:[^#\s]*&)?b=([0-9A-Za-z]+)/);
  if (s) {
    const sum = skillSummary(d, s[1]);
    if (!sum) return { content: "That skill build link couldn't be read. Press **Share build** on the skill tree page and paste the whole link.", flags: 64 };
    const p = q.match(/[?&]p=(\d+)/), url = d.site + "#skills?b=" + s[1] + (p ? "&p=" + p[1] : "");
    return { embeds: [skillCard(d, "Skill build · " + sum.pts + " points", sum, "", url)], components: links(["Open in the planner", url.length <= 512 ? url : d.site + "#skills"]) };
  }
  return { content: "That doesn't look like something from Raider Toolkit. Paste a weapon code (ARC-…), or a **Share list**, **Share build** or **Share route** link.", flags: 64 };
}

function aboutReply(d) {
  return {
    embeds: [card(d, { author: undefined, title: "Raider Toolkit", url: d.site,
      description: "ARC Raiders fan tools: Workshop planner, weapon calculator, blueprint and quest tracker, item finder, maps with route planning, keys, skill tree and a shopping list.\n\n" +
        "`/item` `/quest` `/key` look things up\n`/mapconditions` what is on each map now and next\n`/build` recommended skill builds\n`/share` post a weapon, list, skill build or route you made\n\n*Unofficial fan project, not affiliated with Embark Studios.*",
      image: { url: d.site + "og.jpg" } })],
    components: links(["Open Raider Toolkit", d.site], ["Add the bot", "https://discord.com/oauth2/authorize?client_id=" + (BOT_ENV.app || "1569687605166080112")]),
  };
}
