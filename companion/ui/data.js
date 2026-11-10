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
    parts: { cond: true, next: true, prog: true, items: true, maps: false, soon: false },
    order: ["cond", "next", "prog", "items", "maps", "soon"],   // the overlay's sections, top to bottom (or left to right)
    size: 1,                               // on top of the automatic scaling to the screen height
    bg: 0.8,                               // opacity of the overlay's background, 0.3 to 1
    pos: { a: "tr", x: 0.012, y: 0.1 },    // anchored to a corner or edge, offsets as a share of the screen
    panelBg: 0.95,                         // opacity of the panel's background
  };
  var SECTIONS = { cond: "Condition on your map, with a countdown", next: "The next condition on your map", prog: "List progress",
    items: "Items you still need (up to 4)", maps: "Other maps with a condition right now", soon: "Coming up next on all maps (3)" };
  /* the documents the user accepts on first start; change this date when they change, and the app asks again */
  var TERMS_VERSION = "2026-11-10";

  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
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
    accepted: function () { var a = read("rtc-accepted", null); return !!(a && a.v === TERMS_VERSION); },
    acceptedAt: function () { var a = read("rtc-accepted", null); return a && a.at; },
    accept: function () { write("rtc-accepted", { v: TERMS_VERSION, at: new Date().toISOString() }); }, list: list, addItem: addItem, setHave: setHave, removeItem: removeItem, saveList: saveList,
    progress: progress, importShare: importShare, condition: condition, clock: clock, localTime: localTime, search: search, icon: icon,
    invoke: invoke, openUrl: openUrl, win: win, desktop: !!T,
    mapName: function (k) { return (D && D.maps && D.maps[k]) || SHORT[k] || k; },
  };
})();
