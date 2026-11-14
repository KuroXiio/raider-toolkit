/* The panel ("opened mode"): list, interactive map, quests, keys, map conditions, search and settings.
   Opened with the keybind, the tray icon, or on first start for the agreement screen. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); }, esc = RT.esc, view = $("view");
  var tab = "home", state = { q: "", sel: null, addQ: "", importOpen: false, importErr: "", capture: "", hkErr: "", doc: null, agree: false, drag: null,
    listMap: false, kMap: null, kq: "", qq: "", mapSrc: "", upd: "", version: "" };
  var IC = {
    home: '<path d="M4 11l8-7 8 7M6 10v9h4v-5h4v5h4v-9"/>',
    overlay: '<rect x="3" y="4" width="18" height="14" rx="2"></rect><path d="M7 8h5M7 12h3M16 9v5M8 21h8"></path>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
    quests: '<path d="M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    keys: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    conds: '<path d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  };
  var TABS = [["home", "Home"], ["settings", "Settings"]];   // everything else lives in the in-game bar
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"></path></svg>';
  var X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  var MAPI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"></path></svg>';
  var LEGAL = [["EULA.txt", "Licence agreement and terms of use"], ["PRIVACY.txt", "Privacy policy"], ["SAFETY.txt", "What the app does and doesn't do"], ["THIRD-PARTY-NOTICES.txt", "Third-party notices"], ["LICENSE.txt", "Source code licence (MIT)"]];
  var shortOf = function (k) { return RT.SHORT[k] || k; };
  var join = function (a) { return a ? a.map(function (x) { return x[1] + "× " + esc(x[0]); }).join(", ") : ""; };
  function kv(rows) { return '<dl class="kv">' + rows.filter(function (r) { return r[1]; }).map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>"; }

  /* opens the Map tab on raidkits.com's interactive map, showing an item, key or quest */
  function showOnMap(o) { o = o || {}; if (o.map && RT.settings().map !== o.map && RT.MAP_ORDER.indexOf(o.map) > -1) RT.setSetting("map", o.map); state.mapSrc = (o.item ? "&item=" + encodeURIComponent(o.item) : "") + (o.key ? "&key=" + encodeURIComponent(o.key) : ""); state.mapN = (state.mapN || 0) + 1; tab = "map"; render(); }

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
  function introCard() {
    var s = RT.settings();
    return '<div class="gs"><h2>How Raider Toolkit works</h2><ol>' +
      "<li><span><b>Build your list here</b> or on raidkits.com. Turn on sync and the two stay the same.</span></li>" +
      "<li><span><b>Start ARC Raiders</b> in Borderless or Windowed mode.</span></li>" +
      "<li><span><b>Press <kbd>" + esc(s.hotkey || "your menu keybind") + "</kbd> in game</b> for the bar: the map with item and key search, your route, your list, quests and conditions. Pin the ones you want to keep on screen while you play.</span></li>" +
      "<li><span><kbd>" + esc(s.hotkeyOverlay || "your keybind") + "</kbd> hides pinned widgets completely. This window can stay open, minimized or closed to the tray.</span></li></ol>" +
      '<div class="acts"><button type="button" class="btn go" data-act="intro-done">Got it</button><button type="button" class="btn" data-goto="settings:game">In-game settings</button><button type="button" class="btn" data-goto="settings:sync">Turn on sync</button></div></div>';
  }
  function listView() {
    var s = RT.settings(), l = RT.list(), ids = l.order.filter(function (id) { return l.items[id] && RT.item(id); }), p = RT.progress(), h = '<div class="wrapc">';
    if (ids.length) {
      h += '<div class="row" style="min-height:auto;padding-top:12px"><span class="nm">' + p.done + " of " + p.total + " done" + (l.from ? ' <span class="dim">· ' + esc(l.from) + "</span>" : "") + "</span></div>";
      h += '<div class="bar"><i style="width:' + (p.total ? Math.round(p.done / p.total * 100) : 0) + '%"></i></div>';
      h += '<div class="seg2"><button type="button" data-lm="0" aria-pressed="' + !state.listMap + '">Everything</button><button type="button" data-lm="1" aria-pressed="' + state.listMap + '">Only on ' + esc(shortOf(s.map)) + "</button></div>";
    } else {
      if (!localStorage.getItem("rtc-intro-done")) h += introCard();
      h += '<p class="note" style="margin:14px 0 4px">Your list is empty. Search for items to add below, paste a <b>Share list</b> link from raidkits.com, or turn on sync to use the list you build on the site.</p>';
    }
    h += '<div class="acts"><button type="button" class="btn' + (ids.length ? "" : " go") + '" data-act="import">Import from raidkits.com</button>' + (ids.length ? '<button type="button" class="btn" data-act="clear">Clear</button>' : "") + "</div>";
    if (state.importOpen) h += '<div class="box"><label for="imp" class="note">On raidkits.com press <b>Share list</b>, copy the link and paste it here.</label><input type="text" id="imp" placeholder="https://raidkits.com/#list?share=…" autocomplete="off">' +
      '<div class="acts" style="margin:0"><button type="button" class="btn go" data-act="imp-add">Add to my list</button><button type="button" class="btn" data-act="imp-rep">Replace my list</button></div>' + (state.importErr ? '<div class="err" role="alert">' + esc(state.importErr) + "</div>" : "") + "</div>";
    // adding sits at the top, so its results are always in view however long the list is
    h += '<div class="addbox"><label for="addq" class="h" style="margin-top:4px">Add an item</label><input type="search" id="addq" placeholder="Search items to add: Metal Parts, Toaster…" autocomplete="off" value="' + esc(state.addQ) + '"><div class="res" id="addres"></div></div>';
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
    return h + "</div>";
  }
  function addResults() {
    var box = $("addres"); if (!box) return;
    var r = RT.search(state.addQ, 200).filter(function (x) { return x.kind === "item"; }).slice(0, 8);
    box.innerHTML = r.map(function (x) { return '<button type="button" data-add="' + esc(x.x.id) + '">' + RT.icon(x.x.id) + "<span>" + esc(x.x.n) + '</span><span class="kind">+ add</span></button>'; }).join("") || (state.addQ ? '<p class="note">No item by that name.</p>' : "");
  }

  /* ---------- Map: raidkits.com's interactive map, loaded from the web ---------- */
  /* Map and route: the same widgets as the in-game bar, docked. Search, plan a route by picking your spawn, play it stop by stop. */
  function mapView() { return '<iframe class="map" title="Map, route, list and quests" src="hub.html?embed=1' + (state.mapSrc || "") + '"></iframe>'; }

  /* ---------- Home: the one thing to do (open the bar), what you have, and one place to bring things in ---------- */
  function homeView() {
    var s = RT.settings(), l = RT.list(), n = l.order.filter(function (id) { return l.items[id] && RT.item(id); }).length, left = l.order.filter(function (id) { var x = l.items[id]; return x && RT.item(id) && x.have < x.need; }).length;
    var sy = window.RTSync && RTSync.state(), rt = RT.route(), f = state.focus;
    var h = '<section class="pnl hero2"><span class="tagk">In the game</span><h1>Press <kbd>' + esc(s.hotkey || "not set") + "</kbd> while you play</h1>" +
      "<p>It opens the bar over ARC Raiders with your map, route, shopping list, quests and conditions. Pin the ones you want to keep on screen.</p>" +
      '<div class="acts"><button type="button" class="btn go" data-act="menu">Open the bar</button><span class="state">' + (f && f[0] ? '<span class="dot on"></span>ARC Raiders is in front' : "Works on the desktop too, to set things up") + "</span></div></section>";
    h += '<div class="tiles"><button type="button" class="tile2" data-act="menu"><span class="tagk">Shopping list</span><b>' + (n ? left + " left to find" : "Empty") + "</b><small>" + (n ? n + (n === 1 ? " item" : " items") + " on it" : "Add items in the bar") + "</small></button>" +
      '<button type="button" class="tile2" data-act="menu"><span class="tagk">Route</span><b>' + (rt ? esc(rt.n || RT.mapName(RTMapName(rt.k))) : "None yet") + "</b><small>" + (rt ? "Stop " + Math.min(RT.routeAt() + 1, rt.stops.length + 1) + " of " + (rt.stops.length + 1) : "Pick your spawn in the bar") + "</small></button>" +
      '<button type="button" class="tile2" data-goto="settings:sync"><span class="tagk">raidkits.com</span><b>' + (sy ? (sy.err ? "Problem" : "Connected") : "Not connected") + "</b><small>" + (sy ? (sy.err ? esc(sy.err) : "Same list here and on the site") : "Connect below") + "</small></button></div>";
    h += '<section class="pnl imp2" id="homeimp"><h2>' + (sy ? "Connected to raidkits.com" : "Use your list and routes from raidkits.com") + "</h2>" +
      (sy ? '<p class="note" style="margin:0">Your shopping list is the same here and on the site. Press <b>Send to app</b> in the site\'s route planner and the route shows up in the bar.</p><div class="acts"><button type="button" class="btn" data-act="link">Connect another browser</button></div>'
          : '<p class="note" style="margin:0">One click: your browser opens the site, you press Connect there, done.</p><div class="acts"><button type="button" class="btn go" data-act="link">Connect to raidkits.com</button></div>') +
      (state.homeMsg ? '<p class="' + (state.homeOk ? "ok" : "err") + '" role="status" style="margin:0">' + esc(state.homeMsg) + "</p>" : "") +
      "<details" + (state.homeHelp ? " open" : "") + "><summary>Or paste a sync code or a link by hand</summary>" +
      '<div class="pr"><input type="text" id="himp" placeholder="Sync code, Share list link or Send to app link" autocomplete="off" spellcheck="false" aria-label="Sync code, Share list link or Send to app link"><button type="button" class="btn" data-act="home-go">Import</button></div>' +
      '<dl class="where"><div><dt>Sync code</dt><dd>Shopping list → <b>Sync</b> on raidkits.com.</dd></div>' +
      "<div><dt>Send to app link</dt><dd>Maps → Plan a route → <b>Send to app</b>. One route, once.</dd></div>" +
      "<div><dt>Share list link</dt><dd>Shopping list → <b>Share list</b>. One list, once.</dd></div></dl></details></section>";
    return h;
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
  /* ---------- settings: short groups, every row the same shape (what it is on the left, the control on the right) ---------- */
  var SSECT = [["game", "In game"], ["keys", "Keybinds"], ["sync", "Sync"], ["updates", "Updates and data"], ["about", "About and legal"]];
  var HK = [["hotkey", "Open or close the in-game bar", "The bar with the map, route, list and quests over the game. Works everywhere."], ["hotkeyOverlay", "Show or hide pinned widgets", "Works everywhere."],
    ["k:route", "Show or hide your route", ""], ["k:next", "Next stop (stop done)", ""], ["k:prev", "Back one stop", ""], ["k:route", "", ""]].slice(0, 5);
  function hkVal(id) { var s = RT.settings(); return id.indexOf("k:") === 0 ? (s.keys || {})[id.slice(2)] || "" : s[id] || ""; }
  function srow(label, desc, control, extra) {
    return '<div class="srow' + (extra ? " " + extra : "") + '"><div class="sl"><span class="lb">' + label + "</span>" + (desc ? "<small>" + desc + "</small>" : "") + '</div><div class="sc">' + control + "</div></div>";
  }
  function sw(set, on, label) { return '<label class="sw"><input type="checkbox" data-set="' + set + '"' + (on ? " checked" : "") + ' aria-label="' + esc(label) + '"><span aria-hidden="true"></span></label>'; }
  function slider(id, min, max, step, val, shown) { return '<div class="sld"><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><b id="' + id + 'v">' + shown + "</b></div>"; }
  function hkRow(id, label, desc) {
    var v = hkVal(id), cap = state.capture === id;
    return srow(esc(label), desc,
      (cap ? '<span class="dim">Press the keys…</span><button type="button" class="btn sm" data-act="hk-cancel">Cancel</button>'
        : (v ? '<span class="kbd">' + esc(v) + "</span>" : '<span class="dim">Off</span>') + '<button type="button" class="btn sm" data-hk="' + id + '">Change</button>' + (v ? '<button type="button" class="btn sm" data-hkoff="' + id + '">Off</button>' : "")));
  }
  function settingsView() {
    if (state.doc) return '<button type="button" class="back" data-act="doc-back">‹ Back to settings</button><pre class="doc" id="doc">Loading…</pre>';
    var sec = state.sset || "game";
    var h = '<h1 class="tt">Settings</h1><div class="snav" role="tablist" aria-label="Settings">' + SSECT.map(function (x) { return '<button type="button" role="tab" data-sset="' + x[0] + '" aria-selected="' + (sec === x[0]) + '">' + x[1] + "</button>"; }).join("") + '</div><div class="sbox">';
    h += ({ game: overlayView, map: setMap, keys: setKeys, sync: setSync, updates: setUpdates, about: setAbout }[sec] || overlayView)();
    return h + "</div>";
  }
  /* the In game page: how the bar works, and the few things worth changing about it */
  function overlayView() {
    var s = RT.settings(), f = state.focus, hb = s.hub || {}, pin = hb.pin || { route: true, list: true }, sz = hb.size || 1;
    var W = [["map", "Map"], ["route", "Route"], ["list", "Shopping list"], ["quests", "Quests and keys"], ["cond", "Map condition"]];
    var h = '<p class="note">Pinned widgets stay on screen while you play, where you dragged them in the bar. <kbd class="kbd">' + esc(s.hotkeyOverlay || "not set") + "</kbd> hides them.</p>";
    h += '<div class="h">Pinned widgets</div>';
    h += W.map(function (x) { return srow(x[1], x[0] === "route" ? "Your next stop and what to pick up there." : x[0] === "list" ? "What you still need on this map." : x[0] === "map" ? "Your pins, or your route when you have one." : x[0] === "quests" ? "Objectives and keys you follow." : "What is active on your map, and for how long.", sw("pin:" + x[0], !!pin[x[0]], "Keep " + x[1] + " on screen while you play")); }).join("");
    h += '<div class="h">Look</div>';
    h += srow("Show pinned widgets", "Your keybind and the tray icon switch it too.", sw("overlay", s.overlay, "Show pinned widgets"));
    h += srow("Only while you play", "Hides them when another program is in front, for example when you Alt-Tab to a browser." + (f ? ' <span class="' + (f[0] ? "ok" : "dim") + '">' + (f[0] ? "ARC Raiders is in front right now." : "ARC Raiders isn't in front right now.") + "</span>" : ""), sw("gameOnly", s.gameOnly, "Only while you play"));
    h += srow("Size", "Of the bar and its widgets. They already follow your screen's resolution and shape.", '<div class="seg2">' + [[0.85, "Small"], [1, "Medium"], [1.2, "Large"]].map(function (x) { return '<button type="button" data-hubsize="' + x[0] + '" aria-pressed="' + (Math.abs(sz - x[0]) < 0.01) + '">' + x[1] + "</button>"; }).join("") + "</div>");
    h += srow("See-through", "How solid pinned widgets are over the game.", slider("bg", 0.3, 1, 0.05, s.bg, Math.round(s.bg * 100) + "%"));
    h += '<p class="note">Play in Borderless or Windowed mode so the bar and pinned widgets can show on top of the game. To move a widget, open the bar and drag it by its top edge.</p>';
    return h;
  }
  function setMap() {
    var s = RT.settings(), rt = RT.route(), L = s.layers;
    var h = '<div class="h">Your map</div>';
    h += srow("Map", "Used by the map, the list and the route.", '<select id="smap">' + RT.MAP_ORDER.map(function (k) { return '<option value="' + k + '"' + (s.map === k ? " selected" : "") + ">" + esc(RT.mapName(k)) + "</option>"; }).join("") + "</select>");
    if (s.map === "stella") h += srow("Floor", "Stella Montis has two.", '<div class="seg2"><button type="button" data-floor="u" aria-pressed="' + (s.floor !== "l") + '">Upper</button><button type="button" data-floor="l" aria-pressed="' + (s.floor === "l") + '">Lower</button></div>');
    h += '<div class="h">Shown on the maps</div>';
    h += srow("Shopping list", "Where the items you still need can be found.", sw("layer:list", L.list, "Shopping list"));
    h += srow("Keys you follow", "The doors they open.", sw("layer:keys", L.keys, "Keys you follow"));
    h += srow("Quests you follow", "Spots their objectives point to.", sw("layer:quests", L.quests, "Quests you follow"));
    h += srow("Extracts", "", sw("layer:ext", L.ext, "Extracts"));
    h += '<div class="h">Route</div>';
    h += rt ? srow(esc(rt.n || "Your route"), esc(RT.mapName(RTMapName(rt.k))) + " · " + rt.stops.length + " stops · stop " + Math.min(RT.routeAt() + 1, rt.stops.length) + " is next", '<button type="button" class="btn sm" data-act="route-restart">Start over</button><button type="button" class="btn sm" data-act="route-clear">Remove</button>')
      : '<p class="note">No route yet. Plan one on raidkits.com (Maps → Plan a route) and press <b>Send to app</b>. With sync on it arrives by itself; otherwise paste the link here.</p>';
    h += '<div class="paste"><label for="rimp" class="note">Route link from Send to app</label><div class="pr"><input type="text" id="rimp" placeholder="https://raidkits.com/#app-route=…" autocomplete="off" spellcheck="false"><button type="button" class="btn" data-act="route-imp">Use this route</button></div>' +
      (state.routeErr ? '<p class="err" role="alert">' + esc(state.routeErr) + "</p>" : state.routeOk ? '<p class="ok" role="status">' + esc(state.routeOk) + "</p>" : "") + "</div>";
    return h;
  }
  function RTMapName(k) { return String(k).indexOf("stella_") === 0 ? "stella" : k; }
  function setKeys() {
    var err = state.hkErr || JSON.parse(localStorage.getItem("rtc-hotkey-err") || '""');
    var h = '<div class="h">Keybinds</div>' + HK.slice(0, 2).map(function (x) { return hkRow(x[0], x[1], x[2]); }).join("");
    h += '<div class="h">Map and route</div><p class="note">These work only while the game or this app is in front, so they never take keys away from other programs.</p>' + HK.slice(2).map(function (x) { return hkRow(x[0], x[1], x[2]); }).join("");
    if (err) h += '<p class="err" role="alert">Couldn\'t use ' + esc(err) + ". Another program may already use it; pick a different one.</p>";
    h += '<p class="note">Use Ctrl, Alt or Shift with a key, or an F key. They use the same standard Windows shortcut feature as Discord and Steam. The tray icon (bottom right of the taskbar) also opens this window and the in-game bar, shows or hides the overlay, and quits.</p>';
    return h;
  }
  function setSync() { return RT.syncView ? RT.syncView(state) : ""; }
  function setUpdates() {
    var s = RT.settings(), D = RT.data(), up = JSON.parse(localStorage.getItem("rtc-update") || "null");
    var h = '<div class="h">Updates</div>';
    if (state.store) h += srow("Version " + esc(state.version || "…"), "This copy is from the Microsoft Store, which installs updates for you.", "");
    else {
      h += srow("Version " + esc(state.version || "…"), up ? '<b style="color:#ffd666">Version ' + esc(up.version) + " is out.</b>" : "Updates come from the app's GitHub releases and are signed, so only updates made by Raider Toolkit install.",
        (up ? '<button type="button" class="btn sm go" data-act="install">Install ' + esc(up.version) + "</button>" : "") + '<button type="button" class="btn sm" data-act="check">Check now</button>');
      if (state.upd) h += '<p class="note" role="status">' + esc(state.upd) + "</p>";
      h += srow("Check automatically", "When the app starts and every 6 hours. Your list and settings are kept.", sw("autoUpdate", s.autoUpdate, "Check automatically"));
    }
    h += '<div class="h">Help</div>' + srow("Report a problem", "Something wrong with the app, the overlay or the data? It goes to a private channel on our Discord.", '<button type="button" class="btn sm" data-act="report">Report a problem</button>');
    h += '<div class="h">Data</div>' + srow("Game data", D ? "From raidkits.com · patch " + esc(D.patch) + " · updated " + esc(D.built) : "Not loaded yet.", '<button type="button" class="btn sm" data-act="refresh">Update now</button>');
    return h;
  }
  function setAbout() {
    var h = '<div class="h">About</div><p class="note">Raider Toolkit Companion is an unofficial fan app, not affiliated with or endorsed by Embark Studios. ARC Raiders and its names and art belong to Embark Studios AB.</p>' +
      '<p class="note">It is an ordinary window. It never reads, changes or connects to the game: no game files, memory, screen capture, injected code or simulated input. To show the overlay only while you play, it asks Windows for the title of the window in front, the same thing the taskbar shows. Everything else comes from raidkits.com and what you type in. Embark decides which programs are allowed with their game, so use it at your own risk.</p>';
    h += '<div class="h">Legal</div><div class="res">' + LEGAL.map(function (x) { return '<button type="button" data-doc="' + x[0] + '"><span>' + esc(x[1]) + '</span><span class="kind">' + esc(x[0]) + "</span></button>"; }).join("") + "</div>";
    var acc = RT.acceptedAt(); if (acc) h += '<p class="note">You accepted these on ' + esc(new Date(acc).toLocaleDateString()) + ". The same files are in the app's install folder, under legal.</p>";
    h += '<p class="note"><button type="button" class="link" data-url="' + RT.SITE + '">raidkits.com</button> · <button type="button" class="link" data-url="https://discord.gg/NE3ughZTxn">Discord</button></p>';
    h += '<div class="h">Reset and uninstall</div>' + srow("Reset everything", "Clears your list, followed quests and keys, route, layout and settings on this PC.", '<button type="button" class="btn sm" data-act="reset">' + (state.resetAsk ? "Sure? Press again" : "Reset") + "</button>");
    h += '<p class="note">To remove the app: Windows Settings → Apps → Installed apps → Raider Toolkit Companion → Uninstall. Tick "Delete the application data" there to remove your saved data too.</p>';
    return h;
  }

  /* ---------- a required update: nothing else works until it is installed ---------- */
  function requiredView(req) {
    return '<div class="gate"><h1>Update required</h1>' +
      '<p class="note">Version <b>' + esc(req.version) + "</b> of Raider Toolkit Companion is needed to keep using it. You have version " + esc(req.have || state.version) + (state.store ? ". Update it in the Microsoft Store (Library → Get updates); your list and settings are kept.</p>" : ". It installs in a few seconds and the app restarts by itself; your list and settings are kept.</p>") +
      (req.notes ? '<pre class="doc">' + esc(req.notes) + "</pre>" : "") +
      '<div class="acts">' + (state.store ? '<button type="button" class="btn go" data-act="store">Open the Microsoft Store</button>' : '<button type="button" class="btn go" data-act="install">Install ' + esc(req.version) + ' and restart</button>') + '<button type="button" class="btn" data-act="decline">Quit</button></div>' +
      (state.upd ? '<p class="note" role="status">' + esc(state.upd) + "</p>" : "") + "</div>";
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

  /* shown once after the agreement (and once to people updating from an earlier version) unless sync is already on */
  function connectView() {
    var sent = state.linkSent;
    return '<div class="gate cn"><span class="tagk">One step, or skip it</span><h1>Connect to raidkits.com</h1>' +
      '<p class="lead2">The shopping list you build on the site becomes the list you see in the game, and routes you send from the site arrive here by themselves.</p>' +
      (sent ? '<div class="pnl wait"><b>Your browser opened raidkits.com.</b><span>Press <b>Connect</b> there, then come back here.</span></div><div class="acts"><button type="button" class="btn go" data-act="cn-done">Done</button><button type="button" class="btn" data-act="cn-link">Open it again</button></div>'
        : '<ol class="cnsteps"><li><span>Press <b>Connect</b>. Your browser opens raidkits.com.</span></li><li><span>Press <b>Connect</b> there. That is all.</span></li></ol>' +
          '<div class="acts"><button type="button" class="btn go" data-act="cn-link">Connect</button><button type="button" class="btn" data-act="cn-done">Skip for now</button></div>') +
      (state.linkErr ? '<p class="err" role="alert">' + esc(state.linkErr) + "</p>" : "") +
      '<p class="note">Nothing is sent until you press Connect. No account, name or e-mail: the two are tied together by a random code that stays on your devices. You can connect, or stop, any time in Settings → Sync, or paste lists and routes by hand instead.</p></div>';
  }

  RT.invoke("store_build").then(function (v) { state.store = !!v; if (v) render(); }, function () {});

  /* ---------- report a problem: goes to the same private Discord channel as the site's form ---------- */
  var RP_URL = "https://raidkits-sync.hnhdyfy7tb.workers.dev/report", rpLast = 0, rpFrom = null;
  var RP_TOPICS = ["The overlay", "The in-game bar", "Route", "Shopping list", "Map", "Quests or keys", "Updates or installing", "Something else"];
  function rpOpen() {
    var ov = $("rpov"), pick = { list: "Shopping list", map: "Map", quests: "Quests or keys", keys: "Quests or keys", overlay: "The overlay", settings: "Updates or installing" }[tab] || "Something else";
    $("rpTopic").innerHTML = RP_TOPICS.map(function (x) { return "<option" + (x === pick ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("");
    $("rpStat").textContent = ""; $("rpStat").className = "rpstat"; $("rpSend").disabled = false;
    rpFrom = document.activeElement; ov.hidden = false; setTimeout(function () { $("rpMsg").focus(); }, 30);
  }
  function rpClose() { $("rpov").hidden = true; if (rpFrom && rpFrom.focus) rpFrom.focus(); }
  $("rpov").addEventListener("click", function (e) { if (e.target.id === "rpov" || e.target.closest("[data-rpclose]")) rpClose(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("rpov").hidden) { e.stopPropagation(); rpClose(); } }, true);
  $("rpMsg").addEventListener("input", function () { $("rpCount").textContent = this.value.length + " / 1500"; });
  $("rpform").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $("rpMsg").value.trim(), st = $("rpStat");
    if (msg.length < 5) { st.textContent = "Please write a little more about what is wrong."; st.className = "rpstat bad"; $("rpMsg").focus(); return; }
    if (Date.now() - rpLast < 20000) { st.textContent = "Give it a few seconds before sending another one."; st.className = "rpstat bad"; return; }
    var body = { topic: "App: " + $("rpTopic").value, msg: msg, who: $("rpWho").value.trim(), website: "", view: "app " + tab, lang: "en", page: "Companion app " + (state.version || "") + (RT.settings().overlay ? " · overlay on" : " · overlay off") };
    $("rpSend").disabled = true; st.textContent = "Sending…"; st.className = "rpstat";
    fetch(RP_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) throw new Error(x.j && x.j.error || "");
        rpLast = Date.now(); $("rpMsg").value = ""; $("rpCount").textContent = "0 / 1500";
        st.textContent = "Thanks! Your report is on its way."; st.className = "rpstat ok";
        setTimeout(function () { if (!$("rpov").hidden) rpClose(); }, 1600);
      })
      .catch(function (er) {
        var net = !er || er.name === "TypeError" || /fetch|network|load failed/i.test(er.message || "");
        st.textContent = net ? "Couldn't reach the report service. Check your connection, or post it in our Discord." : (er.message || "The report could not be sent. Try again later.");
        st.className = "rpstat bad"; $("rpSend").disabled = false;
      });
  });

  /* ---------- drawing ---------- */
  function navHtml() { return TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + "</button>"; }).join(""); }
  /* the bottom of the sidebar: whether the overlay is on, and the two keybinds worth remembering */
  function foot() {
    var html = '<button type="button" data-act="report">Report a problem</button><button type="button" data-url="' + RT.SITE + '">raidkits.com</button><button type="button" data-url="https://discord.gg/NE3ughZTxn">Discord</button>' + (state.version ? '<span class="ver">v' + esc(state.version) + "</span>" : "");
    if ($("sfoot").__h !== html) { $("sfoot").__h = html; $("sfoot").innerHTML = html; }
  }
  function updPill() { var up = JSON.parse(localStorage.getItem("rtc-update") || "null"), b = $("upd"); b.hidden = !up; if (up) b.textContent = "Update " + up.version + " ›"; }
  function render(keepFocus) {
    var f = keepFocus && document.activeElement && document.activeElement.id, pos = f && document.activeElement.selectionStart, top = view.scrollTop, ok = RT.accepted();
    document.body.classList.toggle("gate", !ok);
    document.documentElement.style.setProperty("--pbg", RT.settings().panelBg);
    var req = JSON.parse(localStorage.getItem("rtc-required") || "null");
    view.classList.toggle("full", ok && !req && tab === "map");
    if (req) { document.body.classList.add("gate"); view.innerHTML = requiredView(req); return; }
    if (!ok) { view.innerHTML = agreementView(); return; }
    if (!localStorage.getItem("rtc-connect-seen") && window.RTSync && !RTSync.state() || state.linkSent) { document.body.classList.add("gate"); view.innerHTML = connectView(); return; }
    $("nav").innerHTML = navHtml(); banner(); updPill(); foot();
    if (!RT.data()) { view.innerHTML = state.loadErr ? '<p class="err" style="margin-top:14px">Couldn\'t load the game data from raidkits.com. Check your internet connection.</p><button type="button" class="btn" data-act="retry">Try again</button>' : '<p class="note" style="margin-top:14px">Loading data from raidkits.com…</p>'; return; }
    if (tab === "map") { var mk = (state.mapN || 0) + "|" + (state.mapSrc || ""); if (!view.querySelector("iframe") || view.dataset.src !== mk) { view.innerHTML = mapView(); view.dataset.src = mk; } return; }   // don't reload the map on every redraw
    view.dataset.src = "";
    var news = RT.privacyNews() ? '<div class="box" role="status" style="flex-direction:row;align-items:center;flex-wrap:wrap"><span class="note" style="flex:1;min-width:200px">The privacy policy has been updated. Nothing changes in what you need to do.</span><button type="button" class="btn sm" data-doc="PRIVACY.txt">Read it</button><button type="button" class="btn sm" data-act="privacy-ok">OK</button></div>' : "";
    view.innerHTML = news + (tab === "list" ? listView() : tab === "quests" ? questsView() : tab === "keys" ? keysView() : tab === "conds" ? condsView() : tab === "search" ? searchView() : tab === "overlay" ? overlayView() : tab === "home" ? homeView() : settingsView());
    if (tab === "list") addResults();
    if (tab === "quests") questResults();
    if (tab === "search" && !state.sel) searchResults();
    view.scrollTop = top;
    if (f && $(f)) { $(f).focus(); try { $(f).setSelectionRange(pos, pos); } catch (e) {} }
  }

  function checkNow() {
    if (state.store) { state.upd = "This copy is from the Microsoft Store, which installs updates for you."; render(); return; }
    state.upd = "Checking…"; render();
    RT.invoke("check_update").then(function (u) {
      if (u) { localStorage.setItem("rtc-update", JSON.stringify({ version: u.version, notes: u.notes || "", at: Date.now() })); state.upd = "Version " + u.version + " is out."; }
      else { localStorage.removeItem("rtc-update"); state.upd = "You have the latest version."; }
      render();
    }, function (er) {
      // GitHub answers "not found" while no version has been published yet (drafts don't count): nothing newer exists
      if (/valid release JSON|404/i.test(String(er))) { localStorage.removeItem("rtc-update"); state.upd = "You have the latest version."; }
      else state.upd = "Couldn't reach GitHub to check for updates. Check your internet connection and try again.";
      render();
    });
  }

  /* ---------- events ---------- */
  $("nav").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (!b) return;
    tab = b.dataset.tab; state.capture = ""; state.doc = null; state.resetAsk = false; if (tab === "map") state.mapSrc = ""; if (tab === "overlay") focusNow(); view.scrollTop = 0; render();
    var fi = { search: "q", quests: "qq", keys: "kq" }[tab]; if (fi && $(fi) && !state.sel) $(fi).focus();
  });
  $("sfoot").addEventListener("click", function (e) { var b = e.target.closest("[data-act]"); if (b && b.dataset.act === "report") { rpOpen(); return; } var u = e.target.closest("[data-url]"); if (u) { RT.openUrl(u.dataset.url); return; } if (b && b.dataset.act === "ov-toggle") { RT.setSetting("overlay", !RT.settings().overlay); render(); } });
  $("upd").addEventListener("click", function () { tab = "settings"; state.sset = "updates"; render(); var u = view.querySelector('[data-act="install"]'); if (u) { u.scrollIntoView({ block: "center" }); u.focus(); } });

  view.addEventListener("toggle", function (e) { if (e.target.closest && e.target.closest("#homeimp")) state.homeHelp = e.target.open; }, true);
  view.addEventListener("click", function (e) {
    var t = e.target.closest("button"); if (!t) return;
    var d = t.dataset;
    if (d.maptab) { state.mapTab = d.maptab; state.routeErr = ""; render(); return; }
    if (d.goto) { var g = d.goto.split(":"); tab = g[0]; if (g[1]) state.sset = g[1]; view.scrollTop = 0; render(); return; }
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
    if (d.hubsize) { var hs = RT.settings().hub; hs.size = +d.hubsize; RT.setSetting("hub", hs); render(); return; }
    if (d.spot) { var sp = SPOT_POS[d.spot]; RT.setSetting("pos", { a: d.spot, x: sp.x, y: sp.y }); render(); return; }
    if (d.sset) { state.sset = d.sset; state.capture = ""; state.resetAsk = false; render(); view.scrollTop = 0; return; }
    if (d.floor) { RT.setSetting("floor", d.floor); render(); return; }
    if (d.hk) { state.capture = d.hk; state.hkErr = ""; render(); return; }
    if (d.hkoff) { setHotkey(d.hkoff, ""); return; }
    if (d.doc) { if (RT.accepted() && tab !== "settings") { tab = "settings"; } if (d.doc === "PRIVACY.txt") RT.privacySeen(); state.doc = d.doc; render(); view.scrollTop = 0; fetch("legal/" + d.doc).then(function (r) { return r.text(); }).then(function (tx) { var el = $("doc"); if (el) el.textContent = tx; }, function () { var el = $("doc"); if (el) el.textContent = "Couldn't open this file. It is also in the app's install folder, under legal."; }); return; }
    switch (d.act) {
      case "doc-back": state.doc = null; render(); break;
      case "privacy-ok": RT.privacySeen(); render(); break;
      case "accept": if (state.agree) { RT.accept(); state.doc = null; tab = "home"; render(); } break;
      case "decline": RT.invoke("quit_app"); break;
      case "cn-done": localStorage.setItem("rtc-connect-seen", "1"); state.linkSent = false; state.linkErr = ""; tab = "home"; render(); break;
      case "cn-link": t.disabled = true; state.linkErr = ""; RTSync.link().then(function () { localStorage.setItem("rtc-connect-seen", "1"); state.linkSent = true; render(); }, function (er) { state.linkErr = er.message || String(er); render(); }); break;
      case "link": t.disabled = true; RTSync.link().then(function () { state.homeOk = true; state.homeMsg = state.syncMsg = "Your browser opened raidkits.com. Press Connect there."; state.syncMsgOk = true; render(); }, function (er) { state.homeOk = state.syncMsgOk = false; state.homeMsg = state.syncMsg = er.message || String(er); render(); }); break;
      case "sync-new-home": t.disabled = true; RTSync.create().then(function () { state.syncShow = true; tab = "settings"; state.sset = "sync"; state.syncMsgOk = true; state.syncMsg = "Sync is on. Now paste the code on raidkits.com: Shopping list → Sync."; render(); }, function (er) { state.homeOk = false; state.homeMsg = er.message; render(); }); break;
      case "home-go":
        var txt = ($("himp").value || "").trim(), done = function (ok, msg) { state.homeOk = ok; state.homeMsg = msg; render(); };
        if (!txt) { done(false, "Paste a sync code or a link from raidkits.com first."); break; }
        if (/app-route=/.test(txt)) { try { var hr = RT.importRoute(txt); if (hr) { RT.setSetting("mapView", "route"); RT.setSetting("lastView", "route"); done(true, "Route added: " + hr.stops.length + " stops. Open the bar to see it on the map."); } else done(false, "That Send to app link didn't have a route in it."); } catch (er3) { done(false, er3.message); } break; }
        if (window.RTSync && RTSync._clean(txt)) { t.disabled = true; RTSync.connect(txt).then(function () { done(true, "Connected. Your list now follows raidkits.com, and routes you send from there arrive by themselves."); }, function (er4) { done(false, er4.message); }); break; }
        t.disabled = true; RT.importShare(txt, false).then(function () { done(true, "List added. It's under Shopping list."); }, function () { done(false, "That isn't a sync code or a link from raidkits.com. The three kinds are listed below."); });
        break;
      case "import": state.importOpen = !state.importOpen; state.importErr = ""; render(); if ($("imp")) $("imp").focus(); break;
      case "imp-add": case "imp-rep":
        if (/app-route=/.test($("imp").value)) { try { var r0 = RT.importRoute($("imp").value); state.importOpen = false; state.importErr = ""; state.routeOk = "Route added: " + r0.stops.length + " stops. It's on the overlay's map; press Show route there."; } catch (er) { state.importErr = er.message; } render(); break; }
        RT.importShare($("imp").value, d.act === "imp-rep").then(function () { state.importOpen = false; state.importErr = ""; render(); }, function (er) { state.importErr = er.message; render(); });
        break;
      case "clear": RT.saveList({ v: 1, items: {}, order: [], from: "" }); render(); break;
      case "back": state.sel = null; render(); if ($("q")) $("q").focus(); break;
      case "hk-cancel": state.capture = ""; render(); break;
      case "map-reload": view.innerHTML = mapView(); break;
      case "refresh": t.disabled = true; t.textContent = "Updating…"; RT.load(true).then(function () { render(); }, function () { t.textContent = "Couldn't reach raidkits.com"; }); break;
      case "check": checkNow(); break;
      case "report": rpOpen(); break;
      case "store": RT.openUrl("ms-windows-store://pdp/?productid=9NVWVPNN94NF"); break;
      case "install": t.disabled = true; t.textContent = "Downloading…"; state.upd = "Downloading and checking the update. The app restarts by itself when it's done.";
        RT.invoke("install_update").catch(function (er) { state.upd = "The update couldn't be installed (" + er + "). Try again later, or download it from raidkits.com."; render(); });
        break;
      case "sync-new": case "sync-join":
        t.disabled = true; state.syncMsg = "";
        (d.act === "sync-new" ? RTSync.create() : RTSync.connect($("scode").value)).then(function () {
          var on = RTSync.state(); state.syncMsgOk = true; state.syncMsg = on && !on.err ? (d.act === "sync-new" ? "Sync is on. Now paste the code on raidkits.com: shopping list → Sync." : "Connected. Your list now comes from the synced copy.") : ""; state.syncShow = d.act === "sync-new"; render();
        }, function (er) { state.syncMsgOk = false; state.syncMsg = er.message; render(); });
        break;
      case "sync-show": state.syncShow = !state.syncShow; render(); break;
      case "sync-copy": var sc = RTSync.state(); if (sc) { var txt = RTSync.pretty(sc.code); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { state.syncMsgOk = true; state.syncMsg = "Code copied."; render(); }, function () { state.syncShow = true; state.syncMsgOk = true; state.syncMsg = "Select the code and copy it with Ctrl+C."; render(); }); } break;
      case "sync-now": state.syncMsg = ""; RTSync.run(true).then(function () { render(); }); break;
      case "sync-off": RTSync.off(); state.syncMsgOk = true; state.syncMsg = "Sync is off on this PC."; state.syncShow = false; render(); break;
      case "sync-wipe": if (!state.syncWipe) { state.syncWipe = true; render(); break; } state.syncWipe = false;
        RTSync.wipe().then(function () { state.syncMsgOk = true; state.syncMsg = "The synced copy is deleted and sync is off."; render(); }, function (er) { state.syncMsgOk = false; state.syncMsg = er.message; render(); });
        break;
      case "intro-done": localStorage.setItem("rtc-intro-done", "1"); render(); break;
      case "retry": state.loadErr = false; render(); RT.load(true).then(function () { render(); }, function () { state.loadErr = true; render(); }); break;
      case "edit": state.edit = !state.edit; RT.invoke("set_edit", { on: state.edit }); render(); break;
      case "menu": RT.invoke("toggle_menu", { open: true }); break;
      case "route-imp2":
        try { var r2 = RT.importRoute($("rimp2").value); state.routeErr = r2 ? "" : "That isn't a Send to app link. On raidkits.com, plan a route and press Send to app."; if (r2) { RT.setSetting("mapView", "route"); RT.setSetting("lastView", "route"); } } catch (er2) { state.routeErr = er2.message; }
        render(); break;
      case "route-clear": RT.setRoute(null); if (RT.settings().mapView === "route") RT.setSetting("mapView", "map"); render(); break;
      case "route-restart": RT.setRouteAt(0); render(); break;
      case "route-imp":
        try { var ro = RT.importRoute($("rimp").value); state.routeErr = ro ? "" : "That isn't a Send to app link from the route planner."; state.routeOk = ro ? "Route added: " + ro.stops.length + " stops." : ""; } catch (er) { state.routeErr = er.message; state.routeOk = ""; }
        render(); break;
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
    if (t.dataset.set === "onlyMap" || t.dataset.set === "autoUpdate" || t.dataset.set === "gameOnly") RT.setSetting(t.dataset.set, t.checked);
    if (t.dataset.set && t.dataset.set.indexOf("layer:") === 0) { var sl = RT.settings(); sl.layers[t.dataset.set.slice(6)] = t.checked; RT.setSetting("layers", sl.layers); }
    if (t.id === "smap") { RT.setSetting("map", t.value); render(); }
    if ((t.dataset.set || "").indexOf("pin:") === 0) { var hp = RT.settings().hub, pk = t.dataset.set.slice(4); if (!hp.pin) hp.pin = { map: false, route: true, list: true, quests: false, cond: false }; hp.pin[pk] = t.checked; if (t.checked) hp.open[pk] = true; RT.setSetting("hub", hp); return; }
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
  function setHotkey(id, accel) {
    var s = RT.settings(), before = RT.binds(s), next = JSON.parse(JSON.stringify(s));
    if (id.indexOf("k:") === 0) next.keys[id.slice(2)] = accel; else next[id] = accel;
    var all = RT.binds(next), mine = id.indexOf("k:") === 0 ? id.slice(2) : id === "hotkey" ? "panel" : "overlay";
    var clash = accel && Object.keys(all).filter(function (k) { return k !== mine && all[k] && all[k].toLowerCase() === accel.toLowerCase(); })[0];
    if (clash) { state.hkErr = accel + " (it is already another keybind)"; state.capture = ""; render(); return; }
    RT.invoke("set_hotkeys", { binds: all }).then(function (failed) {
      failed = failed || [];
      if (accel && failed.indexOf(accel) > -1) { state.hkErr = accel; RT.invoke("set_hotkeys", { binds: before }); }
      else { if (id.indexOf("k:") === 0) RT.setSetting("keys", next.keys); else RT.setSetting(id, accel); state.hkErr = ""; localStorage.removeItem("rtc-hotkey-err"); }
      state.capture = ""; render();
    });
  }
  /* whether the game is in front right now, for the "Only while you play" row */
  function focusNow() { RT.invoke("focus_state").then(function (f) { if (f) { state.focus = f; if (tab === "overlay") render(); } }, function () {}); }
  if (window.__TAURI__) window.__TAURI__.event.listen("focus", function (e) { state.focus = e.payload; if (tab === "overlay" && !(document.activeElement && document.activeElement.type === "range")) render(); });
  if (window.__TAURI__) window.__TAURI__.event.listen("edit-off", function () { if (state.edit) { state.edit = false; render(); } });
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
    if (!document.activeElement || !/^(q|qq|kq|addq|imp|rimp|rimp2|scode|himp)$/.test(document.activeElement.id)) render(); else { banner(); updPill(); }
  });
  if (window.__TAURI__) window.__TAURI__.event.listen("check-updates", function () { if (!RT.accepted() || localStorage.getItem("rtc-required")) return; tab = "settings"; state.sset = "updates"; state.doc = null; checkNow(); setTimeout(function () { var u = view.querySelector('[data-act="check"]'); if (u) u.scrollIntoView({ block: "center" }); }, 50); });
  if (window.__TAURI__) window.__TAURI__.app.getVersion().then(function (v) { state.version = v; foot(); if (tab === "settings") render(); });
  render();
  setInterval(function () { if (!RT.accepted()) return; if (tab === "conds") render(true); else banner(); }, 1000);
  RT.load().then(function () { render(); }, function () { state.loadErr = true; render(); });
})();
