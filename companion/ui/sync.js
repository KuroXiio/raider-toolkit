/* Sync with raidkits.com: the same shopping list (and route, and followed quests and keys) on the site and in the app.
   Off until the user turns it on with a sync code. The code stays on the user's devices; the sync service only ever
   gets a SHA-256 hash of it (see worker/sync.js). The overlay window does the syncing; the other windows only mark
   what changed. */
(function () {
  "use strict";
  var API = "https://raidkits-sync.hnhdyfy7tb.workers.dev/s/", ABC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  var PARTS = { shop: "rtc-list", route: "rtc-route", follow: "rtc-follow" }, applying = false;

  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function st() { return read("rtc-sync", null); }
  function save(s) { write("rtc-sync", s); }

  /* ---------- the code: 20 letters and digits (100 random bits), shown as RTS-XXXX-XXXX-XXXX-XXXX-XXXX ---------- */
  function newCode() { var b = new Uint8Array(20), c = ""; crypto.getRandomValues(b); for (var i = 0; i < 20; i++) c += ABC[b[i] & 31]; return c; }
  function clean(text) {
    var c = String(text || "").toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^RTS/, "").replace(/O/g, "0").replace(/[IL]/g, "1");
    return c.length === 20 && c.split("").every(function (x) { return ABC.indexOf(x) > -1; }) ? c : "";
  }
  function pretty(c) { return "RTS-" + c.match(/.{4}/g).join("-"); }
  function hash(c) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode("raidkits-sync:" + c)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join("");
    });
  }

  /* ---------- the app's list <-> the site's list (groups of items, plus how many you have) ---------- */
  function shopToList(shop) {
    var l = { v: 1, items: {}, order: [], from: "" }; if (!shop || !Array.isArray(shop.g)) return l;
    shop.g.forEach(function (g) { Object.keys(g.items || {}).forEach(function (id) { var q = +g.items[id] || 0; if (q <= 0) return; if (!l.items[id]) { l.items[id] = { need: 0, have: 0 }; l.order.push(id); } l.items[id].need += q; }); });
    l.order.forEach(function (id) { l.items[id].have = Math.max(0, +((shop.have || {})[id]) || 0); });
    l.from = shop.g.map(function (g) { return String(g.label || "").slice(0, 60); }).filter(Boolean).slice(0, 4).join(", ");
    return l;
  }
  function listToShop(l, prev) {
    var g = JSON.parse(JSON.stringify((prev && prev.g) || [])), have = {};
    var tot = function (id) { return g.reduce(function (n, x) { return n + (+(x.items || {})[id] || 0); }, 0); };
    var app = function () { var x = g.filter(function (y) { return y.key === "app"; })[0]; if (!x) { x = { key: "app", label: "Added in the app", items: {} }; g.push(x); } return x; };
    g.forEach(function (x) { x.items = x.items || {}; Object.keys(x.items).forEach(function (id) { if (!l.items[id]) delete x.items[id]; }); });
    l.order.forEach(function (id) {
      var want = l.items[id].need, d = want - tot(id);
      if (d > 0) { var a = app(); a.items[id] = (a.items[id] || 0) + d; }
      // fewer than the site's groups add up to: take it off the app's own group first, then the newest groups
      var order = g.filter(function (x) { return x.key === "app"; }).concat(g.filter(function (x) { return x.key !== "app"; }).reverse());
      order.forEach(function (x) { if (d >= 0 || !x.items[id]) return; var take = Math.min(x.items[id], -d); x.items[id] -= take; d += take; if (!x.items[id]) delete x.items[id]; });
      have[id] = l.items[id].have;
    });
    g = g.filter(function (x) { return Object.keys(x.items).length || (x.notes && x.notes.length); });
    return { g: g, have: have };
  }

  /* ---------- what changed here (any window marks it; the overlay sends it) ---------- */
  function touched(key) {
    var s = st(); if (!s || applying) return;
    Object.keys(PARTS).forEach(function (p) { if (PARTS[p] === key) { s.t[p] = Date.now(); s.dirty = true; save(s); } });
  }
  function local(p, s) { return p === "shop" ? listToShop(read("rtc-list", { items: {}, order: [] }), s.shop) : read(PARTS[p], null); }
  function apply(p, v, s) {
    applying = true;
    try {
      if (p === "shop") { s.shop = v || { g: [], have: {} }; write("rtc-list", shopToList(s.shop)); }
      else if (p === "route") { var old = read("rtc-route", null); write("rtc-route", v); if (!old || !v || old.at !== v.at) write("rtc-route-at", 0); }
      else write(PARTS[p], v);
    } finally { applying = false; }
  }

  var busy = false;
  /* pull what is newer there, push what is newer here */
  function run(force) {
    var s = st(); if (!s || !s.id || busy) return Promise.resolve();
    busy = true;
    return fetch(API + s.id, { cache: "no-store" }).then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (remote) {
        s = st(); if (!s) return;
        var push = false;
        Object.keys(PARTS).forEach(function (p) {
          var rt = remote ? +remote.t[p] || 0 : 0, lt = +s.t[p] || 0;
          if (remote && rt > lt) { apply(p, remote[p], s); s.t[p] = rt; }
          else if (lt > rt || (!remote && lt)) push = true;
        });
        if (!push && !force) { s.dirty = false; s.at = Date.now(); s.err = ""; save(s); return; }
        var doc = { v: 1, t: s.t };
        Object.keys(PARTS).forEach(function (p) { doc[p] = local(p, s); });
        return fetch(API + s.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) })
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
          .then(function (out) { s = st(); if (!s) return; s.shop = out.shop || doc.shop; s.dirty = false; s.at = Date.now(); s.err = ""; save(s); });
      })
      .catch(function (e) { var s2 = st(); if (s2) { s2.err = "Couldn't reach the sync service. It tries again by itself."; save(s2); } })
      .then(function () { busy = false; });
  }
  function start() {   // the overlay calls this once: a quick check every 3 seconds for changes here, a full pull every 60
    var n = 0;
    setInterval(function () { var s = st(); if (!s) return; n++; if (s.dirty || n % 20 === 0) run(); }, 3000);
    run();
  }

  /* turn on with a new code, or with a code from the site or another PC */
  function create() {
    var c = newCode();
    return hash(c).then(function (id) { var now = Date.now(); save({ code: c, id: id, t: { shop: now, route: read("rtc-route", null) ? now : 0, follow: now }, shop: null, dirty: true }); return run(true); });
  }
  function connect(text) {
    var c = clean(text);
    if (!c) return Promise.reject(new Error("That isn't a sync code. It looks like RTS-XXXX-XXXX-XXXX-XXXX-XXXX."));
    return hash(c).then(function (id) {
      return fetch(API + id, { cache: "no-store" }).then(function (r) {
        if (r.status === 404) throw new Error("Nothing is synced with that code yet. Check it, or create a new one.");
        if (!r.ok) throw new Error("Couldn't reach the sync service. Try again in a moment.");
        save({ code: c, id: id, t: { shop: 0, route: 0, follow: 0 }, shop: null });
        return run();
      });
    });
  }
  /* One-click connect: opens raidkits.com with this PC's sync code in the part of the address that is never sent to a
     server (after the #). The site asks before it connects. Makes a code first if sync was off. */
  function link() {
    var go = function () { var s = st(); if (!s) throw new Error("Couldn't turn sync on. Check your connection and try again."); return RT.openUrl(RT.SITE + "#connect=" + pretty(s.code)); };
    return st() ? Promise.resolve().then(go) : create().then(go);
  }
  function off() { localStorage.removeItem("rtc-sync"); }
  function wipe() { var s = st(); if (!s) return Promise.resolve(); return fetch(API + s.id, { method: "DELETE" }).then(function (r) { if (!r.ok) throw 0; off(); }, function () { throw new Error("Couldn't reach the sync service. Try again in a moment."); }); }

  /* Settings → Sync (drawn by the panel) */
  function view(state) {
    var s = st(), esc = RT.esc, h = '<div class="h">Sync with raidkits.com</div>';
    if (!s) {
      h += '<p class="note">Keep your shopping list the same here and on raidkits.com, on any PC. Routes you send from the site\'s route planner arrive here by themselves too. It\'s off until you turn it on.</p>';
      h += '<div class="srow"><div class="sl"><span class="lb">Connect to raidkits.com</span><small>Opens the site in your browser. Press Connect there and you are done.</small></div><div class="sc"><button type="button" class="btn sm go" data-act="link">Connect</button></div></div>';
      h += '<div class="srow"><div class="sl"><span class="lb">Or by hand</span><small>Makes a new sync code. Then on raidkits.com open your shopping list → Sync, and paste it there.</small></div><div class="sc"><button type="button" class="btn sm" data-act="sync-new">Create a code</button></div></div>';
      h += '<div class="paste"><label for="scode" class="note">Already have a code from the site or another PC?</label><div class="pr"><input type="text" id="scode" placeholder="RTS-XXXX-XXXX-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false"><button type="button" class="btn" data-act="sync-join">Connect</button></div></div>';
    } else {
      h += '<div class="srow"><div class="sl"><span class="lb">Your sync code</span><small>Paste it on raidkits.com (shopping list → Sync) or in the app on another PC. Anyone with it can see and change your synced list, so keep it to yourself.</small></div><div class="sc">' +
        (state.syncShow ? '<span class="code">' + esc(pretty(s.code)) + "</span>" : '<span class="code">RTS-••••-••••-••••-••••-' + esc(s.code.slice(16)) + "</span>") +
        '<button type="button" class="btn sm" data-act="sync-show">' + (state.syncShow ? "Hide" : "Show") + '</button><button type="button" class="btn sm" data-act="sync-copy">Copy</button></div></div>';
      h += '<div class="srow"><div class="sl"><span class="lb">Connect a browser</span><small>Opens raidkits.com in your browser. Press Connect there and that browser uses this list too.</small></div><div class="sc"><button type="button" class="btn sm" data-act="link">Open raidkits.com</button></div></div>';
      h += '<div class="srow"><div class="sl"><span class="lb">Status</span><small>' + (s.err ? '<span class="err">' + esc(s.err) + "</span>" : s.at ? "Synced " + esc(new Date(s.at).toLocaleTimeString()) + ". Changes go out within a few seconds; the app checks for changes from the site every minute." : "Syncing…") + '</small></div><div class="sc"><button type="button" class="btn sm" data-act="sync-now">Sync now</button></div></div>';
      h += '<div class="srow"><div class="sl"><span class="lb">Stop syncing on this PC</span><small>Your list stays here. The synced copy stays for your other devices.</small></div><div class="sc"><button type="button" class="btn sm" data-act="sync-off">Stop</button></div></div>';
      h += '<div class="srow"><div class="sl"><span class="lb">Delete synced data</span><small>Removes the synced copy from the sync service and stops syncing here. Lists on your devices stay.</small></div><div class="sc"><button type="button" class="btn sm" data-act="sync-wipe">' + (state.syncWipe ? "Sure? Press again" : "Delete") + "</button></div></div>";
    }
    if (state.syncMsg) h += '<p class="' + (state.syncMsgOk ? "ok" : "err") + '" role="status">' + esc(state.syncMsg) + "</p>";
    h += '<p class="note">What is synced: your shopping list, the route you sent from the site, and the quests and keys you follow. Not your settings. The sync service gets only a scrambled form of your code, never the code itself, and no name, e-mail or account. A synced list is deleted after 180 days without changes. See the privacy policy for more.</p>';
    return h;
  }

  window.RTSync = { touched: touched, start: start, run: run, create: create, connect: connect, link: link, off: off, wipe: wipe, pretty: pretty, state: st, _clean: clean, _shopToList: shopToList, _listToShop: listToShop };
  if (window.RT) RT.syncView = view;
})();
