// Raider Toolkit – Discord bot (Cloudflare Worker)
//
// Slash commands answered straight from this worker, so no PC has to stay on:
//   /item <name>        value, recycling, crafting, what it is needed for and where to find it
//   /key <name>         which door a key opens, where, and how to get it
//   /conditions [map]   map conditions now and next, with live countdowns
//   /build [name]       recommended 2.x skill builds, with a link that opens them in the planner
//   /raidkits           what the bot does and a link to the site
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
  { name: "key", description: "Which door a key opens and how to get it", ...WHERE,
    options: [{ type: 3, name: "name", description: "Key name", required: true, autocomplete: true }] },
  { name: "conditions", description: "Map conditions now and next, with timers", ...WHERE,
    options: [
      { type: 3, name: "map", description: "Only this map", choices: MAP_ORDER.map((k) => ({ name: MAP_NAMES[k], value: k })) },
      { type: 3, name: "region", description: "Server region (default Europe)", choices: REGIONS.map((r) => ({ name: r[1], value: r[0] })) },
    ] },
  { name: "build", description: "Recommended 2.x skill builds", ...WHERE,
    options: [{ type: 3, name: "name", description: "Build name (leave empty for the list)", autocomplete: true }] },
  { name: "raidkits", description: "What this bot does, and a link to Raider Toolkit", ...WHERE },
];

let CACHE = { t: 0, d: null };

export default {
  async fetch(req, env, ctx) {
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
    if (name === "key") return msg(keyReply(d, opts.name));
    if (name === "conditions") return msg(condReply(d, opts.map, opts.region));
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
  const list = cmd === "item" ? d.items : cmd === "key" ? d.keys : cmd === "build" ? d.builds : [];
  return rank(list, f.value, (x) => x.n).slice(0, 25).map((x) => ({
    name: (cmd === "build" ? x.n + " · " + x.by : cmd === "key" && x.m ? x.n + " · " + x.m : x.n).slice(0, 100), value: x.id,
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

function keyReply(d, q) {
  const k = find(d.keys, q);
  if (!k) return notFound("key", q);
  const fields = [];
  if (k.m) fields.push({ name: "Map", value: k.m, inline: true });
  if (k.door) fields.push({ name: "Opens", value: cut(k.door, 1024) });
  if (k.get) fields.push({ name: "How to get it", value: cut(k.get, 1024) });
  if (k.loot) fields.push({ name: "Inside", value: cut(k.loot, 1024) });
  const it = d.items.find((x) => x.id === k.id), embed = { title: k.n, url: d.site + "#keys", color: ACCENT, fields, footer: footer(d) };
  if (it && it.ic) embed.thumbnail = { url: d.site + "i/" + it.id + ".webp" };
  return { embeds: [embed], components: [button("All keys on Raider Toolkit", d.site + "#keys")] };
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
function condReply(d, map, region) {
  const ev = d.ev;
  if (!ev || !ev.m) return { content: "No map condition data right now.", flags: 64 };
  const reg = REGIONS.find((r) => r[0] === region) || REGIONS[0], now = Date.now();
  const keys = (map ? [map] : MAP_ORDER).filter((k) => ev.m[k]);
  const fields = keys.map((k) => {
    const s = evState(ev, k, now, reg[2]);
    const lines = [s.cur ? "**Now:** " + s.cur + " · ends " + ts(s.ends) : "**Now:** no condition"];
    lines.push(s.next ? "**Next:** " + s.next + " " + ts(s.at) + " (" + ts(s.at, "t") + ")" : "**Next:** nothing in the next day");
    return { name: (d.maps && d.maps[k]) || MAP_NAMES[k] || k, value: lines.join("\n") };
  });
  if (!fields.length) return { content: "No condition data for that map.", flags: 64 };
  return {
    embeds: [{ title: "Map conditions · " + reg[1], url: d.site + "#maps", color: ACCENT, fields,
      description: "Worked out from the recorded rotation. Usually right, but check the in-game map screen before you count on it.",
      footer: footer(d) }],
    components: [button("Open the maps", d.site + "#maps")],
  };
}

function buildReply(d, q) {
  const builds = d.builds || [];
  if (!q) {
    const lines = builds.map((b) => "**[" + b.n + "](" + d.site + "#skills?b=" + b.code + ")** · " + b.by + (b.tags && b.tags.length ? " · " + b.tags.join(", ") : ""));
    return { embeds: [{ title: "Recommended skill builds", url: d.site + "#skills", color: 0xb98cff, description: cut(lines.join("\n") + "\n\nUse `/build name:` for the details of one build.", 4096), footer: footer(d) }],
      components: [button("Open the skill tree", d.site + "#skills")] };
  }
  const b = find(builds, q);
  if (!b) return notFound("build", q);
  const planner = d.site + "#skills?b=" + b.code;
  const fields = [
    { name: "Points", value: b.per.map((x) => x[0] + " " + x[1]).join(" · ") + " (" + b.pts + " total)" },
  ];
  if (b.picks && b.picks.length) fields.push({ name: "Key picks", value: list(b.picks, 10) });
  if (b.tags && b.tags.length) fields.push({ name: "Good for", value: b.tags.join(", "), inline: true });
  if (b.by) fields.push({ name: "From", value: b.url ? "[" + b.by + "](" + b.url + ")" : b.by, inline: true });
  const row = { type: 1, components: [{ type: 2, style: 5, label: "Open in the planner", url: planner }] };
  if (b.url) row.components.push({ type: 2, style: 5, label: "Read the guide", url: b.url });
  return { embeds: [{ title: b.n, url: planner, color: 0xb98cff, description: b.note || undefined, fields, footer: footer(d) }], components: [row] };
}

function aboutReply(d) {
  return {
    embeds: [{ title: "Raider Toolkit", url: d.site, color: ACCENT, footer: footer(d),
      description: "ARC Raiders fan tools: Workshop planner, weapon calculator, blueprint and quest tracker, item finder, maps, keys, skill tree and a shopping list.\n\n" +
        "**Commands**\n`/item` value, recycling, crafting and where to find it\n`/key` which door a key opens\n`/conditions` map conditions now and next\n`/build` recommended skill builds\n\n" +
        "Unofficial fan project, not affiliated with Embark Studios." }],
    components: [button("Open Raider Toolkit", d.site)],
  };
}
