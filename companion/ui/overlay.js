/* The overlay: a small panel over the game with adjustable opacity. Clicks always go through it, except while the
   panel is open: then it can be moved, and each part can be unpinned into its own small window (moved and resized
   on its own; a bigger list window shows more items) or pinned back.
   Every place is stored relative to a corner or edge of the screen (as a share of the screen), and every size in em,
   so the layout stays the same at any resolution or aspect ratio.
   The same page runs the main overlay (no ?w=) and each unpinned part (?w=items, ?w=quests, …). */
(function () {
  "use strict";
  var T = window.__TAURI__, W = RT.win(), esc = RT.esc;
  var WID = (location.search.match(/[?&]w=([a-z]+)/) || [])[1] || "";
  var hud = document.getElementById("hud"), FONT = 15;
  var edit = false, shown = null, lastSize = "", screenKey = "", placingUntil = 0, started = false;
  var DEF_SIZE = { map: { w: 21, h: 26 }, cond: { w: 18, h: 3.4 }, prog: { w: 16, h: 4.2 }, items: { w: 18, h: 16 }, quests: { w: 21, h: 14 }, keys: { w: 21, h: 12 }, maps: { w: 19, h: 9 } };
  if (WID) document.documentElement.classList.add("w");

  function auto() { return Math.max(0.85, Math.min(2, (screen.height || 1080) / 1080)); }   // 1080p = 1, 1440p ≈ 1.33, 4K at 100% = 2
  function scale() { return RT.settings().size * auto(); }
  function apply() {
    var s = RT.settings();
    document.documentElement.style.setProperty("--scale", scale().toFixed(3));
    document.documentElement.style.setProperty("--bga", s.bg);
    hud.className = !WID && s.style === "line" ? "line" : "";
    document.body.classList.toggle("edit", edit);
  }
  var shortOf = function (k) { return (RT.SHORT[k] || "").replace("Stella Montis", "Stella").replace("Pendola Pass", "Pendola").replace("Riven Tides", "Riven").replace("Buried City", "Buried"); };

  /* ---------- the parts: each one is its own card ---------- */
  var IC = {
    big: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
  };
  function kb(s, k) { return esc((s.keys || {})[k] || ""); }
  function header(s, c, now, buttons) {
    var on = !!(c && c.cur);
    return '<div class="mh"><span class="dot' + (on ? " on" : "") + '"></span><span class="nm">' + esc(RT.mapName(s.map)) + "</span>" +
      '<span class="chip' + (on ? "" : " off") + '">' + esc(c ? c.cur || "Quiet" : RT.data() ? "No data" : "Loading…") + "</span>" +
      '<span class="sp"></span>' + (buttons || (on ? '<span class="t">' + RT.clock(c.ends - now) + "</span>" : "")) + "</div>";
  }
  function nextLine(c, now) {
    if (!c) return "";
    if (c.cur) return '<div class="nx"><span>' + esc(c.cur) + ' ends in</span><span class="mono">' + RT.clock(c.ends - now) + "</span></div>";
    return c.next ? '<div class="nx"><span>Next · ' + esc(c.next) + '</span><span class="mono">' + RT.clock(c.at - now) + "</span></div>" : "";
  }
  /* the map widget: the map with your pins, the route you sent from the site, or just its header */
  var mapInfo = { counts: null };
  function mapPart(s, c, now) {
    var rt = RTMap.route(), at = RT.routeAt(), view = s.mapView === "route" && !rt ? "map" : s.mapView;
    var btns = '<button type="button" class="ib act" data-act="bigmap" title="Big map (' + kb(s, "bigmap") + ')" aria-label="Open the big map">' + IC.big + "</button>" +
      '<button type="button" class="ib act" data-act="mapsize" title="' + (view === "min" ? "Expand" : "Minimize") + " (" + kb(s, "mapsize") + ')" aria-label="' + (view === "min" ? "Expand the map" : "Minimize the map") + '">' + (view === "min" ? IC.down : IC.up) + "</button>";
    var h = header(s, c, now, btns), stop = rt && rt.stops[at];
    if (view === "min") {
      h += '<div class="bd" style="padding-top:0">' + (rt && s.lastView === "route" ? '<div class="nx"><span>' + (stop ? "Stop " + (at + 1) + " of " + rt.stops.length + " · " + esc(stop.w || "") : "Extract · " + esc((rt.end && rt.end.n) || "")) + "</span></div>" : nextLine(c, now)) + "</div>";
      return { cls: "map min", html: h };
    }
    h += '<div class="mapbox" data-mapbox="' + view + '"></div><div class="bd">';
    if (view === "route") {
      var n = rt.stops.length;
      h += '<div class="ttl hi">' + (stop ? "Next stop · " + (at + 1) + " of " + n : "Last stop: extract") + "</div>" +
        '<div class="head">' + esc(stop ? stop.w || "Stop " + (at + 1) : (rt.end && rt.end.n) || "Extract") + "</div>" +
        (stop && stop.ids && stop.ids.length ? '<div class="sub">' + esc(stop.ids.map(function (id) { return (RT.item(id) || {}).n || id; }).join(", ")) + "</div>" : "");
      var rows = rt.stops.slice(at + 1, at + 4).map(function (x, i) {
        return '<div class="r"><span class="n">' + (at + 2 + i) + '</span><span class="nm">' + esc(x.w || "") + '</span><span class="m">' + esc((x.ids || []).slice(0, 2).map(function (id) { return (RT.item(id) || {}).n || ""; }).join(", ")) + "</span></div>";
      });
      if (stop && rt.end) rows.push('<div class="r e"><span class="n">E</span><span class="nm">' + esc(rt.end.n || "Extract") + "</span><span></span></div>");
      if (rows.length) h += '<div class="rows">' + rows.join("") + "</div>";
      h += '<div class="btns"><button type="button" class="b go act" data-act="next">' + (stop ? "Stop done" : "Done") + '</button><button type="button" class="b act" data-act="prev">Back</button><button type="button" class="b act" data-act="route">Hide route</button></div>' +
        '<div class="kbh">' + kb(s, "next") + " stop done · " + kb(s, "prev") + " back · " + kb(s, "route") + " hide route</div>";
    } else {
      var k = mapInfo.counts;
      h += '<div class="lg">' + (k ? (s.layers.list ? '<span><i class="l"></i>List · ' + k.list + "</span>" : "") + (s.layers.keys && k.keys ? '<span><i class="k"></i>Key · ' + k.keys + "</span>" : "") +
        (s.layers.quests && k.quests ? '<span><i class="qq"></i>Quest · ' + k.quests + "</span>" : "") + (s.layers.ext ? '<span><i class="e"></i>Extract</span>' : "") : "<span>Loading the map…</span>") + "</div>" + nextLine(c, now);
      h += rt ? '<div class="btns"><button type="button" class="b go act" data-act="route">Show route</button></div><div class="kbh">' + kb(s, "route") + " show route · " + kb(s, "bigmap") + " big map</div>"
        : '<div class="more">Plan a route on raidkits.com and press Send to app to see it here.</div><div class="kbh">' + kb(s, "bigmap") + " big map</div>";
    }
    return { cls: "map" + (view === "route" ? " route" : ""), html: h + "</div>" };
  }
  function parts(s, now, maxItems) {
    var P = {}, c = RT.data() ? RT.condition(s.map, s.region, now) : null;
    P.map = mapPart(s, c, now);
    P.cond = { html: header(s, c, now) + (c && !c.cur && c.next ? '<div class="bd" style="padding-top:0">' + nextLine(c, now) + "</div>" : "") };
    var l = RT.list(), p = RT.progress();
    if (p.total) P.prog = { html: '<div class="bd"><div class="ttl"><span>List</span><span>' + p.done + " / " + p.total + ' done</span></div><div class="bar"><i style="width:' + Math.round(p.done / p.total * 100) + '%"></i></div></div>' };
    if (p.total && RT.data()) {
      var left = l.order.filter(function (id) { var x = l.items[id]; return x && x.have < x.need && RT.item(id); });
      var here = s.onlyMap ? left.filter(function (id) { return RT.onMap(id, s.map); }) : left, elsewhere = left.length - here.length;
      var rows = here.slice(0, maxItems).map(function (id) {
        var it = RT.item(id), x = l.items[id];
        return '<div class="r">' + (it.ic ? '<img alt="" src="' + RT.SITE + "i/" + encodeURIComponent(id) + '.webp">' : '<span class="ph"></span>') + '<span class="nm">' + esc(it.n) + '</span><span class="q">' + x.have + "<i>/" + x.need + "</i></span></div>";
      });
      var extra = here.length - rows.length;
      P.items = { html: '<div class="bd"><div class="ttl"><span>' + (s.onlyMap ? "Needed on " + esc(shortOf(s.map)) : "Still needed") + "</span><span>" + here.length + "</span></div>" +
        (rows.length ? '<div class="rows">' + rows.join("") + "</div>" : '<div class="more">Nothing left to find here.</div>') +
        (extra > 0 ? '<div class="more">+' + extra + " more</div>" : "") + (s.onlyMap && elsewhere ? '<div class="more">' + elsewhere + " on other maps</div>" : "") + "</div>" };
    }
    var f = RT.follow(), qs = Object.keys(f.quests).map(RT.quest).filter(Boolean);
    if (qs.length) P.quests = { html: '<div class="bd"><div class="ttl"><span>Quests</span><span>' + qs.length + '</span></div><div class="rows">' + qs.map(function (q) {
      var done = f.quests[q.id].done || [], open = (q.o || []).map(function (o, i) { return [o, i]; }).filter(function (x) { return done.indexOf(x[1]) < 0; });
      return '<div class="r solo"><span class="nm"><b>' + esc(q.n) + '</b></span><span class="q">' + ((q.o || []).length - open.length) + "<i>/" + (q.o || []).length + "</i></span></div>" +
        (open.length ? open.slice(0, 3).map(function (x) { return '<div class="r qo"><span class="nm">› ' + esc(x[0]) + "</span></div>"; }).join("") : '<div class="r qo"><span class="nm">All objectives done: hand it in</span></div>');
    }).join("") + "</div></div>" };
    var ks = f.keys.map(RT.key).filter(Boolean);
    if (ks.length) P.keys = { html: '<div class="bd"><div class="ttl"><span>Keys</span><span>' + ks.length + '</span></div><div class="rows">' + ks.map(function (k) {
      return '<div class="r solo"><span class="nm"><b>' + esc(k.n) + '</b></span><span class="m">' + esc(shortOf(k.mk)) + '</span></div><div class="r door">' + esc(k.door) + "</div>";
    }).join("") + "</div></div>" };
    if (RT.data()) {
      var on = RT.MAP_ORDER.filter(function (k) { return k !== s.map; }).map(function (k) { return { k: k, c: RT.condition(k, s.region, now) }; }).filter(function (x) { return x.c && x.c.cur; });
      if (on.length) P.maps = { html: '<div class="bd"><div class="ttl"><span>Other maps now</span></div><div class="rows">' + on.map(function (x) { return '<div class="r"><span class="dot on"></span><span class="nm">' + esc(shortOf(x.k)) + " · " + esc(x.c.cur) + '</span><span class="q">' + RT.clock(x.c.ends - now) + "</span></div>"; }).join("") + "</div></div>" };
    }
    return P;
  }
  var EMPTY = { prog: "Your list is empty.", items: "Your list is empty.", quests: "Follow a quest in the panel to see it here.", keys: "Follow a key in the panel to see it here.", maps: "No other map has a condition right now." };

  /* only the cards that changed are redrawn, so the map is not repainted every second */
  function card(k, P, pinBtn) {
    var html = P.html + pinBtn, el = hud.querySelector('.part[data-k="' + k + '"]');
    if (!el) { el = document.createElement("div"); el.dataset.k = k; }
    var cls = "part " + (P.cls || k);
    if (el.className !== cls) el.className = cls;
    if (el.__h !== html) { el.__h = html; el.innerHTML = html; el.__sig = ""; }
    return el;
  }
  function render() {
    var s = RT.settings(), now = Date.now(), els = [];
    if (WID) {
      var P = parts(s, now, 200), one = P[WID] || { html: '<div class="bd"><div class="ttl">' + esc(RT.SECTIONS[WID] || "") + '</div><div class="more">' + esc(EMPTY[WID] || "") + "</div></div>" };
      els.push(card(WID, one, '<button type="button" class="pin" data-pin title="Pin back into the overlay" aria-label="Pin back into the overlay">⇲</button>'));
    } else {
      var P2 = parts(s, now, s.listMax);
      s.order.filter(function (k) { return s.parts[k] && RT.widget(k).pinned && P2[k]; }).forEach(function (k) {
        els.push(card(k, P2[k], '<button type="button" class="pin" data-unpin="' + k + '" title="Unpin: move and resize it on its own" aria-label="Unpin ' + esc(RT.SECTIONS[k]) + '">⇱</button>'));
      });
    }
    var hint = hud.querySelector(".hint");
    if (edit && !hint) { hint = document.createElement("div"); hint.className = "hint"; }
    if (edit) { hint.textContent = WID ? "Drag to move, drag the corner to resize." : "Drag to move. ⇱ unpins a part so you can move and resize it on its own."; els.push(hint); }
    Array.prototype.slice.call(hud.children).forEach(function (c) { if (els.indexOf(c) < 0) c.remove(); });
    els.forEach(function (e, i) { if (hud.children[i] !== e) hud.insertBefore(e, hud.children[i] || null); });
    if (WID) clip();
    paintMap();
    fit();
  }
  /* the map widget's canvas: drawn again only when something on it changed */
  var pinSig = "", pinData = null;
  function paintMap() {
    var box = hud.querySelector(".mapbox"); if (!box) return;
    var s = RT.settings(), view = box.dataset.mapbox, rt = RTMap.route(), at = RT.routeAt();
    var key = view === "route" && rt ? rt.k : RTMap.keyOf(s.map, s.floor);
    var cv = box.querySelector("canvas"); if (!cv) { cv = document.createElement("canvas"); cv.setAttribute("role", "img"); box.appendChild(cv); }
    cv.setAttribute("aria-label", view === "route" ? "Your route on " + RT.mapName(RTMap.mapOf(key)) : RT.mapName(s.map) + " with your pins");
    if (!RTMap.files(key)) { cv.remove(); if (!box.querySelector(".wait")) box.insertAdjacentHTML("beforeend", '<div class="wait">' + (RT.data() ? "No map picture for this map yet." : "Loading…") + "</div>"); return; }
    var ready = RTMap.image(key, paintMap.waiting === key ? null : function () { paintMap.waiting = ""; paintMap.again(); });
    if (!ready) paintMap.waiting = key;
    RTMap.markers(key, function (data) {
      var ps = key + "|" + localStorage.getItem("rtc-list") + "|" + localStorage.getItem("rtc-follow");
      if (ps !== pinSig) {
        pinSig = ps; pinData = RTMap.pins(key, data);
        var counts = { list: new Set([].concat.apply([], pinData.list.map(function (x) { return x.ids; }))).size, keys: pinData.keys.length, quests: new Set(pinData.quests.map(function (x) { return x.id; })).size };
        if (JSON.stringify(counts) !== JSON.stringify(mapInfo.counts)) { mapInfo.counts = counts; setTimeout(render, 0); }
      }
      var sc = scale(), sig = [key, view, at, pinSig, JSON.stringify(s.layers), cv.clientWidth, cv.clientHeight, sc, ready].join("|");
      if (cv.__sig === sig) return; cv.__sig = sig;
      RTMap.draw(cv, { key: key, pins: pinData, layers: s.layers, r: 4 * sc, cluster: 18 * sc,
        route: view === "route" ? rt : null, at: at, routeOnly: view === "route",
        fit: view === "route" ? [rt.spawn].concat(rt.stops.map(function (x) { return x.p; })).concat(rt.end ? [rt.end.p] : []) : RTMap.extent(pinData) });
    });
  }
  paintMap.again = function () { paintMap(); };

  /* the map widget's actions: from its buttons (while the panel is open) or from keybinds (in game) */
  function act(a) {
    var s = RT.settings(), rt = RT.route(), view = s.mapView;
    if (a === "bigmap") { RT.invoke("toggle_bigmap"); return; }
    if (a === "mapsize") { if (view === "min") RT.setSetting("mapView", s.lastView === "route" && rt ? "route" : "map"); else { RT.setSetting("lastView", view); RT.setSetting("mapView", "min"); } }
    if (a === "route") { if (!rt) return; RT.setSetting("mapView", view === "route" ? "map" : "route"); RT.setSetting("lastView", view === "route" ? "map" : "route"); }
    if (a === "next" || a === "prev") {
      if (!rt) return;
      RT.setRouteAt(RT.routeAt() + (a === "next" ? 1 : -1));
      if (view !== "route") { RT.setSetting("mapView", "route"); RT.setSetting("lastView", "route"); }
    }
    lastSize = ""; render();
  }
  /* an unpinned window shows as many rows as fit; the rest become "+N more" */
  function clip() {
    var box = hud.querySelector(".rows"); if (!box) return;
    var bottom = hud.getBoundingClientRect().bottom - parseFloat(getComputedStyle(hud).paddingBottom) - 4, hidden = 0;
    hud.querySelectorAll(".bd > .more, .hint").forEach(function (m) { bottom -= m.getBoundingClientRect().height; });
    bottom -= 18;   // room for the "+N more" line
    Array.prototype.forEach.call(box.children, function (r) { if (hidden || r.getBoundingClientRect().bottom > bottom) { r.style.display = "none"; hidden++; } });
    if (hidden) { var more = document.createElement("div"); more.className = "more"; more.textContent = "+" + hidden + " more (make it bigger to see them)"; box.after(more); }
  }

  /* ---------- size and place ---------- */
  function fit() {
    if (!W) return;
    var k;
    if (WID) {
      var sz = RT.widget(WID).size || DEF_SIZE[WID] || { w: 16, h: 10 }, px = FONT * scale();
      k = Math.round(sz.w * px) + "x" + Math.round(sz.h * px);
      if (k === lastSize) return; lastSize = k;
      W.setSize(new T.dpi.LogicalSize(Math.round(sz.w * px), Math.round(sz.h * px))).then(place);
      return;
    }
    var r = document.body.getBoundingClientRect(), empty = !hud.querySelector(".part");
    k = empty ? "1x1" : Math.ceil(r.width) + "x" + Math.ceil(r.height);
    if (k === lastSize) return; lastSize = k;
    W.setSize(new T.dpi.LogicalSize(empty ? 1 : Math.ceil(r.width), empty ? 1 : Math.ceil(r.height))).then(place);
  }
  function myPos() {
    if (!WID) return RT.settings().pos;
    var i = RT.DEFAULTS.order.indexOf(WID);
    return RT.widget(WID).pos || { a: "ml", x: 0.012, y: -0.25 + 0.12 * i };
  }
  function area(m) { var a = m.workArea || { position: m.position, size: m.size }; return { x: a.position.x, y: a.position.y, w: a.size.width, h: a.size.height }; }
  async function place() {
    if (!W) return;
    var m = await T.window.currentMonitor(); if (!m) return;
    var A = area(m), o = await W.outerSize(), pos = myPos(), v = pos.a[0], hz = pos.a[1], x, y;
    x = hz === "l" ? A.x + pos.x * A.w : hz === "r" ? A.x + A.w - pos.x * A.w - o.width : A.x + (A.w - o.width) / 2 + pos.x * A.w;
    y = v === "t" ? A.y + pos.y * A.h : v === "b" ? A.y + A.h - pos.y * A.h - o.height : A.y + (A.h - o.height) / 2 + pos.y * A.h;
    x = Math.round(Math.max(A.x, Math.min(A.x + A.w - o.width, x))); y = Math.round(Math.max(A.y, Math.min(A.y + A.h - o.height, y)));
    placingUntil = Date.now() + 400;
    await W.setPosition(new T.dpi.PhysicalPosition(x, y));
    if (shown === null && started) {   // show once it is in place, and only after the agreement is accepted
      shown = !!RT.settings().overlay;
      RT.invoke("show_overlay", { show: shown });   // the app shows it only while the game (or this app) is in front, if that setting is on
    }
  }
  /* after a drag: remember the spot as "nearest corner or edge + share of the screen" */
  async function saveSpot() {
    var m = await T.window.currentMonitor(); if (!m) return;
    var A = area(m), o = await W.outerSize(), p = await W.outerPosition();
    var cx = p.x - A.x + o.width / 2, cy = p.y - A.y + o.height / 2;
    var hz = cx < A.w / 3 ? "l" : cx > A.w * 2 / 3 ? "r" : "c", v = cy < A.h / 3 ? "t" : cy > A.h * 2 / 3 ? "b" : "m";
    var x = hz === "l" ? (p.x - A.x) / A.w : hz === "r" ? (A.x + A.w - p.x - o.width) / A.w : (p.x - A.x - (A.w - o.width) / 2) / A.w;
    var y = v === "t" ? (p.y - A.y) / A.h : v === "b" ? (A.y + A.h - p.y - o.height) / A.h : (p.y - A.y - (A.h - o.height) / 2) / A.h;
    var pos = { a: v + hz, x: +x.toFixed(4), y: +y.toFixed(4) };
    if (WID) RT.setWidget(WID, { pos: pos }); else RT.setSetting("pos", pos);
  }
  /* after resizing an unpinned part: remember its size in em, so it keeps its proportions on any screen */
  async function saveSize() {
    var sz = await W.innerSize(), f = await W.scaleFactor(), px = FONT * scale();
    RT.setWidget(WID, { size: { w: +(sz.width / f / px).toFixed(2), h: +(sz.height / f / px).toFixed(2) } });
    lastSize = Math.round(sz.width / f) + "x" + Math.round(sz.height / f);
    render();
  }

  function setEdit(on) {
    edit = !!on; apply();
    hud.querySelectorAll(".part").forEach(function (p) { p.__h = ""; });
    if (W) { W.setIgnoreCursorEvents(!edit); if (WID) W.setResizable(edit); }   // in overlay mode every click goes straight through to the game
    lastSize = ""; render();
  }

  /* ---------- the main overlay opens and closes the windows of unpinned parts ---------- */
  var syncing = false;
  async function sync() {
    if (WID || !T || !started || syncing) return;
    syncing = true;
    try {
      var s = RT.settings(), WW = T.webviewWindow.WebviewWindow;
      for (var i = 0; i < RT.DEFAULTS.order.length; i++) {
        var k = RT.DEFAULTS.order[i], want = s.parts[k] && !RT.widget(k).pinned, w = await WW.getByLabel("w-" + k);
        if (want && !w) new WW("w-" + k, { url: "overlay.html?w=" + k, title: "Raider Toolkit · " + RT.SECTIONS[k], width: 200, height: 120, transparent: true, decorations: false, shadow: false, alwaysOnTop: true, skipTaskbar: true, resizable: false, focus: false, visible: false });
        if (!want && w) await w.close();
      }
    } finally { syncing = false; }
  }

  /* ---------- start ---------- */
  /* a required update: when raidkits.com says this version is too old and GitHub has the newer signed release,
     the app shows only the "Update required" screen until it is installed. It starts normally when it is
     offline, or when the required version isn't actually published, so nobody gets locked out by mistake. */
  var checkingReq = false, blocked = false;
  async function requiredCheck() {
    if (!T) return true;
    try { await RT.load(true); } catch (e) {}
    var D = RT.data(), min = D && D.app && D.app.min, v = await T.app.getVersion();
    if (!min || !RT.versionLess(v, min)) { localStorage.removeItem("rtc-required"); return true; }
    var u = await Promise.race([RT.invoke("check_update"), new Promise(function (r) { setTimeout(function () { r(null); }, 10000); })]).catch(function () { return null; });
    if (u && !RT.versionLess(u.version, min)) { localStorage.setItem("rtc-required", JSON.stringify({ version: u.version, notes: u.notes || "", have: v })); return false; }
    localStorage.removeItem("rtc-required"); return true;
  }
  function start() {
    if (started || blocked || !RT.accepted()) return;
    if (!WID && T) {
      if (checkingReq) return;
      checkingReq = true;
      requiredCheck().then(function (ok) { checkingReq = false; if (ok) begin(); else { blocked = true; RT.invoke("open_panel"); } });
      return;
    }
    begin();
  }
  function begin() {
    if (started) return;
    started = true;
    if (!T) return;
    if (!WID) {
      var s0 = RT.settings();
      RT.invoke("set_game_only", { on: !!s0.gameOnly });
      RT.invoke("set_hotkeys", { binds: RT.binds(s0) }).then(function (failed) {
        if (failed && failed.length) localStorage.setItem("rtc-hotkey-err", JSON.stringify(failed.join(", "))); else localStorage.removeItem("rtc-hotkey-err");
      });
      sync();
      updates();
      if (window.RTSync) RTSync.start();   // only does anything once the user turns sync on
    }
    lastSize = ""; render(); place();
  }
  /* updates: ask GitHub for a newer signed release at start and every 6 hours (can be turned off in Settings) */
  function updates() {
    var check = function () {
      if (!RT.settings().autoUpdate) return;
      RT.invoke("check_update").then(function (u) {
        if (u) localStorage.setItem("rtc-update", JSON.stringify({ version: u.version, notes: u.notes || "", at: Date.now() })); else localStorage.removeItem("rtc-update");
      }, function () {});
    };
    setTimeout(check, 15000); setInterval(check, 6 * 3600 * 1000);
  }

  if (T) {
    W.setIgnoreCursorEvents(true);
    T.event.listen("panel-open", function (e) { setEdit(e.payload); });
    if (!WID) T.event.listen("hotkey", function (e) { act(e.payload); });
    T.event.listen("overlay-shown", function (e) { shown = !!e.payload; if (!WID && RT.settings().overlay !== shown) RT.setSetting("overlay", shown); });
    W.onMoved(function () { if (!edit || Date.now() < placingUntil) return; clearTimeout(window.__mt); window.__mt = setTimeout(saveSpot, 350); });
    if (WID) W.onResized(function () { if (!edit) return; clearTimeout(window.__rt); window.__rt = setTimeout(saveSize, 350); });
  }
  document.getElementById("grip").addEventListener("pointerdown", function (e) { e.preventDefault(); if (W && edit) W.startResizeDragging("SouthEast"); });
  hud.addEventListener("click", function (e) {
    var u = e.target.closest("[data-unpin]"), pn = e.target.closest("[data-pin]");
    var a = e.target.closest("[data-act]"); if (a) { act(a.dataset.act); return; }
    if (u) { var k = u.dataset.unpin, i = RT.DEFAULTS.order.indexOf(k); RT.setWidget(k, { pinned: false, pos: RT.widget(k).pos || { a: "ml", x: 0.012, y: -0.25 + 0.12 * i } }); lastSize = ""; render(); sync(); }
    if (pn) RT.setWidget(WID, { pinned: true });   // the main overlay closes this window when it sees the change
  });

  if (!WID && !RT.accepted()) RT.invoke("open_panel");   // first start: the panel opens on the agreement screen
  start();

  var lastS = JSON.stringify(RT.settings());
  window.addEventListener("storage", function () {
    if (!started) { start(); if (!started) return; }
    var s = RT.settings(), now = JSON.stringify(s), before = JSON.parse(lastS); lastS = now;
    apply(); lastSize = ""; render();
    var mine = function (x) { return WID ? JSON.stringify(((x.widgets || {})[WID] || {}).pos || null) : JSON.stringify(x.pos); };
    if (mine(before) !== mine(s)) place();   // a position picked in the panel
    if (!WID) {
      sync();
      if (T && before.overlay !== s.overlay && shown !== s.overlay) RT.invoke("show_overlay", { show: !!s.overlay });
      if (T && before.gameOnly !== s.gameOnly) RT.invoke("set_game_only", { on: !!s.gameOnly });
    }
  });

  // a different screen, resolution or Windows scaling: rescale and put it back in its spot
  setInterval(function () {
    var k = screen.width + "x" + screen.height + "@" + devicePixelRatio;
    if (k !== screenKey) { screenKey = k; apply(); lastSize = ""; render(); place(); }
  }, 2000);

  apply(); render();
  screenKey = screen.width + "x" + screen.height + "@" + devicePixelRatio;
  setInterval(render, 1000);
  RT.load().then(render, render);
  setInterval(function () { RT.load().then(render, function () {}); }, 30 * 60 * 1000);
})();
