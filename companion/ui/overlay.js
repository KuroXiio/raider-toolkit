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
  var DEF_SIZE = { cond: { w: 16, h: 3.4 }, prog: { w: 14, h: 3.2 }, items: { w: 17, h: 16 }, quests: { w: 21, h: 14 }, keys: { w: 21, h: 12 }, maps: { w: 18, h: 9 } };
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

  /* ---------- the parts ---------- */
  function parts(s, now, maxItems) {
    var P = {}, c = RT.data() ? RT.condition(s.map, s.region, now) : null;
    P.cond = '<div class="ln cond"><span class="dot' + (c && c.cur ? " on" : "") + '"></span><span class="m">' + esc(shortOf(s.map)) + "</span><b>" + esc(c ? c.cur || "Quiet" : RT.data() ? "No data" : "Loading…") + "</b>" + (c && c.cur ? '<span class="t">' + RT.clock(c.ends - now) + "</span>" : "") + "</div>";
    var l = RT.list(), p = RT.progress();
    if (p.total) P.prog = '<div class="ln"><span>List</span><span class="mono">' + p.done + "/" + p.total + '</span><span class="bar"><i style="width:' + Math.round(p.done / p.total * 100) + '%"></i></span></div>';
    if (p.total && RT.data()) {
      var left = l.order.filter(function (id) { var x = l.items[id]; return x && x.have < x.need && RT.item(id); });
      var here = s.onlyMap ? left.filter(function (id) { return RT.onMap(id, s.map); }) : left, elsewhere = left.length - here.length;
      var rows = here.slice(0, maxItems).map(function (id) {
        var it = RT.item(id), x = l.items[id];
        return '<div class="r">' + (it.ic ? '<img alt="" src="' + RT.SITE + "i/" + encodeURIComponent(id) + '.webp">' : '<span class="ph"></span>') + '<span class="nm">' + esc(it.n) + '</span><span class="q">' + x.have + "/" + x.need + "</span></div>";
      });
      var extra = here.length - rows.length;
      P.items = '<div class="ttl">' + (s.onlyMap ? "Needed on " + esc(shortOf(s.map)) : "Still needed") + "</div>" +
        (rows.length ? '<div class="rows">' + rows.join("") + "</div>" : '<div class="more">Nothing left to find here.</div>') +
        (extra > 0 ? '<div class="more">+' + extra + " more</div>" : "") + (s.onlyMap && elsewhere ? '<div class="more">' + elsewhere + " on other maps</div>" : "");
    }
    var f = RT.follow(), qs = Object.keys(f.quests).map(RT.quest).filter(Boolean);
    if (qs.length) P.quests = '<div class="ttl">Quests</div><div class="rows">' + qs.map(function (q) {
      var done = f.quests[q.id].done || [], open = (q.o || []).map(function (o, i) { return [o, i]; }).filter(function (x) { return done.indexOf(x[1]) < 0; });
      return '<div class="r"><span class="dot' + (open.length ? " on" : "") + '"></span><span class="nm"><b>' + esc(q.n) + "</b></span></div>" +
        (open.length ? open.slice(0, 3).map(function (x) { return '<div class="r sub"><span class="nm">› ' + esc(x[0]) + "</span></div>"; }).join("") : '<div class="r sub"><span class="nm">All objectives done: hand it in</span></div>');
    }).join("") + "</div>";
    var ks = f.keys.map(RT.key).filter(Boolean);
    if (ks.length) P.keys = '<div class="ttl">Keys</div><div class="rows">' + ks.map(function (k) {
      return '<div class="r"><span class="nm"><b>' + esc(k.n) + '</b></span><span class="m">' + esc(shortOf(k.mk)) + '</span></div><div class="r door">' + esc(k.door) + "</div>";
    }).join("") + "</div>";
    if (RT.data()) {
      var on = RT.MAP_ORDER.filter(function (k) { return k !== s.map; }).map(function (k) { return { k: k, c: RT.condition(k, s.region, now) }; }).filter(function (x) { return x.c && x.c.cur; });
      if (on.length) P.maps = '<div class="ttl">Other maps now</div><div class="rows">' + on.map(function (x) { return '<div class="r"><span class="dot on"></span><span class="m">' + esc(shortOf(x.k)) + '</span><span class="nm">' + esc(x.c.cur) + '</span><span class="q">' + RT.clock(x.c.ends - now) + "</span></div>"; }).join("") + "</div>";
    }
    return P;
  }
  var EMPTY = { prog: "Your list is empty.", items: "Your list is empty.", quests: "Follow a quest in the panel to see it here.", keys: "Follow a key in the panel to see it here.", maps: "No other map has a condition right now." };

  function render() {
    var s = RT.settings(), now = Date.now();
    if (WID) {
      var P = parts(s, now, 200);
      hud.innerHTML = '<div class="part">' + (P[WID] || '<div class="ttl">' + esc(RT.SECTIONS[WID] || "") + '</div><div class="more">' + esc(EMPTY[WID] || "") + "</div>") +
        '<button type="button" class="pin" data-pin title="Pin back into the overlay" aria-label="Pin back into the overlay">⇲</button></div>' +
        (edit ? '<div class="hint">Drag to move, drag the corner to resize.</div>' : "");
      clip();
    } else {
      var P2 = parts(s, now, s.listMax), keys = s.order.filter(function (k) { return s.parts[k] && RT.widget(k).pinned && P2[k]; });
      hud.innerHTML = keys.map(function (k) { return '<div class="part">' + P2[k] + '<button type="button" class="pin" data-unpin="' + k + '" title="Unpin: move and resize it on its own" aria-label="Unpin ' + esc(RT.SECTIONS[k]) + '">⇱</button></div>'; }).join("") +
        (edit ? '<div class="hint">Drag to move. ⇱ unpins a part so you can move and resize it on its own.</div>' : "");
    }
    fit();
  }
  /* an unpinned window shows as many rows as fit; the rest become "+N more" */
  function clip() {
    var box = hud.querySelector(".rows"); if (!box) return;
    var bottom = hud.getBoundingClientRect().bottom - parseFloat(getComputedStyle(hud).paddingBottom) - 4, hidden = 0;
    hud.querySelectorAll(".part > .more, .hint").forEach(function (m) { bottom -= m.getBoundingClientRect().height; });
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
    var r = document.body.getBoundingClientRect(), empty = !hud.innerHTML;
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
      if (WID) { if (shown) W.show(); } else RT.invoke("show_overlay", { show: shown });
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
  function start() {
    if (started || !RT.accepted()) return;
    started = true;
    if (!T) return;
    if (!WID) {
      var s0 = RT.settings();
      RT.invoke("set_hotkeys", { panel: s0.hotkey || "", overlay: s0.hotkeyOverlay || "" }).then(function (failed) {
        if (failed && failed.length) localStorage.setItem("rtc-hotkey-err", JSON.stringify(failed.join(", "))); else localStorage.removeItem("rtc-hotkey-err");
      });
      sync();
      updates();
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
    T.event.listen("overlay-shown", function (e) { shown = !!e.payload; if (!WID && RT.settings().overlay !== shown) RT.setSetting("overlay", shown); });
    W.onMoved(function () { if (!edit || Date.now() < placingUntil) return; clearTimeout(window.__mt); window.__mt = setTimeout(saveSpot, 350); });
    if (WID) W.onResized(function () { if (!edit) return; clearTimeout(window.__rt); window.__rt = setTimeout(saveSize, 350); });
  }
  document.getElementById("grip").addEventListener("pointerdown", function (e) { e.preventDefault(); if (W && edit) W.startResizeDragging("SouthEast"); });
  hud.addEventListener("click", function (e) {
    var u = e.target.closest("[data-unpin]"), pn = e.target.closest("[data-pin]");
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
    if (!WID) { sync(); if (T && before.overlay !== s.overlay && shown !== s.overlay) RT.invoke("show_overlay", { show: !!s.overlay }); }
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
