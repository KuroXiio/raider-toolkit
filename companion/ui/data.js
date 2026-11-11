/* Raider Toolkit Companion: data, settings and the shopping list, shared by the strip and the panel.
   Everything comes from raidkits.com/bot.json (the same public data the site and the Discord bot use)
   and from what the user types in. Nothing is read from the game. */
(function () {
  "use strict";
  var SITE = "https://raidkits.com/", DATA_URL = SITE + "bot.json", MAX_AGE = 6 * 3600 * 1000;
  var REGIONS = [["eu", "Europe", 0], ["na", "North America", 7], ["sa", "South America", 6], ["as", "Asia", -5], ["oc", "Oceania", -9]];
  var MAP_ORDER = ["dam", "buried", "space", "gate", "stella", "riven", "pendola"];
  var SHORT = { dam: "Dam", buried: "Buried City", space: "Spaceport", gate: "Blue Gate", stella: "Stella Montis", riven: "Riven Tides", pendola: "Pendola Pass" };
  var DEFAULTS = {
    region: "eu", map: "dam",
    hotkey: "Ctrl+Shift+Space",            // opens and closes the panel
    hotkeyOverlay: "Ctrl+Shift+H",         // shows and hides the overlay
    overlay: true,                         // false: hidden completely
    style: "stack",                        // "stack" (lines under each other) or "line" (one row)
    parts: { map: true, cond: false, prog: true, items: true, quests: true, keys: true, maps: false },
    order: ["map", "cond", "prog", "items", "quests", "keys", "maps"],   // the overlay's parts, top to bottom (or left to right)
    mapView: "map",                        // the map widget: "map", "route" (the route you sent from the site) or "min" (just the header)
    floor: "u",                            // Stella Montis: "u" upper or "l" lower floor
    layers: { list: true, keys: true, quests: true, ext: true },   // what the maps show
    keys: { route: "Ctrl+Shift+R", next: "Ctrl+Shift+N", prev: "Ctrl+Shift+P", mapsize: "Ctrl+Shift+J" },   // only active while the game or this app is in front
    gameOnly: true,                        // show the overlay only while ARC Raiders (or this app) is the window in front
    widgets: {},                           // parts unpinned into their own window: { items: { pinned: false, pos: {...}, size: { w, h } } } (size in em)
    listMax: 8,                            // items shown by the list part while it is pinned in the overlay
    onlyMap: true,                         // the overlay's list shows only items found on your selected map
    autoUpdate: true,                      // check for a new version when the app starts and every 6 hours
    size: 1,                               // on top of the automatic scaling to the screen height
    bg: 0.8,                               // opacity of the overlay's background, 0.3 to 1
    pos: { a: "tr", x: 0.012, y: 0.1 },    // anchored to a corner or edge, offsets as a share of the screen
    panelBg: 0.95,                         // opacity of the panel's background
  };
  var SECTIONS = { map: "Map, with your pins and route", cond: "Condition on your map, with a countdown", prog: "List progress", items: "Items you still need",
    quests: "Quests you follow", keys: "Keys you follow, and where they go", maps: "Other maps with a condition right now" };
  /* TERMS_VERSION: the licence agreement the user must accept. Raise it only when a change affects what users agree to
     (see README); the app then blocks until they accept. PRIVACY_VERSION: raise it when the privacy policy changes;
     the app then shows a one-time notice, without blocking. */
  var TERMS_VERSION = "2026-11-10.3", PRIVACY_VERSION = "2026-11-11.1";

  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} if (window.RTSync) RTSync.touched(k); }
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString("en-US"); };

  /* ---------- the data set ---------- */
  var D = read("rtc-data", null), byId = {};
  function index() {
    byId = {};
    if (!D) return;
    (D.items || []).forEach(function (x) { byId[x.id] = x; });
  }
  index();
  function load(force) {
    var at = read("rtc-data-at", 0);
    if (!force && D && Date.now() - at < MAX_AGE) return Promise.resolve(D);
    return fetch(DATA_URL, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) { D = d; index(); write("rtc-data", d); write("rtc-data-at", Date.now()); return D; })
      .catch(function (e) { if (D) return D; throw e; });   // offline: keep the last copy
  }

  /* ---------- settings and the list (localStorage is shared by both windows; a change fires "storage" in the other) ---------- */
  function settings() {
    var s = read("rtc-settings", {});
    Object.keys(DEFAULTS).forEach(function (k) { if (s[k] === undefined) s[k] = JSON.parse(JSON.stringify(DEFAULTS[k])); });
    Object.keys(DEFAULTS.parts).forEach(function (k) { if (s.parts[k] === undefined) s.parts[k] = DEFAULTS.parts[k]; });
    ["layers", "keys"].forEach(function (g) { Object.keys(DEFAULTS[g]).forEach(function (k) { if (s[g][k] === undefined) s[g][k] = DEFAULTS[g][k]; }); });
    s.order = (Array.isArray(s.order) ? s.order : []).filter(function (k) { return SECTIONS[k]; });
    DEFAULTS.order.forEach(function (k) { if (s.order.indexOf(k) < 0) s.order.push(k); });
    return s;
  }
  function setSetting(k, v) { var s = settings(); s[k] = v; write("rtc-settings", s); return s; }
  function list() { var l = read("rtc-list", null); return l && l.items ? l : { v: 1, items: {}, order: [], from: "" }; }
  function saveList(l) { write("rtc-list", l); }
  function addItem(id, n) {
    var l = list(); n = Math.max(1, n || 1);
    if (l.items[id]) l.items[id].need += n; else { l.items[id] = { need: n, have: 0 }; l.order.push(id); }
    saveList(l); return l;
  }
  function setHave(id, have) { var l = list(), x = l.items[id]; if (!x) return l; x.have = Math.max(0, Math.min(99999, have)); saveList(l); return l; }
  function removeItem(id) { var l = list(); delete l.items[id]; l.order = l.order.filter(function (x) { return x !== id; }); saveList(l); return l; }
  function progress() {
    var l = list(), ids = l.order.filter(function (id) { return l.items[id]; });
    var done = ids.filter(function (id) { return l.items[id].have >= l.items[id].need; }).length;
    return { done: done, total: ids.length };
  }
  /* "0.2.0" < "0.10.1": compares version numbers part by part */
  function versionLess(a, b) {
    var x = String(a || "0").split(".").map(Number), y = String(b || "0").split(".").map(Number);
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0; }
    return false;
  }
  /* is an item found on this map? marked spots there, or a guide that names the map */
  function onMap(id, m) {
    var x = byId[id]; if (!x) return false;
    if (x.sp && x.sp[m]) return true;
    var name = (D && D.maps && D.maps[m]) || "";
    return !!(x.gm && name && x.gm.indexOf(name) > -1);
  }
  /* quests and keys you follow: { quests: { id: { done: [objective numbers] } }, keys: [ids] } */
  function follow() { var f = read("rtc-follow", null) || {}; f.quests = f.quests || {}; f.keys = f.keys || []; return f; }
  function saveFollow(f) { write("rtc-follow", f); }
  function toggleQuest(id) { var f = follow(); if (f.quests[id]) delete f.quests[id]; else f.quests[id] = { done: [] }; saveFollow(f); return !!f.quests[id]; }
  function toggleKey(id) { var f = follow(), i = f.keys.indexOf(id); if (i > -1) f.keys.splice(i, 1); else f.keys.push(id); saveFollow(f); return i < 0; }
  function quest(id) { return D && (D.quests || []).filter(function (x) { return x.id === id; })[0]; }
  function key(id) { return D && (D.keys || []).filter(function (x) { return x.id === id; })[0]; }
  /* the interactive map on raidkits.com, as the app's Map tab shows it */
  function mapUrl(o) {
    o = o || {}; var q = [];
    if (o.map) q.push("map=" + o.map);
    if (o.item) q.push("item=" + o.item); else if (o.key) q.push("key=" + o.key); else if (o.quest) q.push("quest=" + o.quest);
    return SITE + "?embed=1#maps" + (q.length ? "?" + q.join("&") : "");
  }
  /* the route sent from the site's route planner: { k: map picture, n: name, spawn: [x, y], stops: [{ p: [x, y], w: "what is there", ids: [items] }], end: { p, n } }
     and how far along it you are (the number of stops done) */
  function route() { var r = read("rtc-route", null); return r && r.k && Array.isArray(r.stops) && Array.isArray(r.spawn) ? r : null; }
  function setRoute(r) { if (r) write("rtc-route", r); else { localStorage.removeItem("rtc-route"); if (window.RTSync) RTSync.touched("rtc-route"); } write("rtc-route-at", 0); }
  function routeAt() { var r = route(), n = read("rtc-route-at", 0) | 0; return r ? Math.max(0, Math.min(r.stops.length, n)) : 0; }
  function setRouteAt(n) { var r = route(); if (r) write("rtc-route-at", Math.max(0, Math.min(r.stops.length, n | 0))); }
  /* a "Send to app" route link from the site: #app-route= + base64url JSON (the same shape as route() above) */
  function importRoute(text) {
    var m = String(text || "").match(/app-route=([A-Za-z0-9_-]+)/); if (!m) return null;
    try {
      var o = JSON.parse(new TextDecoder().decode(b64u(m[1])));
      if (!o || !o.k || !Array.isArray(o.stops) || !Array.isArray(o.spawn)) throw 0;
      o.at = Date.now(); setRoute(o); return o;
    } catch (e) { throw new Error("That route link is broken or incomplete. Use Send to app on the site's route planner again."); }
  }
  /* every keybind, as the app registers them: the panel, the overlay, and the route and map ones */
  function binds(s) { s = s || settings(); var b = { panel: s.hotkey || "", overlay: s.hotkeyOverlay || "" }; Object.keys(DEFAULTS.keys).forEach(function (k) { b[k] = (s.keys || {})[k] || ""; }); return b; }
  function widget(k) { var w = (settings().widgets || {})[k] || {}; return { pinned: w.pinned !== false, pos: w.pos || null, size: w.size || null }; }
  function setWidget(k, v) { var s = settings(); s.widgets = s.widgets || {}; s.widgets[k] = Object.assign(widget(k), v); write("rtc-settings", s); return s; }

  /* a "Share list" link from the site: #list?share= + "z" (deflate-raw) or "j" + base64url JSON {g:[{l, i:{item: qty}}]} */
  function b64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function importShare(text, replace) {
    var m = String(text || "").match(/share=([A-Za-z0-9_-]+)/), code = m ? m[1] : String(text || "").trim();
    if (!/^[zj][A-Za-z0-9_-]+$/.test(code)) return Promise.reject(new Error("That isn't a Share list link from raidkits.com."));
    var bytes = b64u(code.slice(1));
    var p = code[0] === "z" ? new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer().then(function (b) { return new Uint8Array(b); }) : Promise.resolve(bytes);
    return p.then(function (u) {
      var g = JSON.parse(new TextDecoder().decode(u)).g;
      if (!Array.isArray(g)) throw new Error("bad list");
      var l = replace ? { v: 1, items: {}, order: [], from: "" } : list(), n = 0;
      g.forEach(function (grp) {
        Object.keys(grp.i || {}).forEach(function (id) {
          var q = parseInt(grp.i[id], 10); if (!byId[id] || !(q > 0)) return;
          if (l.items[id]) l.items[id].need += q; else { l.items[id] = { need: q, have: 0 }; l.order.push(id); }
          n++;
        });
      });
      l.from = g.map(function (x) { return String(x.l || "").slice(0, 60); }).filter(Boolean).slice(0, 4).join(", ");
      saveList(l); return n;
    }).catch(function (e) { throw new Error(e && e.message === "bad list" ? "That list link is broken or incomplete." : "That list link couldn't be read. Copy the whole link from Share list."); });
  }

  /* ---------- map conditions: the same recorded rotation and region shift as the site's map page ---------- */
  function evAt(ev, m, h, off) {
    var c = ev.m[m]; if (!c) return "";
    var per = ev.per, mod = function (a) { return ((a % per) + per) % per; };
    var parts = (c[mod(h - off)] || "").split(" + ").filter(function (x) { return x && x !== "Redirection"; });
    if (m === "pendola" && (c[mod(h)] || "").indexOf("Redirection") > -1) parts.push("Redirection");
    return parts.join(" + ");
  }
  function condition(m, region, now) {
    var ev = D && D.ev; if (!ev || !ev.m || !ev.m[m]) return null;
    var off = (REGIONS.filter(function (r) { return r[0] === region; })[0] || REGIONS[0])[2];
    now = now || Date.now();
    var t0 = Date.parse(ev.t0), H = 3600000, h = Math.floor((now - t0) / H), cur = evAt(ev, m, h, off), k = 1;
    if (cur) while (k < ev.per && evAt(ev, m, h + k, off) === cur) k++;
    var j = k; while (j <= ev.per && !evAt(ev, m, h + j, off)) j++;
    return { cur: cur, ends: t0 + (h + k) * H, next: j <= ev.per ? evAt(ev, m, h + j, off) : "", at: t0 + (h + j) * H };
  }
  function clock(ms) { var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (x < 10 ? "0" : "") + x; }
  function localTime(ms) { var d = new Date(ms); return (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes(); }

  /* ---------- search over items, keys and quests ---------- */
  function norm(s) { return String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
  function search(q, max) {
    q = norm(q); if (!q || !D) return [];
    var words = q.split(" "), out = [];
    function score(name) {
      var n = norm(name);
      if (n === q) return 0; if (n.indexOf(q) === 0) return 1; if (n.split(" ").some(function (w) { return w.indexOf(q) === 0; })) return 2;
      if (n.indexOf(q) > -1) return 3; if (words.every(function (w) { return n.indexOf(w) > -1; })) return 4; return -1;
    }
    (D.items || []).forEach(function (x) { var s = score(x.n); if (s >= 0) out.push({ kind: "item", s: s, x: x }); });
    (D.keys || []).forEach(function (x) { var s = score(x.n); if (s >= 0) out.push({ kind: "key", s: s + 0.5, x: x }); });
    (D.quests || []).forEach(function (x) { var s = score(x.n); if (s >= 0) out.push({ kind: "quest", s: s + 0.6, x: x }); });
    out.sort(function (a, b) { return a.s - b.s || a.x.n.length - b.x.n.length; });
    return out.slice(0, max || 30);
  }
  function icon(id, cls) {
    var x = byId[id];
    return x && x.ic ? '<img class="icon ' + (cls || "") + ' r-' + esc(x.r) + '" alt="" src="' + SITE + "i/" + encodeURIComponent(id) + '.webp">' : '<span class="icon r-' + esc(x ? x.r : "") + '" aria-hidden="true"></span>';
  }

  /* ---------- the desktop side (only inside the app; the page still works in a browser for testing) ---------- */
  var T = window.__TAURI__;
  function invoke(cmd, args) { return T ? T.core.invoke(cmd, args || {}) : Promise.resolve(); }
  function openUrl(url) { if (T) return T.core.invoke("plugin:opener|open_url", { url: url }); window.open(url, "_blank"); }   // only raidkits.com and Discord links are allowed
  function win() { return T ? T.window.getCurrentWindow() : null; }

  window.RT = {
    SITE: SITE, REGIONS: REGIONS, MAP_ORDER: MAP_ORDER, SHORT: SHORT, esc: esc, fmt: fmt,
    data: function () { return D; }, item: function (id) { return byId[id]; }, load: load,
    settings: settings, setSetting: setSetting, DEFAULTS: DEFAULTS, SECTIONS: SECTIONS, TERMS_VERSION: TERMS_VERSION,
    versionLess: versionLess, onMap: onMap, follow: follow, saveFollow: saveFollow, toggleQuest: toggleQuest, toggleKey: toggleKey, quest: quest, key: key, mapUrl: mapUrl, widget: widget, setWidget: setWidget,
    binds: binds, route: route, setRoute: setRoute, routeAt: routeAt, setRouteAt: setRouteAt, importRoute: importRoute,
    reset: function () { ["rtc-sync", "rtc-settings", "rtc-list", "rtc-follow", "rtc-placed", "rtc-hotkey-err", "rtc-update", "rtc-route", "rtc-route-at"].forEach(function (k) { localStorage.removeItem(k); }); },
    accepted: function () { var a = read("rtc-accepted", null); return !!(a && a.v === TERMS_VERSION); },
    acceptedAt: function () { var a = read("rtc-accepted", null); return a && a.at; },
    accept: function () { write("rtc-accepted", { v: TERMS_VERSION, at: new Date().toISOString() }); write("rtc-privacy-seen", PRIVACY_VERSION); },
    privacyNews: function () { return read("rtc-privacy-seen", "") !== PRIVACY_VERSION; },
    privacySeen: function () { write("rtc-privacy-seen", PRIVACY_VERSION); }, list: list, addItem: addItem, setHave: setHave, removeItem: removeItem, saveList: saveList,
    progress: progress, importShare: importShare, condition: condition, clock: clock, localTime: localTime, search: search, icon: icon,
    invoke: invoke, openUrl: openUrl, win: win, desktop: !!T,
    mapName: function (k) { return (D && D.maps && D.maps[k]) || SHORT[k] || k; },
  };
})();
