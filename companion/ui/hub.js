/* The in-game bar (hub.html): a slim bar of widgets over the game, opened with the menu keybind.
   Each widget opens a small window you can drag; the pin keeps it on screen while you play (the overlay draws it then).
   Everything here reads and writes the same saved data as the main window and the overlay. */
(function () {
  "use strict";
  var esc = RT.esc, $ = function (id) { return document.getElementById(id); }, T = window.__TAURI__;
  var WIDS = ["map", "route", "list", "quests", "cond"];
  // Three ways this page runs: the bar over the game (you can click everything), pinned (the bar is closed: only the
  // pinned widgets stay over the game and every click goes through), and docked inside the main window (embed).
  var EMBED = /[?&]embed=1/.test(location.search), PIN = !EMBED && !!T && !/[?&]bar=1/.test(location.search), lastAny = null;
  var DEFPIN = { map: false, route: true, list: true, quests: false, cond: false }, root = document.documentElement;
  var cv = $("cv"), stage = $("stage"), tip = $("tip"), view = { z: 1, dx: 0, dy: 0 }, lastKey = "", pins = null, pinSig = "", out = null, mdata = null;
  var found = null, picking = false, q = "", addq = "", fqq = "", setOpen = false;

  // sizes follow the screen: the same share of a 1080p, 1440p, 4K or ultrawide screen, times the size you picked
  function scale() {
    var s = RT.settings(), k = EMBED ? 1.08 : Math.max(0.7, Math.min(2.2, Math.min((screen.width || 1920) / 1920, (screen.height || 1080) / 1080))) * (hub().size || 1);
    root.style.setProperty("--scale", k); root.style.setProperty("--bga", s.bg);
  }
  function mode() { document.body.classList.toggle("pin", PIN); document.body.classList.toggle("embed", EMBED); root.classList.toggle("embed", EMBED); }
  function hub() { var h = RT.settings().hub; if (!h.pin) h.pin = JSON.parse(JSON.stringify(DEFPIN)); if (!h.size) h.size = 1; return h; }
  function saveHub(fn) { var h = hub(); fn(h); RT.setSetting("hub", h); }
  function pinned(k) { return !!hub().pin[k]; }
  // is there anything to show for a pinned widget right now? An empty one stays off the screen while you play.
  function has(k) {
    if (k === "route") return !!RT.route();
    if (k === "list") return hereIds().length > 0;
    if (k === "quests") { var f = RT.follow(); return Object.keys(f.quests).length + f.keys.length > 0; }
    return true;
  }
  function hereIds() { var s = RT.settings(), l = RT.list(); return l.order.filter(function (id) { var x = l.items[id]; return x && RT.item(id) && x.have < x.need && RT.onMap(id, s.map); }); }
  function mapShown() { var h = hub(); return EMBED || (PIN ? h.pin.map : h.open.map); }
  function key() { var s = RT.settings(), rt = RT.route(); return routeOn() ? rt.k : RTMap.keyOf(s.map, s.floor); }
  function routeOn() { return !found && !picking && RT.settings().mapView === "route" && !!RT.route(); }
  function itemsHere(id) { return mdata ? RTMap.spots(mdata, id) : []; }

  /* ---------- the bar ---------- */
  function bar() {
    var h = hub(), s = RT.settings(), now = Date.now(), c = RT.data() ? RT.condition(s.map, s.region, now) : null;
    document.querySelectorAll(".wb").forEach(function (b) { var k = b.dataset.w; b.setAttribute("aria-pressed", String(!!h.open[k])); b.classList.toggle("pinned", pinned(k)); });
    document.querySelectorAll("[data-pin]").forEach(function (b) { b.setAttribute("aria-pressed", String(pinned(b.dataset.pin))); });
    $("clock").innerHTML = "<b>" + RT.localTime(now) + "</b><span>" + esc(RT.SHORT[s.map] || "") + " · " + esc(c && c.cur ? c.cur : "Quiet") + "</span>";
    $("cog").setAttribute("aria-expanded", String(setOpen));
    $("hint").innerHTML = "<kbd>" + esc(s.hotkey || "Esc") + "</kbd> or <kbd>Esc</kbd> back to the game";
  }

  /* ---------- where the widgets sit: where you dragged them, or a tidy default ---------- */
  function defPos(k, el) {
    var W = innerWidth, H = innerHeight, m = W * 0.03, w = el.offsetWidth, top = H * 0.14;
    var mapH = $("w-map").offsetHeight || H * 0.45, listH = $("w-list").offsetHeight || H * 0.3;
    if (k === "map") return [m, top];
    if (k === "route") return [m, Math.min(H - el.offsetHeight - 70, top + mapH + 18)];
    if (k === "list") return [W - m - w, top];
    if (k === "quests") return [W - m - w, Math.min(H - el.offsetHeight - 70, top + listH + 18)];
    // conditions: the middle of the screen, or the gap between the map and the list when the screen is narrow
    var l = m + $("w-map").offsetWidth + 14, r = W - m - $("w-list").offsetWidth - 14;
    return [Math.max(l, Math.min(r - w, (W - w) / 2)), top];
  }
  function layout() {
    var h = hub();
    WIDS.forEach(function (k) {
      var el = $("w-" + k), on = EMBED || (PIN ? !!h.pin[k] && has(k) : !!h.open[k]);
      el.classList.toggle("on", on); el.classList.toggle("pinned", !!h.pin[k] && !EMBED);
      if (k === "map") el.classList.toggle("big", !!h.big && !PIN && !EMBED);
      if (EMBED) { el.style.left = el.style.top = ""; return; }
      var p = h.pos[k], xy = p && !(k === "map" && h.big) ? [p.x * innerWidth, p.y * innerHeight] : defPos(k, el);
      var x = Math.max(8, Math.min(innerWidth - el.offsetWidth - 8, xy[0])), y = Math.max(8, Math.min(innerHeight - 60, xy[1]));
      el.style.left = Math.round(x) + "px"; el.style.top = Math.round(y) + "px";
    });
    var cog = $("cog").getBoundingClientRect(), set = $("set");
    set.style.left = Math.round(Math.max(8, Math.min(innerWidth - set.offsetWidth - 8, cog.right - set.offsetWidth))) + "px"; set.style.top = Math.round(cog.bottom + 18) + "px";
    set.classList.toggle("on", setOpen);
  }
  function glide(el) { el.classList.add("glide"); clearTimeout(el.__g); el.__g = setTimeout(function () { el.classList.remove("glide"); draw(); }, 450); }

  /* ---------- map ---------- */
  function draw() {
    if (!mapShown()) return;
    var s = RT.settings(), k = key(), rt = RT.route(), on = routeOn();
    if (k !== lastKey) { lastKey = k; view = { z: 1, dx: 0, dy: 0 }; mdata = null; pins = null; pinSig = ""; }
    if (!RTMap.files(k)) { $("wait").hidden = false; $("wait").textContent = RT.data() ? "No map picture for this map yet." : "Loading the map…"; return; }
    RTMap.image(k, function () { draw(); });
    RTMap.markers(k, function (data) {
      mdata = data;
      var sig = k + "|" + localStorage.getItem("rtc-list") + "|" + localStorage.getItem("rtc-follow");
      if (sig !== pinSig) { pinSig = sig; pins = RTMap.pins(k, data); }
      $("wait").hidden = true;
      var sp = picking ? RTMap.spawns(data) : null;
      var o = { key: k, pins: on ? { list: [], keys: pins.keys || [], quests: [], ext: pins.ext || [] } : pins, layers: s.layers, r: 6, cluster: 26, view: view, dim: 0.9, dash: RTMap.dash(), route: on ? rt : null, at: RT.routeAt(),
        found: found && found.pts.length ? found : null, spawns: sp,
        fit: sp && sp.length > 1 ? sp : found && found.pts.length ? (found.pts.length > 1 ? found.pts : null) : on ? [rt.spawn].concat(rt.stops.map(function (x) { return x.p; })).concat(rt.end ? [rt.end.p] : []) : RTMap.extent(pins) };
      if (found && found.pts.length === 1 && view.z === 1 && !found.zoomed) { found.zoomed = 1; var f = RTMap.files(k); view = { z: 2.4, dx: found.pts[0][0] - f.w / 2, dy: found.pts[0][1] - f.h / 2 }; o.view = view; o.fit = null; }
      RTMap.draw(cv, o); out = o.out;
    });
  }
  function over() {
    var h = "", s = RT.settings(), rt = RT.route();
    if (picking) h += '<div id="banner"><span>Tap where you spawned</span><button type="button" class="btn sm" data-act="pickoff">Cancel</button></div>';
    if (q && !(found && found.q === q)) {
      var res = RT.search(q, 40).filter(function (r) { return r.kind === "item" || r.kind === "key"; }).slice(0, 7);
      h += '<div id="res">' + (res.length ? res.map(function (r) {
        if (r.kind === "key") return '<button type="button" data-key="' + esc(r.x.id) + '"><span class="kdot"></span><span class="nm">' + esc(r.x.n) + '</span><span class="sb">' + esc(RT.SHORT[r.x.mk] || "Key") + "</span></button>";
        var n = itemsHere(r.x.id).length, here = RT.onMap(r.x.id, s.map);
        return '<button type="button" data-item="' + esc(r.x.id) + '">' + RT.icon(r.x.id) + '<span class="nm">' + esc(r.x.n) + '</span><span class="sb">' + (n ? n + (n === 1 ? " spot here" : " spots here") : here ? "Found here" : "Not on this map") + "</span></button>";
      }).join("") : '<span class="note" style="padding:0.7rem 0.6rem">Nothing matches that.</span>') + "</div>";
    }
    if (found) {
      var l = RT.list(), on = found.kind === "item" && l.items[found.id];
      h += '<div id="chip">' + (found.kind === "key" ? '<span class="kdot" style="margin:0"></span>' : RT.icon(found.id)) + '<span class="t"><b>' + esc(found.name) + "</b><span>" + esc(found.sub) + "</span></span>";
      if (found.kind === "item") {
        h += '<button type="button" class="btn sm" data-act="f-list">' + (on ? "On your list" : "+ List") + "</button>";
        if (rt && rt.own && RTMap.mapOf(rt.k) === s.map && found.pts.length) h += '<button type="button" class="btn sm" data-act="f-route">' + ((rt.items || []).indexOf(found.id) > -1 ? "On your route" : "+ Route") + "</button>";
      } else h += '<button type="button" class="btn sm" data-act="f-follow">' + (RT.follow().keys.indexOf(found.id) > -1 ? "Following" : "Follow") + "</button>";
      h += '<button type="button" class="ib sm" data-act="f-clear" aria-label="Back to your map"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>';
    }
    if ($("over").__h !== h) { $("over").__h = h; $("over").innerHTML = h; }
    stage.classList.toggle("pick", picking);
  }
  function showItem(id) {
    if (!mdata) { var k0 = key(); if (RTMap.files(k0)) { RTMap.markers(k0, function (d) { mdata = mdata || d; showItem(id); }); return; } }
    var it = RT.item(id), pts = itemsHere(id), s = RT.settings(); if (!it) return;
    found = { kind: "item", id: id, name: it.n, q: it.n, pts: pts, sub: pts.length ? pts.length + (pts.length === 1 ? " spot" : " spots") + " on " + (RT.SHORT[s.map] || "this map") : (it.f ? "Look in: " + it.f : "No marked spots on " + (RT.SHORT[s.map] || "this map")) };
    q = it.n; $("q").value = q; view = { z: 1, dx: 0, dy: 0 }; all();
  }
  function showKey(id) {
    var k = RT.key(id); if (!k) return;
    if (Array.isArray(k.pin)) { var mk = RTMap.mapOf(k.pin[0]); if (RT.settings().map !== mk) RT.setSetting("map", mk); if (mk === "stella") RT.setSetting("floor", k.pin[0] === "stella_l" ? "l" : "u"); }
    found = { kind: "key", id: id, name: k.n, q: k.n, pts: Array.isArray(k.pin) ? [[k.pin[1], k.pin[2]]] : [], sub: (k.door || "") + (Array.isArray(k.pin) ? "" : " · no map pin yet") };
    q = k.n; $("q").value = q; view = { z: 1, dx: 0, dy: 0 }; open("map", true); all();
  }
  function clearFound() { found = null; q = ""; $("q").value = ""; view = { z: 1, dx: 0, dy: 0 }; all(); }

  /* ---------- route ---------- */
  function route() {
    var s = RT.settings(), rt = RT.route(), h = "", mapName = RT.SHORT[s.map] || "this map";
    if (!rt) {
      var want = RTRoute.wanted(s.map);
      h = '<div class="wbody"><span class="note">' + (want.length ? "Plan a route on " + esc(mapName) + " for the " + want.length + (want.length === 1 ? " item" : " items") + " on your list that " + (want.length === 1 ? "is" : "are") + " found there."
        : "Nothing on your list is found on " + esc(mapName) + ". Add items to your list first, or pick another map.") + "</span>" +
        '<div class="row acts"><button type="button" class="btn go" data-act="plan"' + (want.length ? "" : " disabled") + ">Plan a route: pick your spawn</button></div>" +
        '<span class="note">You can also plan on raidkits.com and press Send to app.</span></div>';
    } else {
      var at = RT.routeAt(), tot = rt.stops.length + (rt.end ? 1 : 0), stop = rt.stops[at], last = at >= rt.stops.length;
      h = '<div class="wbody"><div class="rt"><div class="rtn"><b>' + Math.min(at + 1, tot) + "</b><span>/" + tot + '</span></div><div class="rtx"><span class="k hi">' + (last ? "Extract" : "Next stop") + "</span><b>" +
        esc(stop ? stop.w || "Stop " + (at + 1) : (rt.end && rt.end.n) || "Extract") + "</b></div></div>";
      if (stop && stop.ids && stop.ids.length) h += '<div class="chips" aria-label="Found one? Tap it">' + stop.ids.map(function (id) {
        var x = RT.list().items[id]; return '<button type="button" class="chipb" data-got="' + esc(id) + '" title="Found one? Tap to count it">' + RT.icon(id) + esc((RT.item(id) || {}).n || id) + (x ? " <em>" + x.have + "/" + x.need + "</em>" : "") + "</button>"; }).join("") + "</div>";
      h += '<div class="row acts"><button type="button" class="btn" data-act="prev" aria-label="Previous stop"' + (at ? "" : " disabled") + '>‹</button><button type="button" class="btn go" style="flex:1" data-act="' + (last ? "end" : "next") + '">' + (last ? "Finish route" : "Next stop ›") + "</button></div>";
      h += '<details class="more"' + (route.more ? " open" : "") + "><summary>Change route</summary><div>";
      if (rt.own) {
        var its = rt.items || [];
        h += '<span class="k">Looking for (tap to take off this route)</span><div class="chips">' + (its.length ? its.map(function (id) { return '<button type="button" class="chipb x" data-drop="' + esc(id) + '">' + RT.icon(id) + esc((RT.item(id) || {}).n || id) + " <em>" + ((rt.odds || {})[id] ? rt.odds[id] + "%" : "no marked spots") + "</em> ✕</button>"; }).join("") : '<span class="note">Nothing left to look for.</span>') + "</div>" +
          '<span class="note">The % is a rough chance to find at least one. Add more from the map: search an item and press + Route.</span>';
      } else h += '<span class="note">This route was sent from raidkits.com, so it stays as you planned it there. Start a new one here to change it.</span>';
      h += '<div class="row">' + (stop ? '<button type="button" class="btn sm" data-act="skip">Skip this stop</button>' : "") + (rt.own ? '<button type="button" class="btn sm" data-act="replan">Re-plan from here</button>' : "") +
        '<button type="button" class="btn sm" data-act="plan">New route</button><button type="button" class="btn sm warn" data-act="end">End route</button></div></div></details></div>' +
        '<div class="prog"><i style="width:' + Math.round(Math.min(at + 1, tot) / tot * 100) + '%"></i></div>';
    }
    var b = $("routebody"); if (b.__h !== h) { b.__h = h; b.innerHTML = h; }
  }
  function afterListChange() { var rt = RT.route(); pinSig = ""; if (rt && rt.own) RTRoute.replan(function () { all(); }); else all(); }

  /* ---------- list ---------- */
  function list() {
    var s = RT.settings(), l = RT.list(), ids = l.order.filter(function (id) { return l.items[id] && RT.item(id); });
    var here = ids.filter(function (id) { return RT.onMap(id, s.map); }), rest = ids.filter(function (id) { return here.indexOf(id) < 0; });
    $("listtitle").textContent = "Shopping list";
    var rowOf = function (id) { var x = l.items[id], dn = x.have >= x.need; return '<div class="li' + (dn ? " dn" : "") + '">' + RT.icon(id) + '<span class="nm">' + esc(RT.item(id).n) + '</span><button type="button" data-have="' + esc(id) + '" data-d="-1" aria-label="One fewer">−</button><span class="q">' + x.have + "/" + x.need + '</span><button type="button" data-have="' + esc(id) + '" data-d="1" aria-label="One more">+</button><button type="button" class="rm" data-del="' + esc(id) + '" aria-label="Remove ' + esc(RT.item(id).n) + ' from your list" title="Remove">×</button></div>'; };
    if (PIN) { var need = hereIds(), b0 = $("listbody"), ph = need.slice(0, 8).map(rowOf).join("") + (need.length > 8 ? '<span class="note" style="padding:0.2rem 0.5rem">+' + (need.length - 8) + " more</span>" : ""); if (b0.__h !== ph) { b0.__h = ph; b0.innerHTML = ph; } return; }
    var h = !ids.length ? '<span class="note" style="padding:0.5rem">Your list is empty. Add an item above, or build it on raidkits.com and turn on sync.</span>' :
      (here.length ? '<span class="k" style="padding:0.4rem 0.5rem 0.2rem">On ' + esc(RT.SHORT[s.map] || "this map") + "</span>" + here.map(rowOf).join("") : "") +
      (rest.length ? '<span class="k" style="padding:0.6rem 0.5rem 0.2rem">Other maps</span>' + rest.map(rowOf).join("") : "");
    var b = $("listbody"); if (b.__h !== h) { b.__h = h; b.innerHTML = h; }
    var r = addq ? RT.search(addq, 30).filter(function (x) { return x.kind === "item"; }).slice(0, 5) : [];
    var ah = r.map(function (x) { return '<button type="button" data-add="' + esc(x.x.id) + '">' + RT.icon(x.x.id) + "<span>" + esc(x.x.n) + "</span></button>"; }).join("") + (addq && !r.length ? '<span class="note" style="padding:0.5rem">No item matches that.</span>' : "");
    if ($("addres").__h !== ah) { $("addres").__h = ah; $("addres").innerHTML = ah; }
  }

  /* ---------- quests and keys ---------- */
  function quests() {
    var f = RT.follow(), qs = Object.keys(f.quests).map(RT.quest).filter(Boolean), ks = f.keys.map(RT.key).filter(Boolean), h = "";
    if (!qs.length && !ks.length) h = '<span class="note">Follow a quest with the search above. Keys are followed from the map search.</span>';
    h += qs.map(function (x) {
      var done = f.quests[x.id].done || [];
      return '<div><div class="qn"><span>' + esc(x.n) + '</span><button type="button" class="rm" data-fq="' + esc(x.id) + '" aria-label="Stop following ' + esc(x.n) + '" title="Stop following">×</button></div>' + (x.o || []).map(function (o, i) { var d = done.indexOf(i) > -1; if (d && PIN) return ""; return '<label class="ob' + (d ? " dn" : "") + '"><input type="checkbox" data-obj="' + esc(x.id) + '" data-i="' + i + '"' + (d ? " checked" : "") + "><span>" + esc(o) + "</span></label>"; }).join("") + "</div>";
    }).join('<div class="hr"></div>');
    if (ks.length) h += (qs.length ? '<div class="hr"></div>' : "") + '<span class="k">Keys</span>' + ks.map(function (k) {
      return '<div class="cr"><span><b style="font-size:0.98rem">' + esc(k.n) + "</b><br>" + esc(k.door || "") + "</span>" + (Array.isArray(k.pin) ? '<button type="button" class="btn sm nopin" data-key="' + esc(k.id) + '">Show</button>' : "") + '<button type="button" class="rm" data-fk="' + esc(k.id) + '" aria-label="Stop following ' + esc(k.n) + '" title="Stop following">×</button></div>'; }).join("");
    var b = $("questbody"); if (b.__h !== h) { b.__h = h; b.innerHTML = h; }
    var r = fqq ? RT.search(fqq, 40).filter(function (x) { return x.kind === "quest"; }).slice(0, 5) : [];
    var fh = r.map(function (x) { return '<button type="button" data-fq="' + esc(x.x.id) + '"><span>' + esc(x.x.n) + "</span>" + (f.quests[x.x.id] ? ' <span class="note">following</span>' : "") + "</button>"; }).join("") + (fqq && !r.length ? '<span class="note" style="padding:0.5rem">No quest matches that.</span>' : "");
    if ($("fqres").__h !== fh) { $("fqres").__h = fh; $("fqres").innerHTML = fh; }
  }

  /* ---------- conditions ---------- */
  function cond() {
    var s = RT.settings(), now = Date.now(), h = "";
    if (!RT.data()) h = '<span class="note">Loading…</span>';
    else {
      var c = RT.condition(s.map, s.region, now);
      h = '<div class="cr"><b>' + esc(RT.mapName(s.map)) + '</b><span class="pill' + (c && c.cur ? " on" : "") + '">' + esc(c && c.cur ? c.cur : "Quiet now") + "</span></div>";
      if (c && c.cur) h += '<div class="cr"><span>Ends in</span><span class="mono">' + RT.clock(c.ends - now) + "</span></div>";
      if (c && c.next) h += '<div class="cr"><span>Next: ' + esc(c.next) + '</span><span class="mono">' + (c.cur ? "at " + RT.localTime(c.at) : "in " + RT.clock(c.at - now)) + "</span></div>";
      var other = RT.MAP_ORDER.filter(function (k) { return k !== s.map; }).map(function (k) { return [k, RT.condition(k, s.region, now)]; }).filter(function (x) { return x[1] && x[1].cur; });
      if (other.length && !PIN) h += '<div class="hr"></div><span class="k">Other maps now</span>' + other.map(function (x) { return '<div class="cr"><span>' + esc(RT.SHORT[x[0]]) + " · " + esc(x[1].cur) + '</span><span class="mono">' + RT.clock(x[1].ends - now) + "</span></div>"; }).join("");
    }
    var b = $("condbody"); if (b.__h !== h) { b.__h = h; b.innerHTML = h; }
  }

  /* ---------- quick settings ---------- */
  function settings() {
    var s = RT.settings(), looks = [[0.5, "See-through"], [0.8, "Balanced"], [0.96, "Solid"]], sizes = [[0.85, "Small"], [1, "Medium"], [1.2, "Large"]], hz = hub().size || 1;
    var near = function (v) { return looks.reduce(function (a, b) { return Math.abs(b[0] - s.bg) < Math.abs(a[0] - s.bg) ? b : a; })[0] === v; };
    var h = '<div class="sr" style="border:0;padding-bottom:0.5rem"><div><b>Pinned widgets</b><small>How see-through they are. Pinned ones stay on screen while you play, right where they are now.</small></div></div>' +
      '<div class="seg" role="group" aria-label="Pinned widget background">' + looks.map(function (x) { return '<button type="button" data-bg="' + x[0] + '" aria-pressed="' + near(x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>" +
      '<div class="sr" style="border:0;padding-bottom:0.5rem"><div><b>Size</b><small>Of the bar and every widget. Drag a widget by its top edge to move it.</small></div></div>' +
      '<div class="seg" role="group" aria-label="Size">' + sizes.map(function (x) { return '<button type="button" data-size="' + x[0] + '" aria-pressed="' + (Math.abs(hz - x[0]) < 0.01) + '">' + x[1] + "</button>"; }).join("") + "</div>" +
      '<div class="sr"><div><b>Only in game</b><small>Hide pinned widgets when you Alt-Tab</small></div><button type="button" class="sw" role="switch" data-sw="gameOnly" aria-checked="' + !!s.gameOnly + '" aria-label="Only show pinned widgets while the game is in front"><i></i></button></div>' +
      '<div class="sr"><div><b>Show pinned widgets</b><small>' + esc(s.hotkeyOverlay || "") + ' also hides and shows them</small></div><button type="button" class="sw" role="switch" data-sw="overlay" aria-checked="' + !!s.overlay + '" aria-label="Show pinned widgets"><i></i></button></div>' +
      '<div class="sr" style="border:0"><div><b>Open this bar</b></div><kbd>' + esc(s.hotkey || "") + "</kbd></div>" +
      '<button type="button" class="btn" style="width:100%" data-act="app">All settings in Raider Toolkit</button>';
    var b = $("set"); if (b.__h !== h) { b.__h = h; b.innerHTML = h; }
  }

  // a new route arrived (planned here, or sent from raidkits.com): show it on its map straight away
  var rsig = null;
  function routeWatch() {
    var rt = RT.route(), sig = rt ? [rt.k, rt.stops.length, rt.n || "", (rt.spawn || []).join(",")].join("|") : "";
    if (rsig !== null && sig && sig !== rsig) { var mk = RTMap.mapOf(rt.k); if (RT.settings().map !== mk) RT.setSetting("map", mk); if (RT.settings().mapView !== "route") RT.setSetting("mapView", "route"); found = null; picking = false; view = { z: 1, dx: 0, dy: 0 }; }
    rsig = sig;
  }
  function all() {
    routeWatch(); scale(); mode(); bar(); over(); route(); list(); quests(); cond(); settings(); layout(); draw();
    // tell the app whether anything is pinned, so it knows to keep this window over the game once the bar closes
    if (T && !EMBED) { var h = hub(), any = WIDS.some(function (k) { return h.pin[k] && has(k); }); if (any !== lastAny) { lastAny = any; RT.invoke("set_pins", { on: any }); } }
  }
  function open(k, on) { saveHub(function (h) { h.open[k] = on == null ? !h.open[k] : on; }); $("w-" + k).classList.add("top"); WIDS.forEach(function (o) { if (o !== k) $("w-" + o).classList.remove("top"); }); }
  function close() {
    if (!T || EMBED || PIN) return;
    document.body.classList.remove("in");
    setTimeout(function () { RT.invoke("toggle_menu", { open: false }); }, 170);
  }
  function enter() { setOpen = false; document.body.classList.remove("in"); void document.body.offsetWidth; all(); if (PIN) return; requestAnimationFrame(function () { document.body.classList.add("in"); draw(); }); }
  // the bar closed: forget searches and half-made choices, keep only what is pinned
  function toPinned() { PIN = true; found = null; picking = false; q = ""; $("q").value = ""; addq = ""; $("addq").value = ""; fqq = ""; $("fq").value = ""; setOpen = false; view = { z: 1, dx: 0, dy: 0 }; document.body.classList.remove("in"); all(); }

  /* ---------- actions ---------- */
  function act(a) {
    var s = RT.settings(), rt = RT.route();
    if (a === "plan") { found = null; q = ""; $("q").value = ""; picking = true; if (rt) RT.setSetting("mapView", "map"); open("map", true); view = { z: 1, dx: 0, dy: 0 }; }
    else if (a === "pickoff") { picking = false; if (rt) RT.setSetting("mapView", "route"); view = { z: 1, dx: 0, dy: 0 }; }
    else if (a === "next" && rt) RT.setRouteAt(RT.routeAt() + 1);
    else if (a === "prev" && rt) RT.setRouteAt(RT.routeAt() - 1);
    else if (a === "skip") { RTRoute.skip(); }
    else if (a === "replan") { RTRoute.replan(function () { all(); }); return; }
    else if (a === "end") { RT.setRoute(null); RT.setSetting("mapView", "map"); route.more = false; view = { z: 1, dx: 0, dy: 0 }; }
    else if (a === "app") { RT.invoke("open_panel"); close(); return; }
    else if (a === "f-clear") { clearFound(); return; }
    else if (a === "f-list" && found) { if (!RT.list().items[found.id]) { RT.addItem(found.id, 1); afterListChange(); return; } }
    else if (a === "f-route" && found) { RTRoute.add(found.id, function () { all(); }); return; }
    else if (a === "f-follow" && found) { RT.toggleKey(found.id); pinSig = ""; }
    all();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("button"), t = e.target;
    if (PIN) return;
    if (t.id === "shade") { if (setOpen) { setOpen = false; all(); } else close(); return; }
    if (!b) return;
    var d = b.dataset;
    if (d.w) { open(d.w); if (!hub().open[d.w]) { saveHub(function (h) { h.pin[d.w] = false; }); if (d.w === "map") picking = false; } all(); }
    else if (d.close) { open(d.close, false); saveHub(function (h) { h.pin[d.close] = false; }); if (d.close === "map") picking = false; all(); }
    else if (d.pin) { var on = !pinned(d.pin); saveHub(function (h) { h.pin[d.pin] = on; if (on) h.open[d.pin] = true; }); if (on && !RT.settings().overlay) { RT.setSetting("overlay", true); RT.invoke("show_overlay", { show: true }); } all(); }
    else if (d.big != null) { saveHub(function (h) { h.big = !h.big; }); b.setAttribute("aria-pressed", String(hub().big)); glide($("w-map")); all(); var n = 0, iv = setInterval(function () { draw(); if (++n > 12) clearInterval(iv); }, 40); }
    else if (b.id === "cog") { setOpen = !setOpen; all(); }
    else if (b.id === "closebar") close();
    else if (d.item) showItem(d.item);
    else if (d.key) showKey(d.key);
    else if (d.act) act(d.act);
    else if (d.have) { var x = RT.list().items[d.have]; if (x) { RT.setHave(d.have, x.have + (+d.d)); afterListChange(); } }
    else if (d.del) { RT.removeItem(d.del); afterListChange(); }
    else if (d.fq) { RT.toggleQuest(d.fq); fqq = ""; $("fq").value = ""; pinSig = ""; all(); }
    else if (d.fk) { RT.toggleKey(d.fk); pinSig = ""; all(); }
    else if (d.add) { RT.addItem(d.add, 1); addq = ""; $("addq").value = ""; afterListChange(); }
    else if (d.got) { var y = RT.list().items[d.got]; if (y) { RT.setHave(d.got, y.have + 1); afterListChange(); } else RTRoute.drop(d.got, function () { all(); }); }
    else if (d.drop) { RTRoute.drop(d.drop, function () { all(); }); }
    else if (d.bg) { RT.setSetting("bg", +d.bg); all(); }
    else if (d.size) { saveHub(function (h) { h.size = +d.size; }); all(); }
    else if (d.sw) { var v = !RT.settings()[d.sw]; RT.setSetting(d.sw, v); if (d.sw === "overlay") RT.invoke("show_overlay", { show: v }); if (d.sw === "gameOnly") RT.invoke("set_game_only", { on: v }); all(); }
    else if (b.id === "zin") zoomAt(1.4, cv.clientWidth / 2, cv.clientHeight / 2);
    else if (b.id === "zout") zoomAt(1 / 1.4, cv.clientWidth / 2, cv.clientHeight / 2);
    else if (b.id === "zfit") { view = { z: 1, dx: 0, dy: 0 }; draw(); }
  });
  document.addEventListener("toggle", function (e) { if (e.target.classList && e.target.classList.contains("more")) route.more = e.target.open; }, true);
  document.addEventListener("change", function (e) {
    var c = e.target;
    if (c.id === "region") { RT.setSetting("region", c.value); cond(); bar(); return; }
    if (c.id === "mapsel") { RT.setSetting("map", c.value); found = null; q = ""; $("q").value = ""; picking = false; var rt = RT.route(); if (rt && RTMap.mapOf(rt.k) !== c.value) RT.setSetting("mapView", "map"); all(); return; }
    if (c.dataset.obj) { var f = RT.follow(), fq = f.quests[c.dataset.obj]; if (fq) { var i = +c.dataset.i, at = fq.done.indexOf(i); if (c.checked && at < 0) fq.done.push(i); if (!c.checked && at > -1) fq.done.splice(at, 1); RT.saveFollow(f); quests(); } }
  });
  $("q").addEventListener("input", function () { q = this.value.trim(); if (found && found.q !== q) found = null; if (!q) view = { z: 1, dx: 0, dy: 0 }; over(); draw(); });
  $("addq").addEventListener("input", function () { addq = this.value.trim(); list(); });
  $("fq").addEventListener("input", function () { fqq = this.value.trim(); quests(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (setOpen) { setOpen = false; all(); } else if (picking) act("pickoff"); else if (q || found) clearFound(); else if (addq) { addq = ""; $("addq").value = ""; list(); } else close();
  });

  /* ---------- the map: zoom around the pointer, drag to pan, click a spawn to start a route ---------- */
  function zoomAt(f, mx, my) {
    if (!out) return;
    var p = [(mx - out.ox) / out.s, (my - out.oy) / out.s], z2 = Math.max(1, Math.min(10, view.z * f));
    if (z2 === view.z) return;
    var s2 = out.s * z2 / view.z, W = cv.clientWidth, H = cv.clientHeight;
    var cx = p[0] - (mx - W / 2) / s2, cy = p[1] - (my - H / 2) / s2;
    var bx = (W / 2 - out.ox) / out.s - view.dx, by = (H / 2 - out.oy) / out.s - view.dy;
    view.z = z2; view.dx = cx - bx; view.dy = cy - by; draw();
  }
  stage.addEventListener("wheel", function (e) { e.preventDefault(); var r = stage.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  var pan = null;
  function hitAt(e) { var r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; return out && out.hits && out.hits.filter(function (h) { return Math.hypot(h.q[0] - mx, h.q[1] - my) <= h.r + 2; })[0]; }
  stage.addEventListener("pointerdown", function (e) { if (e.target !== cv) return; pan = { x: e.clientX, y: e.clientY, moved: 0 }; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener("pointermove", function (e) {
    var r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (pan && out) { var dx = e.clientX - pan.x, dy = e.clientY - pan.y; pan.moved += Math.abs(dx) + Math.abs(dy); if (pan.moved > 4) { stage.classList.add("drag"); view.dx -= dx / out.s; view.dy -= dy / out.s; draw(); } pan.x = e.clientX; pan.y = e.clientY; tip.style.display = "none"; return; }
    var hit = e.target === cv && hitAt(e);
    if (hit && hit.t) { tip.textContent = hit.t; tip.style.display = "block"; tip.style.left = Math.min(mx + 14, r.width - 220) + "px"; tip.style.top = (my + 12) + "px"; } else tip.style.display = "none";
  });
  stage.addEventListener("pointerup", function (e) {
    var was = pan; pan = null; stage.classList.remove("drag");
    if (!was || was.moved > 4 || !picking) return;
    var hit = hitAt(e);
    if (hit && hit.spawn) { picking = false; view = { z: 1, dx: 0, dy: 0 }; RTRoute.start(key(), hit.spawn, function () { open("route", true); all(); }); }
  });
  stage.addEventListener("pointerleave", function () { tip.style.display = "none"; });

  /* ---------- drag a widget by its header ---------- */
  var mv = null;
  document.addEventListener("pointerdown", function (e) {
    var hd = e.target.closest(".wh"); if (!hd || EMBED || e.target.closest("button, input, select, label")) return;
    var el = hd.parentElement, r = el.getBoundingClientRect();
    mv = { el: el, k: el.id.slice(2), ox: e.clientX - r.left, oy: e.clientY - r.top }; el.classList.add("drag", "top");
    WIDS.forEach(function (o) { if ("w-" + o !== el.id) $("w-" + o).classList.remove("top"); });
    hd.setPointerCapture(e.pointerId); e.preventDefault();
  });
  document.addEventListener("pointermove", function (e) {
    if (!mv) return;
    var x = Math.max(8, Math.min(innerWidth - mv.el.offsetWidth - 8, e.clientX - mv.ox)), y = Math.max(8, Math.min(innerHeight - 60, e.clientY - mv.oy));
    mv.el.style.left = x + "px"; mv.el.style.top = y + "px"; mv.x = x; mv.y = y;
  });
  document.addEventListener("pointerup", function () {
    if (!mv) return; var m = mv; mv = null; m.el.classList.remove("drag");
    if (m.x != null && !(m.k === "map" && hub().big)) saveHub(function (h) { h.pos[m.k] = { x: m.x / innerWidth, y: m.y / innerHeight }; });
  });

  /* ---------- keep everything fresh ---------- */
  function regionsel() { var sel = $("region"), o = (RT.REGIONS || []).map(function (r) { return '<option value="' + r[0] + '">' + esc(r[1]) + "</option>"; }).join(""); if (sel.__o !== o) { sel.__o = o; sel.innerHTML = o; } sel.value = RT.settings().region; }
  function mapsel() { regionsel(); var sel = $("mapsel"), o = RT.MAP_ORDER.map(function (k) { return '<option value="' + k + '">' + esc(RT.SHORT[k]) + "</option>"; }).join(""); if (sel.__o !== o) { sel.__o = o; sel.innerHTML = o; } sel.value = RT.settings().map; }
  var allWas = all; all = function () { mapsel(); allWas(); };
  window.addEventListener("storage", function () { pinSig = ""; all(); });
  window.addEventListener("resize", function () { layout(); draw(); });
  // the route line marches only while the bar is open; pinned over the game it stands still, so it costs nothing
  if (!RTMap.calm) setInterval(function () { if (!PIN && routeOn() && !document.hidden && mapShown()) draw(); }, 40);
  setInterval(function () { bar(); cond(); }, 1000);
  if (T && !EMBED) T.event.listen("menu-open", function (e) { if (e.payload) { PIN = false; enter(); } else toPinned(); });
  enter();
  RT.load().then(function () {
    all();
    // the main window can open this page on one item or key (its "show on the map" buttons)
    var m = /[?&](item|key)=([^&]+)/.exec(location.search);
    if (m && !PIN) { if (m[1] === "item") showItem(decodeURIComponent(m[2])); else showKey(decodeURIComponent(m[2])); }
  }, all);
})();
