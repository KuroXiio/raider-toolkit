/* The panel ("opened mode"): list, interactive map, quests, keys, map conditions, search and settings.
   Opened with the keybind, the tray icon, or on first start for the agreement screen. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); }, esc = RT.esc, view = $("view");
  var tab = "list", state = { q: "", sel: null, addQ: "", importOpen: false, importErr: "", capture: "", hkErr: "", doc: null, agree: false, drag: null,
    listMap: false, kMap: null, kq: "", qq: "", mapSrc: "", upd: "", version: "" };
  var IC = {
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
    quests: '<path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    keys: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    conds: '<path d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  };
  var TABS = [["list", "Shopping list"], ["map", "Map"], ["quests", "Quests"], ["keys", "Keys"], ["conds", "Map conditions"], ["search", "Search"], ["settings", "Settings"]];
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"></path></svg>';
  var X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  var MAPI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"></path></svg>';
  var LEGAL = [["EULA.txt", "Licence agreement and terms of use"], ["PRIVACY.txt", "Privacy policy"], ["SAFETY.txt", "What the app does and doesn't do"], ["THIRD-PARTY-NOTICES.txt", "Third-party notices"], ["LICENSE.txt", "Source code licence (MIT)"]];
  var shortOf = function (k) { return RT.SHORT[k] || k; };
  var join = function (a) { return a ? a.map(function (x) { return x[1] + "× " + esc(x[0]); }).join(", ") : ""; };
  function kv(rows) { return '<dl class="kv">' + rows.filter(function (r) { return r[1]; }).map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>"; }

  /* opens the Map tab on raidkits.com's interactive map, showing an item, key or quest */
  function showOnMap(o) { state.mapSrc = RT.mapUrl(o); tab = "map"; render(); }

  /* ---------- the condition banner ---------- */
  function banner() {
    var s = RT.settings(), c = RT.data() ? RT.condition(s.map, s.region) : null, now = Date.now();
    if (!c) { $("cond").innerHTML = '<span class="dot"></span><span class="grow"><small>' + esc(RT.mapName(s.map)) + "</small><strong>" + (RT.data() ? "No data for this map" : "Loading data…") + "</strong></span>"; return; }
    $("cond").innerHTML = '<span class="dot' + (c.cur ? " on" : "") + '"></span><span class="grow"><small>' + esc(RT.mapName(s.map)) + " · now</small><strong>" + esc(c.cur || "No condition") + "</strong></span>" +
      '<span class="t">' + (c.cur ? "<b>" + RT.clock(c.ends - now) + "</b>" : "") + "<small>" + (c.next ? "next: " + esc(c.next) + " at " + RT.localTime(c.at) : "") + "</small></span>";
  }

  /* ---------- Shopping list ---------- */
  function catOf(it) { var f = String((it && it.f) || "").split(/\s*,\s*/)[0]; return f || (/ARC/.test((it && it.t) || "") ? "ARC" : "Other"); }
  function mapsOf(id) { var it = RT.item(id); if (!it || !it.sp) return ""; return Object.keys(it.sp).sort(function (a, b) { return it.sp[b] - it.sp[a]; }).slice(0, 3).map(shortOf).join(", "); }
  function listView() {
    var s = RT.settings(), l = RT.list(), ids = l.order.filter(function (id) { return l.items[id] && RT.item(id); }), p = RT.progress(), h = '<div class="wrapc">';
    if (ids.length) {
      h += '<div class="row" style="min-height:auto;padding-top:12px"><span class="nm">' + p.done + " of " + p.total + " done" + (l.from ? ' <span class="dim">· ' + esc(l.from) + "</span>" : "") + "</span></div>";
      h += '<div class="bar"><i style="width:' + (p.total ? Math.round(p.done / p.total * 100) : 0) + '%"></i></div>';
      h += '<div class="seg2"><button type="button" data-lm="0" aria-pressed="' + !state.listMap + '">Everything</button><button type="button" data-lm="1" aria-pressed="' + state.listMap + '">Only on ' + esc(shortOf(s.map)) + "</button></div>";
    } else h += '<p class="note" style="margin:14px 0 4px">Your list is empty. Paste a <b>Share list</b> link from raidkits.com, or add items below.</p>';
    h += '<div class="acts"><button type="button" class="btn' + (ids.length ? "" : " go") + '" data-act="import">Import from raidkits.com</button>' + (ids.length ? '<button type="button" class="btn" data-act="clear">Clear</button>' : "") + "</div>";
    if (state.importOpen) h += '<div class="box"><label for="imp" class="note">On raidkits.com press <b>Share list</b>, copy the link and paste it here.</label><input type="text" id="imp" placeholder="https://raidkits.com/#list?share=…" autocomplete="off">' +
      '<div class="acts" style="margin:0"><button type="button" class="btn go" data-act="imp-add">Add to my list</button><button type="button" class="btn" data-act="imp-rep">Replace my list</button></div>' + (state.importErr ? '<div class="err" role="alert">' + esc(state.importErr) + "</div>" : "") + "</div>";
    var show = state.listMap ? ids.filter(function (id) { return RT.onMap(id, s.map); }) : ids, groups = {}, order = [], done = [];
    show.forEach(function (id) { var x = l.items[id]; if (x.have >= x.need) { done.push(id); return; } var c = catOf(RT.item(id)); if (!groups[c]) { groups[c] = []; order.push(c); } groups[c].push(id); });
    order.sort(function (a, b) { return groups[b].length - groups[a].length; });
    function row(id) {
      var x = l.items[id], it = RT.item(id), where = mapsOf(id);
      return '<div class="row' + (x.have >= x.need ? " done" : "") + '">' + RT.icon(id) + '<span class="nm" title="' + esc(it.n) + '">' + esc(it.n) + (where ? "<small>" + esc(where) + "</small>" : "") + "</span>" +
        (it.sp ? '<button type="button" class="ibtn" data-mapitem="' + esc(id) + '" aria-label="Show ' + esc(it.n) + ' on the map" title="Show on the map">' + MAPI + "</button>" : "") +
        '<span class="qty"><button type="button" data-have="' + esc(id) + '" data-d="-1" aria-label="One less ' + esc(it.n) + '">−</button><span>' + x.have + " / " + x.need + '</span><button type="button" data-have="' + esc(id) + '" data-d="1" aria-label="One more ' + esc(it.n) + '">+</button></span>' +
        '<button type="button" class="ibtn" data-del="' + esc(id) + '" aria-label="Remove ' + esc(it.n) + '">' + X + "</button></div>";
    }
    order.forEach(function (c) { h += '<div class="h">' + esc(c) + "</div>" + groups[c].map(row).join(""); });
    if (done.length) h += '<div class="h">Done</div>' + done.map(row).join("");
    if (state.listMap && ids.length > show.length) h += '<p class="note">' + (ids.length - show.length) + " more on your list aren't found on " + esc(shortOf(s.map)) + ".</p>";
    h += '<div class="h">Add an item</div><input type="search" id="addq" placeholder="Search items: Metal Parts, Toaster…" autocomplete="off" value="' + esc(state.addQ) + '"><div class="res" id="addres"></div></div>';
    return h;
  }
  function addResults() {
    var box = $("addres"); if (!box) return;
    var r = RT.search(state.addQ, 8).filter(function (x) { return x.kind === "item"; });
    box.innerHTML = r.map(function (x) { return '<button type="button" data-add="' + esc(x.x.id) + '">' + RT.icon(x.x.id) + "<span>" + esc(x.x.n) + '</span><span class="kind">+ add</span></button>'; }).join("") || (state.addQ ? '<p class="note">No item by that name.</p>' : "");
  }

  /* ---------- Map: raidkits.com's interactive map, loaded from the web ---------- */
  function mapView() {
    var src = state.mapSrc || RT.mapUrl({ map: RT.settings().map });
    return '<div class="mapbar"><span>The interactive map from raidkits.com. Pick a map, filter markers or plan a route right here.</span><button type="button" class="btn sm" data-act="map-reload">Reload</button><button type="button" class="btn sm" data-url="' + esc(src.replace("?embed=1", "")) + '">Open in browser</button></div>' +
      '<iframe class="map" title="raidkits.com interactive map" src="' + esc(src) + '" referrerpolicy="no-referrer"></iframe>';
  }

  /* ---------- Quests ---------- */
  function questCard(q, f) {
    var fq = f.quests[q.id], done = (fq && fq.done) || [], left = (q.o || []).length - done.length;
    var h = '<div class="card' + (fq ? " on" : "") + '"><div class="top"><b>' + esc(q.n) + '</b><button type="button" class="btn sm" data-fq="' + esc(q.id) + '" aria-pressed="' + !!fq + '">' + (fq ? "Following" : "Follow") + "</button></div>";
    h += '<div class="note">' + esc([q.tr, (q.m || []).join(", ")].filter(Boolean).join(" · ")) + "</div>";
    h += (q.o || []).map(function (o, i) { var d = done.indexOf(i) > -1; return '<label class="obj' + (d ? " done" : "") + '"><input type="checkbox" data-obj="' + esc(q.id) + '" data-i="' + i + '"' + (d ? " checked" : "") + (fq ? "" : " disabled") + "><span>" + esc(o) + "</span></label>"; }).join("");
    h += kv([["Hand in", join(q.g)], ["Rewards", join(q.r)]]);
    if (fq && left === 0) h += '<div class="ok">All objectives done: hand it in to ' + esc(q.tr) + ".</div>";
    if (q.pin) h += '<div class="acts" style="margin:4px 0 0"><button type="button" class="btn sm" data-mapquest="' + esc(q.id) + '">' + "Show on the map</button></div>";
    return h + "</div>";
  }
  function questsView() {
    var f = RT.follow(), D = RT.data(), mine = Object.keys(f.quests).map(RT.quest).filter(Boolean), h = '<h1 class="tt">Quests</h1>';
    h += '<p class="note">Follow a quest to tick off its objectives here and see it in the overlay while you play.</p>';
    h += '<input type="search" id="qq" placeholder="Find a quest to follow…" autocomplete="off" value="' + esc(state.qq) + '" aria-label="Find a quest"><div class="res" id="qqres"></div>';
    h += '<div class="h">Following (' + mine.length + ")</div>";
    h += mine.length ? '<div class="grid2">' + mine.map(function (q) { return questCard(q, f); }).join("") + "</div>" : '<p class="note">You don\'t follow any quests yet.</p>';
    return h;
  }
  function questResults() {
    var box = $("qqres"); if (!box) return;
    var f = RT.follow(), r = RT.search(state.qq, 10).filter(function (x) { return x.kind === "quest"; });
    box.innerHTML = r.map(function (x) { return '<button type="button" data-fq="' + esc(x.x.id) + '"><span>' + esc(x.x.n) + '</span><span class="kind">' + esc(x.x.tr || "") + " · " + (f.quests[x.x.id] ? "following" : "+ follow") + "</span></button>"; }).join("") || (state.qq ? '<p class="note">No quest by that name.</p>' : "");
  }

  /* ---------- Keys ---------- */
  function keysView() {
    var D = RT.data(), f = RT.follow(), m = state.kMap || RT.settings().map, q = state.kq.trim().toLowerCase();
    var all = (D.keys || []).filter(function (k) { return (m === "all" || k.mk === m || k.mk === "any") && (!q || (k.n + " " + k.door).toLowerCase().indexOf(q) > -1); });
    var h = '<h1 class="tt">Keys</h1><p class="note">Where every key goes and how to get it. Star a key to keep it in the overlay.</p>';
    h += '<div class="chips">' + [["all", "All maps"]].concat(RT.MAP_ORDER.map(function (k) { return [k, RT.mapName(k)]; })).map(function (x) {
      var n = (D.keys || []).filter(function (k) { return x[0] === "all" || k.mk === x[0]; }).length;
      return n ? '<button type="button" data-kmap="' + x[0] + '" aria-pressed="' + (m === x[0]) + '">' + esc(x[1]) + " (" + n + ")</button>" : "";
    }).join("") + "</div>";
    h += '<input type="search" id="kq" placeholder="Search keys: hotel, tower, hospital…" autocomplete="off" value="' + esc(state.kq) + '" aria-label="Search keys">';
    h += '<div class="grid2" style="margin-top:12px">' + all.map(function (k) {
      var on = f.keys.indexOf(k.id) > -1;
      return '<div class="card' + (on ? " on" : "") + '"><div class="top">' + RT.icon(k.id) + "<b>" + esc(k.n) + '</b><button type="button" class="star" data-fk="' + esc(k.id) + '" aria-pressed="' + on + '" aria-label="Follow ' + esc(k.n) + '" title="Show in the overlay">' + STAR + "</button></div>" +
        kv([["Map", esc(k.m)], ["Opens", esc(k.door)], ["How to get it", esc(k.get || "")], ["Inside", esc(k.loot || "")]]) +
        (k.pin ? '<div class="acts" style="margin:4px 0 0"><button type="button" class="btn sm" data-mapkey="' + esc(k.id) + '">Show the door on the map</button></div>' : "") + "</div>";
    }).join("") + "</div>" + (all.length ? "" : '<p class="note">No key matches.</p>');
    return h;
  }

  /* ---------- Map conditions ---------- */
  var ICON_STAR = STAR;
  function condsView() {
    var s = RT.settings(), now = Date.now(), h = '<h1 class="tt">Map conditions</h1><div class="row" style="max-width:420px"><label for="region" class="nm">Server region</label><select id="region" style="width:200px">' +
      RT.REGIONS.map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === s.region ? " selected" : "") + ">" + r[1] + "</option>"; }).join("") + "</select></div>";
    h += '<p class="note">The star picks your map: the overlay, the list filter and this panel follow it.</p><div class="grid2">';
    RT.MAP_ORDER.forEach(function (k) {
      var c = RT.condition(k, s.region, now); if (!c) return;
      h += '<div class="card' + (c.cur ? " on" : "") + '"><div class="top"><span class="dot' + (c.cur ? " on" : "") + '"></span><b>' + esc(RT.mapName(k)) + "</b>" +
        '<button type="button" class="star" data-map="' + k + '" aria-pressed="' + (s.map === k) + '" aria-label="Make ' + esc(RT.mapName(k)) + ' my map" title="My map">' + ICON_STAR + "</button></div>" +
        (c.cur ? "<div>" + esc(c.cur) + ' · ends in <span class="mono" style="color:var(--cyan)">' + RT.clock(c.ends - now) + "</span></div>" : '<div class="dim">No condition right now</div>') +
        (c.next ? '<div class="note">Next: ' + esc(c.next) + " at " + RT.localTime(c.at) + ' <span class="mono">(' + RT.clock(c.at - now) + ")</span></div>" : "") + "</div>";
    });
    return h + '</div><p class="note">Worked out from the recorded rotation, like on raidkits.com. Usually right, but check the in-game map screen before you count on it.</p>';
  }

  /* ---------- Search ---------- */
  function searchView() {
    if (state.sel) return detail(state.sel);
    return '<div class="wrapc" style="padding-top:12px"><input type="search" id="q" placeholder="Search items, keys and quests…" autocomplete="off" value="' + esc(state.q) + '" aria-label="Search"><div class="res" id="qres"></div></div>';
  }
  function searchResults() {
    var box = $("qres"); if (!box) return;
    box.innerHTML = RT.search(state.q, 30).map(function (x) {
      var sub = x.kind === "item" ? (x.x.r || "") + (x.x.v ? " · " + RT.fmt(x.x.v) : "") : x.kind === "key" ? "Key · " + (x.x.m || "") : "Quest · " + (x.x.tr || "");
      return '<button type="button" data-sel="' + x.kind + ":" + esc(x.x.id) + '">' + (x.kind === "quest" ? '<span class="icon" aria-hidden="true"></span>' : RT.icon(x.x.id)) + "<span>" + esc(x.x.n) + '</span><span class="kind">' + esc(sub) + "</span></button>";
    }).join("") || (state.q ? '<p class="note">Nothing matches that. Try a shorter name.</p>' : '<p class="note">Type to search every item, key and quest.</p>');
  }
  function detail(sel) {
    var k = sel.split(":")[0], id = sel.slice(k.length + 1), f = RT.follow(), h = '<div class="wrapc"><button type="button" class="back" data-act="back">‹ Back to results</button><div class="detail">';
    if (k === "item") {
      var it = RT.item(id); if (!it) return h + "</div></div>";
      h += '<div class="row">' + RT.icon(id) + "<h2>" + esc(it.n) + "</h2></div>";
      h += kv([["Value", RT.fmt(it.v)], ["Rarity", esc(it.r)], ["Type", esc(it.t)], ["Loot area", esc(it.f || "")], ["Found on", esc(mapsOf(id))], ["Recycles into", join(it.rc)],
        ["Crafted at", it.cb ? esc(it.cb) + (it.rp ? " from " + join(it.rp) : "") : ""], ["Needed for", it.ws ? it.ws.map(function (x) { return esc(x[0]) + " (" + x[1] + "×)"; }).join(", ") : ""],
        ["Quests", it.qs ? esc(it.qs.join(", ")) : ""], ["Where to find it", it.g ? esc(it.g) + (it.gm && it.gm.length ? '<br><span class="dim">' + esc(it.gm.join(", ")) + "</span>" : "") : ""]]);
      h += '<div class="acts"><button type="button" class="btn go" data-add="' + esc(id) + '">Add to my list</button>' + (it.sp ? '<button type="button" class="btn" data-mapitem="' + esc(id) + '">Show on the map</button>' : "") + '<button type="button" class="btn" data-url="' + esc(RT.SITE + "#items?q=" + encodeURIComponent(it.n)) + '">Open on raidkits.com</button></div>';
    } else if (k === "key") {
      var key = RT.key(id); if (!key) return h + "</div></div>";
      var on = f.keys.indexOf(id) > -1;
      h += '<div class="row">' + RT.icon(id) + "<h2>" + esc(key.n) + "</h2></div>" + kv([["Map", esc(key.m)], ["Opens", esc(key.door)], ["How to get it", esc(key.get || "")], ["Inside", esc(key.loot || "")]]);
      h += '<div class="acts"><button type="button" class="btn" data-fk="' + esc(id) + '" aria-pressed="' + on + '">' + (on ? "In the overlay" : "Show in the overlay") + "</button>" + (key.pin ? '<button type="button" class="btn" data-mapkey="' + esc(id) + '">Show the door on the map</button>' : "") + "</div>";
    } else {
      var q = RT.quest(id); if (!q) return h + "</div></div>";
      h += "</div>" + questCard(q, f);
    }
    return h + "</div></div>";
  }

  /* ---------- Settings ---------- */
  var SPOTS = [["tl", "Top left"], ["tc", "Top centre"], ["tr", "Top right"], ["ml", "Left"], ["", ""], ["mr", "Right"], ["bl", "Bottom left"], ["bc", "Bottom centre"], ["br", "Bottom right"]];
  var SPOT_POS = { tl: { x: 0.012, y: 0.1 }, tc: { x: 0, y: 0.1 }, tr: { x: 0.012, y: 0.1 }, ml: { x: 0.012, y: 0 }, mr: { x: 0.012, y: 0 }, bl: { x: 0.012, y: 0.24 }, bc: { x: 0, y: 0.16 }, br: { x: 0.012, y: 0.24 } };
  function hkRow(key, label) {
    var v = RT.settings()[key];
    return '<div class="row" style="flex-wrap:wrap;max-width:620px"><span class="nm" style="white-space:normal">' + esc(label) + "<br>" +
      (state.capture === key ? '<span class="dim">Press the keys you want…</span>' : v ? '<span class="kbd">' + esc(v) + "</span>" : '<span class="dim">Off</span>') + "</span>" +
      (state.capture === key ? '<button type="button" class="btn" data-act="hk-cancel">Cancel</button>' : '<button type="button" class="btn" data-hk="' + key + '">Change</button>' + (v ? '<button type="button" class="btn" data-hkoff="' + key + '">Turn off</button>' : "")) + "</div>";
  }
  function settingsView() {
    if (state.doc) return '<button type="button" class="back" data-act="doc-back">‹ Back to settings</button><pre class="doc" id="doc">Loading…</pre>';
    var s = RT.settings(), D = RT.data(), err = state.hkErr || JSON.parse(localStorage.getItem("rtc-hotkey-err") || '""'), up = JSON.parse(localStorage.getItem("rtc-update") || "null");
    var h = '<h1 class="tt">Settings</h1><div class="h">Overlay</div>';
    h += '<label class="chk"><input type="checkbox" data-set="overlay"' + (s.overlay ? " checked" : "") + "> Show the overlay in game</label>";
    h += '<div class="seg2" role="group" aria-label="Overlay style"><button type="button" data-style="stack" aria-pressed="' + (s.style !== "line") + '">Stacked</button><button type="button" data-style="line" aria-pressed="' + (s.style === "line") + '">One line</button></div>';
    h += '<p class="note">Its parts, in order. Drag the handle to move one. <b>Unpin</b> gives a part its own small window that you can move and resize while this panel is open; a bigger list window shows more items.</p><ul class="arr" id="arr">' +
      s.order.map(function (k, i) {
        var pinned = RT.widget(k).pinned;
        return '<li data-k="' + k + '"><span class="grip" title="Drag to move" aria-hidden="true"><i></i></span><label class="chk"><input type="checkbox" data-part="' + k + '"' + (s.parts[k] ? " checked" : "") + "> " + esc(RT.SECTIONS[k]) + "</label>" +
          '<button type="button" class="pinb" data-pinw="' + k + '" aria-pressed="' + pinned + '">' + (pinned ? "Unpin" : "Pin back") + "</button>" +
          '<button type="button" class="mv" data-mv="' + k + '" data-d="-1" aria-label="Move up"' + (i ? "" : " disabled") + '>↑</button><button type="button" class="mv" data-mv="' + k + '" data-d="1" aria-label="Move down"' + (i < s.order.length - 1 ? "" : " disabled") + ">↓</button></li>";
      }).join("") + "</ul>";
    h += '<label class="chk"><input type="checkbox" data-set="onlyMap"' + (s.onlyMap ? " checked" : "") + "> The list shows only items found on your map (" + esc(shortOf(s.map)) + ")</label>";
    h += '<label for="lmax" class="note">Items shown while the list is pinned: <b id="lmaxv">' + s.listMax + '</b></label><input type="range" id="lmax" min="3" max="30" step="1" value="' + s.listMax + '">';
    h += '<label for="size" class="note">Size <b id="sizev">' + Math.round(s.size * 100) + '%</b> <span class="dim">(also follows your screen height)</span></label><input type="range" id="size" min="0.7" max="1.6" step="0.05" value="' + s.size + '">';
    h += '<label for="bg" class="note">Opacity <b id="bgv">' + Math.round(s.bg * 100) + '%</b></label><input type="range" id="bg" min="0.3" max="1" step="0.05" value="' + s.bg + '">';
    h += '<div class="note" style="margin-top:8px">Where it sits</div><div class="spots">' + SPOTS.map(function (x) { return x[0] ? '<button type="button" data-spot="' + x[0] + '" aria-pressed="' + (s.pos.a === x[0]) + '" aria-label="' + x[1] + '" title="' + x[1] + '"><i></i></button>' : "<span></span>"; }).join("") +
      '</div><p class="note">Or drag it while this panel is open. Places are kept as a share of the screen and sizes follow the screen height, so the layout stays the same at any resolution or screen shape. Use the game in Borderless or Windowed mode so the overlay can show on top.</p>';
    h += '<div class="h">Panel</div><label for="pbg" class="note">Opacity <b id="pbgv">' + Math.round(s.panelBg * 100) + '%</b></label><input type="range" id="pbg" min="0.6" max="1" step="0.05" value="' + s.panelBg + '">';
    h += '<div class="h">Keybinds</div>' + hkRow("hotkey", "Open or close this panel") + hkRow("hotkeyOverlay", "Show or hide the overlay");
    if (err) h += '<p class="err" role="alert">Couldn\'t use ' + esc(err) + ". Another program may already use it; pick a different one.</p>";
    h += '<p class="note">Use Ctrl, Alt or Shift with a key, or an F key. They use the same standard Windows shortcut feature as Discord and Steam. The tray icon (bottom right of the taskbar) also opens this panel, shows or hides the overlay, and quits.</p>';
    h += '<div class="h">Updates</div><p class="note">This is version ' + esc(state.version || "…") + "." + (up ? ' <b style="color:#ffd666">Version ' + esc(up.version) + " is out.</b>" : "") + "</p>";
    h += '<label class="chk"><input type="checkbox" data-set="autoUpdate"' + (s.autoUpdate ? " checked" : "") + "> Check for new versions when the app starts and every 6 hours</label>";
    h += '<div class="acts">' + (up ? '<button type="button" class="btn go" data-act="install">Install ' + esc(up.version) + " and restart</button>" : "") + '<button type="button" class="btn" data-act="check">Check now</button></div>' + (state.upd ? '<p class="note" role="status">' + esc(state.upd) + "</p>" : "");
    h += '<p class="note">Updates come from the app\'s releases on GitHub and are signed, so the app only installs updates made by Raider Toolkit. Your list and settings are kept.</p>';
    h += '<div class="h">Data</div><p class="note">' + (D ? "From raidkits.com · patch " + esc(D.patch) + " · updated " + esc(D.built) : "Not loaded yet.") + '</p><button type="button" class="btn" data-act="refresh">Update data now</button>';
    h += '<div class="h">About</div><p class="note" style="max-width:620px">Raider Toolkit Companion is an unofficial fan app, not affiliated with or endorsed by Embark Studios. ARC Raiders and its names and art belong to Embark Studios AB.</p>' +
      '<p class="note" style="max-width:620px">It is an ordinary window. It never reads, changes or connects to the game: no game files, memory, screen capture, injected code or simulated input. Everything it shows comes from raidkits.com and what you type in. Embark decides which programs are allowed with their game, so use it at your own risk.</p>';
    h += '<div class="h">Legal</div><div class="res" style="max-width:620px">' + LEGAL.map(function (x) { return '<button type="button" data-doc="' + x[0] + '"><span>' + esc(x[1]) + '</span><span class="kind">' + esc(x[0]) + "</span></button>"; }).join("") + "</div>";
    var acc = RT.acceptedAt(); if (acc) h += '<p class="note">You accepted these on ' + esc(new Date(acc).toLocaleDateString()) + ".</p>";
    h += '<p class="note">The same files are in the app\'s install folder, under legal. <button type="button" class="link" data-url="' + RT.SITE + '">raidkits.com</button> · <button type="button" class="link" data-url="https://discord.gg/NE3ughZTxn">Discord</button></p>';
    h += '<div class="h">Reset and uninstall</div><div class="acts"><button type="button" class="btn" data-act="reset">' + (state.resetAsk ? "Sure? Press again to reset" : "Reset everything") + "</button></div>" +
      '<p class="note" style="max-width:620px">Reset clears your list, followed quests and keys, layout and settings. To remove the app: Windows Settings → Apps → Installed apps → Raider Toolkit Companion → Uninstall. Tick "Delete the application data" there to remove your saved data too.</p>';
    return h;
  }

  /* ---------- first start: read and accept the documents ---------- */
  function agreementView() {
    if (state.doc) return '<button type="button" class="back" data-act="doc-back">‹ Back</button><pre class="doc" id="doc">Loading…</pre>';
    return '<div class="gate"><h1>Before you start</h1>' +
      '<p class="note">Raider Toolkit Companion is a free, unofficial fan app for ARC Raiders, not affiliated with Embark Studios. It is an ordinary window that never reads, changes or connects to the game. Please read these first:</p>' +
      '<div class="res">' + LEGAL.slice(0, 3).map(function (x) { return '<button type="button" data-doc="' + x[0] + '"><span>' + esc(x[1]) + '</span><span class="kind">Read ›</span></button>'; }).join("") + "</div>" +
      '<label class="chk agree"><input type="checkbox" id="agree"' + (state.agree ? " checked" : "") + "> <span>I have read and accept the <b>Licence agreement and terms of use</b>, and I have read the <b>Privacy policy</b>.</span></label>" +
      '<div class="acts"><button type="button" class="btn go" data-act="accept"' + (state.agree ? "" : " disabled") + '>Accept and start</button><button type="button" class="btn" data-act="decline">Decline and quit</button></div>' +
      '<p class="note">You can read them again any time in Settings → Legal, and in the app\'s install folder (the legal folder).</p></div>';
  }

  /* ---------- drawing ---------- */
  function navHtml() { return TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '" title="' + t[1] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + IC[t[0]] + "</svg><span>" + t[1] + "</span></button>"; }).join(""); }
  function updPill() { var up = JSON.parse(localStorage.getItem("rtc-update") || "null"), b = $("upd"); b.hidden = !up; if (up) b.textContent = "Update " + up.version + " ›"; }
  function render(keepFocus) {
    var f = keepFocus && document.activeElement && document.activeElement.id, pos = f && document.activeElement.selectionStart, top = view.scrollTop, ok = RT.accepted();
    document.body.classList.toggle("gate", !ok);
    document.documentElement.style.setProperty("--pbg", RT.settings().panelBg);
    view.classList.toggle("full", ok && tab === "map");
    if (!ok) { view.innerHTML = agreementView(); return; }
    $("nav").innerHTML = navHtml(); banner(); updPill();
    if (!RT.data()) { view.innerHTML = '<p class="note" style="margin-top:14px">Loading data from raidkits.com… If this takes long, check your internet connection.</p>'; return; }
    if (tab === "map") { if (!view.querySelector("iframe") || view.dataset.src !== (state.mapSrc || "")) { view.innerHTML = mapView(); view.dataset.src = state.mapSrc || ""; } return; }   // don't reload the map on every redraw
    view.dataset.src = "";
    view.innerHTML = tab === "list" ? listView() : tab === "quests" ? questsView() : tab === "keys" ? keysView() : tab === "conds" ? condsView() : tab === "search" ? searchView() : settingsView();
    if (tab === "list") addResults();
    if (tab === "quests") questResults();
    if (tab === "search" && !state.sel) searchResults();
    view.scrollTop = top;
    if (f && $(f)) { $(f).focus(); try { $(f).setSelectionRange(pos, pos); } catch (e) {} }
  }

  /* ---------- events ---------- */
  $("nav").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (!b) return;
    tab = b.dataset.tab; state.capture = ""; state.doc = null; state.resetAsk = false; if (tab === "map") state.mapSrc = state.mapSrc || ""; view.scrollTop = 0; render();
    var fi = { search: "q", quests: "qq", keys: "kq" }[tab]; if (fi && $(fi) && !state.sel) $(fi).focus();
  });
  $("hide").addEventListener("click", function () { RT.invoke("toggle_panel"); });   // hides it, and tells the overlay it can't be moved any more
  $("upd").addEventListener("click", function () { tab = "settings"; render(); var u = view.querySelector('[data-act="install"]'); if (u) { u.scrollIntoView({ block: "center" }); u.focus(); } });

  view.addEventListener("click", function (e) {
    var t = e.target.closest("button"); if (!t) return;
    var d = t.dataset;
    if (d.have) { var x = RT.list().items[d.have]; if (x) RT.setHave(d.have, x.have + (+d.d)); render(); return; }
    if (d.del) { RT.removeItem(d.del); render(); return; }
    if (d.add) { RT.addItem(d.add, 1); if (tab === "search") t.textContent = "Added ✓"; else { state.addQ = ""; render(); } return; }
    if (d.lm) { state.listMap = d.lm === "1"; render(); return; }
    if (d.map) { RT.setSetting("map", d.map); state.kMap = null; render(); return; }
    if (d.mapitem) { showOnMap({ item: d.mapitem, map: RT.onMap(d.mapitem, RT.settings().map) ? RT.settings().map : "" }); return; }
    if (d.mapkey) { showOnMap({ key: d.mapkey }); return; }
    if (d.mapquest) { showOnMap({ quest: d.mapquest }); return; }
    if (d.fq) { RT.toggleQuest(d.fq); render(); return; }
    if (d.fk) { RT.toggleKey(d.fk); render(); return; }
    if (d.kmap) { state.kMap = d.kmap; render(); return; }
    if (d.sel) { state.sel = d.sel; render(); view.scrollTop = 0; return; }
    if (d.url) { RT.openUrl(d.url); return; }
    if (d.mv) { var o = RT.settings().order, i = o.indexOf(d.mv), j = i + (+d.d); if (j >= 0 && j < o.length) { o.splice(j, 0, o.splice(i, 1)[0]); RT.setSetting("order", o); render(); } return; }
    if (d.pinw) { var pinned = RT.widget(d.pinw).pinned; RT.setWidget(d.pinw, { pinned: !pinned }); if (pinned) { var s = RT.settings(); s.parts[d.pinw] = true; RT.setSetting("parts", s.parts); } render(); return; }
    if (d.style) { RT.setSetting("style", d.style); render(); return; }
    if (d.spot) { var sp = SPOT_POS[d.spot]; RT.setSetting("pos", { a: d.spot, x: sp.x, y: sp.y }); render(); return; }
    if (d.hk) { state.capture = d.hk; state.hkErr = ""; render(); return; }
    if (d.hkoff) { setHotkey(d.hkoff, ""); return; }
    if (d.doc) { state.doc = d.doc; render(); view.scrollTop = 0; fetch("legal/" + d.doc).then(function (r) { return r.text(); }).then(function (tx) { var el = $("doc"); if (el) el.textContent = tx; }, function () { var el = $("doc"); if (el) el.textContent = "Couldn't open this file. It is also in the app's install folder, under legal."; }); return; }
    switch (d.act) {
      case "doc-back": state.doc = null; render(); break;
      case "accept": if (state.agree) { RT.accept(); state.doc = null; tab = "list"; render(); } break;
      case "decline": RT.invoke("quit_app"); break;
      case "import": state.importOpen = !state.importOpen; state.importErr = ""; render(); if ($("imp")) $("imp").focus(); break;
      case "imp-add": case "imp-rep":
        RT.importShare($("imp").value, d.act === "imp-rep").then(function () { state.importOpen = false; state.importErr = ""; render(); }, function (er) { state.importErr = er.message; render(); });
        break;
      case "clear": RT.saveList({ v: 1, items: {}, order: [], from: "" }); render(); break;
      case "back": state.sel = null; render(); if ($("q")) $("q").focus(); break;
      case "hk-cancel": state.capture = ""; render(); break;
      case "map-reload": view.innerHTML = mapView(); break;
      case "refresh": t.disabled = true; t.textContent = "Updating…"; RT.load(true).then(function () { render(); }, function () { t.textContent = "Couldn't reach raidkits.com"; }); break;
      case "check": state.upd = "Checking…"; render();
        RT.invoke("check_update").then(function (u) {
          if (u) { localStorage.setItem("rtc-update", JSON.stringify({ version: u.version, notes: u.notes || "", at: Date.now() })); state.upd = "Version " + u.version + " is out."; }
          else { localStorage.removeItem("rtc-update"); state.upd = "You have the latest version."; }
          render();
        }, function (er) { state.upd = "Couldn't check for updates (" + er + ")."; render(); });
        break;
      case "install": t.disabled = true; t.textContent = "Downloading…"; state.upd = "Downloading and checking the update. The app restarts by itself when it's done.";
        RT.invoke("install_update").catch(function (er) { state.upd = "The update couldn't be installed (" + er + "). Try again later, or download it from raidkits.com."; render(); });
        break;
      case "reset": if (!state.resetAsk) { state.resetAsk = true; render(); break; } RT.reset(); state.resetAsk = false; state.listMap = false; render(); break;
    }
  });
  view.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "addq") { state.addQ = t.value; addResults(); }
    if (t.id === "q") { state.q = t.value; searchResults(); }
    if (t.id === "qq") { state.qq = t.value; questResults(); }
    if (t.id === "kq") { state.kq = t.value; render(true); }
    if (t.id === "size") { RT.setSetting("size", +t.value); $("sizev").textContent = Math.round(t.value * 100) + "%"; }
    if (t.id === "bg") { RT.setSetting("bg", +t.value); $("bgv").textContent = Math.round(t.value * 100) + "%"; }
    if (t.id === "pbg") { RT.setSetting("panelBg", +t.value); $("pbgv").textContent = Math.round(t.value * 100) + "%"; document.documentElement.style.setProperty("--pbg", +t.value); }
    if (t.id === "lmax") { RT.setSetting("listMax", +t.value); $("lmaxv").textContent = t.value; }
  });
  view.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "agree") { state.agree = t.checked; render(); return; }
    if (t.id === "region") { RT.setSetting("region", t.value); render(); }
    if (t.dataset.set === "overlay") { RT.setSetting("overlay", t.checked); RT.invoke("show_overlay", { show: t.checked }); }
    if (t.dataset.set === "onlyMap" || t.dataset.set === "autoUpdate") RT.setSetting(t.dataset.set, t.checked);
    if (t.dataset.part) { var s = RT.settings(); s.parts[t.dataset.part] = t.checked; RT.setSetting("parts", s.parts); }
    if (t.dataset.obj) { var f = RT.follow(), q = f.quests[t.dataset.obj]; if (q) { var i = +t.dataset.i, k = q.done.indexOf(i); if (t.checked && k < 0) q.done.push(i); if (!t.checked && k > -1) q.done.splice(k, 1); RT.saveFollow(f); render(); } }
  });

  /* drag to arrange the overlay's parts: hold the handle and move the row up or down */
  view.addEventListener("pointerdown", function (e) { var g = e.target.closest(".grip"); if (!g) return; e.preventDefault(); state.drag = g.closest("li"); state.drag.classList.add("dragging"); g.setPointerCapture(e.pointerId); });
  view.addEventListener("pointermove", function (e) {
    if (!state.drag) return;
    var list = $("arr"), over = Array.prototype.filter.call(list.children, function (r) { var b = r.getBoundingClientRect(); return e.clientY >= b.top && e.clientY <= b.bottom; })[0];
    if (!over || over === state.drag) return;
    var b = over.getBoundingClientRect(); list.insertBefore(state.drag, e.clientY > b.top + b.height / 2 ? over.nextSibling : over);
  });
  function dragEnd() { if (!state.drag) return; state.drag.classList.remove("dragging"); state.drag = null; RT.setSetting("order", Array.prototype.map.call($("arr").children, function (r) { return r.dataset.k; })); render(); }
  view.addEventListener("pointerup", dragEnd); view.addEventListener("pointercancel", dragEnd);

  /* keybinds: modifiers + one key, written the way Windows hotkeys are registered (e.g. Ctrl+Shift+Space) */
  function keyName(e) {
    var c = e.code;
    if (/^Key[A-Z]$/.test(c)) return c.slice(3);
    if (/^Digit[0-9]$/.test(c)) return c.slice(5);
    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(c)) return c;
    return { Space: "Space", Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Backslash: "\\", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/", Insert: "Insert", Delete: "Delete", Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown" }[c] || "";
  }
  function setHotkey(key, accel) {
    var s = RT.settings(), next = { hotkey: s.hotkey, hotkeyOverlay: s.hotkeyOverlay }; next[key] = accel;
    if (accel && next.hotkey === next.hotkeyOverlay) { state.hkErr = accel + " (it is already your other keybind)"; state.capture = ""; render(); return; }
    RT.invoke("set_hotkeys", { panel: next.hotkey || "", overlay: next.hotkeyOverlay || "" }).then(function (failed) {
      failed = failed || [];
      if (failed.indexOf(accel) > -1) { state.hkErr = accel; RT.invoke("set_hotkeys", { panel: s.hotkey || "", overlay: s.hotkeyOverlay || "" }); }
      else { RT.setSetting(key, accel); state.hkErr = ""; localStorage.removeItem("rtc-hotkey-err"); }
      state.capture = ""; render();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (!state.capture) { if (e.key === "Escape" && (state.sel || state.doc)) { state.sel = null; state.doc = null; render(); } return; }
    e.preventDefault();
    if (e.key === "Escape") { state.capture = ""; render(); return; }
    var k = keyName(e); if (!k) return;
    var mods = (e.ctrlKey ? "Ctrl+" : "") + (e.altKey ? "Alt+" : "") + (e.shiftKey ? "Shift+" : "");
    if (!mods && !/^F\d+$/.test(k)) { state.hkErr = k + " on its own (add Ctrl, Alt or Shift, or use an F key)"; render(); return; }
    setHotkey(state.capture, mods + k);
  });

  window.addEventListener("storage", function () {
    if (state.drag) return;
    if (tab === "map") { banner(); updPill(); return; }
    if (!document.activeElement || !/^(q|qq|kq|addq|imp)$/.test(document.activeElement.id)) render(); else { banner(); updPill(); }
  });
  if (window.__TAURI__) window.__TAURI__.app.getVersion().then(function (v) { state.version = v; if (tab === "settings") render(); });
  render();
  setInterval(function () { if (!RT.accepted()) return; if (tab === "conds") render(true); else banner(); }, 1000);
  RT.load().then(function () { render(); }, function () { render(); });
})();
