/* The overlay: a small panel over the game, with adjustable opacity. Clicks always go through it, except while the panel is open,
   when it shows an outline and can be dragged. Its place is stored relative to a corner or edge of the screen
   (as a share of the screen), so it stays in the same spot at any resolution or aspect ratio. */
(function () {
  "use strict";
  var hud = document.getElementById("hud"), T = window.__TAURI__, W = RT.win(), esc = RT.esc;
  var edit = false, lastSize = "", screenKey = "", placingUntil = 0, shown = null;

  function auto() { return Math.max(0.85, Math.min(2, (screen.height || 1080) / 1080)); }   // 1080p = 1, 1440p ≈ 1.33, 4K at 100% = 2
  function apply() {
    var s = RT.settings();
    document.documentElement.style.setProperty("--scale", (s.size * auto()).toFixed(3));
    document.documentElement.style.setProperty("--bga", s.bg);
    hud.className = s.style === "line" ? "line" : "";
    document.body.classList.toggle("edit", edit);
  }

  function render() {
    var s = RT.settings(), P = s.parts, now = Date.now(), c = RT.data() ? RT.condition(s.map, s.region, now) : null, part = {};
    var shortOf = function (k) { return (RT.SHORT[k] || "").replace("Stella Montis", "Stella").replace("Pendola Pass", "Pendola").replace("Riven Tides", "Riven").replace("Buried City", "Buried"); };
    part.cond = '<div class="ln cond"><span class="dot' + (c && c.cur ? " on" : "") + '"></span><span class="m">' + esc(shortOf(s.map)) + "</span><b>" + esc(c ? c.cur || "Quiet" : RT.data() ? "No data" : "Loading…") + "</b>" + (c && c.cur ? '<span class="t">' + RT.clock(c.ends - now) + "</span>" : "") + "</div>";
    if (c && c.next) part.next = '<div class="ln next"><span>Next</span><span>' + esc(c.next) + '</span><span class="mono">' + RT.clock(c.at - now) + "</span></div>";
    var l = RT.list(), p = RT.progress();
    if (p.total) part.prog = '<div class="ln prog"><span>List</span><span class="mono">' + p.done + "/" + p.total + '</span><span class="bar"><i style="width:' + Math.round(p.done / p.total * 100) + '%"></i></span></div>';
    var left = p.total ? l.order.filter(function (id) { var x = l.items[id]; return x && x.have < x.need && RT.item(id); }).slice(0, 4) : [];
    if (left.length) part.items = '<div class="items">' + left.map(function (id) {
      var it = RT.item(id), x = l.items[id];
      return '<span class="it">' + (it.ic ? '<img alt="" src="' + RT.SITE + "i/" + encodeURIComponent(id) + '.webp">' : '<span class="ph"></span>') + "<span>" + esc(it.n) + '</span><span class="mono">' + x.have + "/" + x.need + "</span></span>";
    }).join("") + "</div>";
    if (RT.data()) {
      var all = RT.MAP_ORDER.map(function (k) { return { k: k, c: RT.condition(k, s.region, now) }; }).filter(function (x) { return x.c; });
      var on = all.filter(function (x) { return x.k !== s.map && x.c.cur; });
      if (on.length) part.maps = '<div class="items">' + on.map(function (x) { return '<span class="it"><span class="dot on"></span><span class="m">' + esc(shortOf(x.k)) + "</span><span>" + esc(x.c.cur) + '</span><span class="mono">' + RT.clock(x.c.ends - now) + "</span></span>"; }).join("") + "</div>";
      var soon = all.filter(function (x) { return x.c.next; }).sort(function (a, b) { return a.c.at - b.c.at; }).slice(0, 3);
      if (soon.length) part.soon = '<div class="items">' + soon.map(function (x) { return '<span class="it"><span class="dot"></span><span>' + esc(x.c.next) + '</span><span class="m">' + esc(shortOf(x.k)) + '</span><span class="m">in</span><span class="mono">' + RT.clock(x.c.at - now) + "</span></span>"; }).join("") + "</div>";
    }
    var h = s.order.filter(function (k) { return P[k] && part[k]; }).map(function (k) { return part[k]; }).join("");
    if (!h) h = '<div class="ln"><span class="dim">Nothing to show. Pick what the overlay shows in the panel.</span></div>';
    if (edit) h += '<div class="hint">Drag to move. It keeps this spot on any screen.</div>';
    hud.innerHTML = h;
    fit();
  }

  /* the window is exactly as big as the text, so it covers nothing else */
  function fit() {
    if (!W) return;
    var r = document.body.getBoundingClientRect(), key = Math.ceil(r.width) + "x" + Math.ceil(r.height);
    if (key === lastSize) return;
    lastSize = key;
    W.setSize(new T.dpi.LogicalSize(Math.ceil(r.width), Math.ceil(r.height))).then(place);
  }

  function area(m) { var a = m.workArea || { position: m.position, size: m.size }; return { x: a.position.x, y: a.position.y, w: a.size.width, h: a.size.height }; }
  async function place() {
    if (!W) return;
    var m = await T.window.currentMonitor(); if (!m) return;
    var A = area(m), o = await W.outerSize(), pos = RT.settings().pos, v = pos.a[0], hz = pos.a[1], x, y;
    x = hz === "l" ? A.x + pos.x * A.w : hz === "r" ? A.x + A.w - pos.x * A.w - o.width : A.x + (A.w - o.width) / 2 + pos.x * A.w;
    y = v === "t" ? A.y + pos.y * A.h : v === "b" ? A.y + A.h - pos.y * A.h - o.height : A.y + (A.h - o.height) / 2 + pos.y * A.h;
    x = Math.round(Math.max(A.x, Math.min(A.x + A.w - o.width, x))); y = Math.round(Math.max(A.y, Math.min(A.y + A.h - o.height, y)));
    placingUntil = Date.now() + 400;
    await W.setPosition(new T.dpi.PhysicalPosition(x, y));
    if (shown === null && RT.accepted()) { shown = !!RT.settings().overlay; RT.invoke("show_overlay", { show: shown }); }   // show once it is in place, and only after the agreement is accepted
  }

  /* after a drag: remember the spot as "nearest corner or edge + share of the screen" */
  var saveT = 0;
  async function saveSpot() {
    var m = await T.window.currentMonitor(); if (!m) return;
    var A = area(m), o = await W.outerSize(), p = await W.outerPosition();
    var cx = p.x - A.x + o.width / 2, cy = p.y - A.y + o.height / 2;
    var hz = cx < A.w / 3 ? "l" : cx > A.w * 2 / 3 ? "r" : "c", v = cy < A.h / 3 ? "t" : cy > A.h * 2 / 3 ? "b" : "m";
    var x = hz === "l" ? (p.x - A.x) / A.w : hz === "r" ? (A.x + A.w - p.x - o.width) / A.w : (p.x - A.x - (A.w - o.width) / 2) / A.w;
    var y = v === "t" ? (p.y - A.y) / A.h : v === "b" ? (A.y + A.h - p.y - o.height) / A.h : (p.y - A.y - (A.h - o.height) / 2) / A.h;
    RT.setSetting("pos", { a: v + hz, x: +x.toFixed(4), y: +y.toFixed(4) });
  }

  function setEdit(on) {
    edit = !!on; apply();
    if (W) W.setIgnoreCursorEvents(!edit);   // in overlay mode every click goes straight through to the game
    lastSize = ""; render();
  }

  if (T) {
    W.setIgnoreCursorEvents(true);
    T.event.listen("panel-open", function (e) { setEdit(e.payload); });
    T.event.listen("overlay-shown", function (e) { shown = !!e.payload; if (RT.settings().overlay !== shown) RT.setSetting("overlay", shown); });
    W.onMoved(function () {
      if (!edit || Date.now() < placingUntil) return;
      clearTimeout(saveT); saveT = setTimeout(saveSpot, 350);
    });
  }
  /* nothing runs until the user has accepted the licence agreement and privacy policy: no keybinds, no overlay */
  var started = false;
  function start() {
    if (started || !RT.accepted()) return;
    started = true;
    if (!T) return;
    var s0 = RT.settings();
    RT.invoke("set_hotkeys", { panel: s0.hotkey || "", overlay: s0.hotkeyOverlay || "" }).then(function (failed) {
      if (failed && failed.length) localStorage.setItem("rtc-hotkey-err", JSON.stringify(failed.join(", "))); else localStorage.removeItem("rtc-hotkey-err");
    });
    lastSize = ""; render(); place();
  }
  if (!RT.accepted()) RT.invoke("open_panel");   // first start: the panel opens on the agreement screen
  start();

  var lastS = JSON.stringify(RT.settings());
  window.addEventListener("storage", function () {
    if (!started) { start(); if (!started) return; }
    var s = RT.settings(), now = JSON.stringify(s), before = JSON.parse(lastS); lastS = now;
    apply(); lastSize = ""; render();
    if (JSON.stringify(before.pos) !== JSON.stringify(s.pos)) place();   // a position picked in the panel
    if (T && before.overlay !== s.overlay && shown !== s.overlay) RT.invoke("show_overlay", { show: !!s.overlay });
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
