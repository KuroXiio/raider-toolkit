/* The big map: the same map as the overlay's map card, but large, with zoom, pan, layers and the route's stops.
   It is used in two places: as the in-game menu (bigmap.html?hub=1, a dimmed layer over the game that opens with the
   menu keybind and also has your list, quests and keys), and inside the main window's Map page (bigmap.html?embed=1). */
(function () {
  "use strict";
  var esc = RT.esc, $ = function (id) { return document.getElementById(id); };
  var HUB = /hub=1/.test(location.search), EMBED = /embed=1/.test(location.search), stab = "map";
  var cv = $("cv"), stage = $("stage"), tip = $("tip"), view = { z: 1, dx: 0, dy: 0 }, lastKey = "", pins = null, pinSig = "", out = null;

  function key() { var s = RT.settings(), rt = RT.route(); return s.mapView === "route" && rt ? rt.k : RTMap.keyOf(s.map, s.floor); }
  function routeOn() { return RT.settings().mapView === "route" && !!RT.route(); }

  function draw() {
    var s = RT.settings(), k = key(), rt = RT.route(), on = routeOn();
    if (k !== lastKey) { lastKey = k; view = { z: 1, dx: 0, dy: 0 }; }
    $("wait").hidden = !!(RTMap.files(k) && pins);
    if (!RTMap.files(k)) { $("wait").textContent = RT.data() ? "No map picture for this map yet." : "Loading the map…"; return; }
    RTMap.image(k, function () { draw(); });
    RTMap.markers(k, function (data) {
      var sig = k + "|" + localStorage.getItem("rtc-list") + "|" + localStorage.getItem("rtc-follow");
      if (sig !== pinSig) { pinSig = sig; pins = RTMap.pins(k, data); side(); }
      $("wait").hidden = true;
      var o = { key: k, pins: pins, layers: s.layers, r: 6, cluster: 16, view: view, dim: 0.9,
        route: on ? rt : null, at: RT.routeAt(),
        fit: on ? [rt.spawn].concat(rt.stops.map(function (x) { return x.p; })).concat(rt.end ? [rt.end.p] : []) : RTMap.extent(pins) };
      RTMap.draw(cv, o); out = o.out; out.fit = o.fit;
    });
  }

  function header() {
    var s = RT.settings(), now = Date.now(), c = RT.data() ? RT.condition(s.map, s.region, now) : null, on = !!(c && c.cur);
    $("dot").className = "dot" + (on ? " on" : "");
    $("title").textContent = RT.mapName(routeOn() ? RTMap.mapOf(RT.route().k) : s.map);
    $("chip").textContent = c ? c.cur || "Quiet" : "…"; $("chip").className = "chip" + (on ? "" : " off");
    $("next").innerHTML = !c ? "" : on ? esc(c.cur) + ' ends in <span class="mono">' + RT.clock(c.ends - now) + "</span>" : c.next ? "Next · " + esc(c.next) + ' <span class="mono">' + RT.clock(c.at - now) + "</span>" : "";
    var st = s.map === "stella" && !routeOn(); $("floor").hidden = !st;
    $("floor").querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.floor === (s.floor === "l" ? "l" : "u"))); });
    var sel = $("mapsel");
    var opts = RT.MAP_ORDER.map(function (k) { return '<option value="' + k + '">' + esc(RT.mapName(k)) + "</option>"; }).join("");
    if (sel.__o !== opts) { sel.__o = opts; sel.innerHTML = opts; }
    sel.value = s.map; sel.disabled = routeOn();
  }

  function tabsHtml() {
    var f = RT.follow(), l = RT.list(), left = l.order.filter(function (id) { var x = l.items[id]; return x && x.have < x.need; }).length;
    return '<div class="tabs" role="tablist">' + [["map", "Map"], ["list", "List" + (left ? " " + left : "")], ["quests", "Quests" + (Object.keys(f.quests).length ? " " + Object.keys(f.quests).length : "")], ["keys", "Keys" + (f.keys.length ? " " + f.keys.length : "")]]
      .map(function (x) { return '<button type="button" role="tab" data-stab="' + x[0] + '" aria-selected="' + (stab === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>";
  }
  function listTab() {
    var s = RT.settings(), l = RT.list(), ids = l.order.filter(function (id) { return l.items[id] && RT.item(id); });
    var here = s.onlyMap ? ids.filter(function (id) { return RT.onMap(id, s.map); }) : ids;
    var h = '<div class="h">' + (s.onlyMap ? "Your list · on " + esc(RT.mapName(s.map)) : "Your list") + "</div>";
    if (!ids.length) return h + '<div class="note">Your list is empty. Build it in Raider Toolkit or on raidkits.com.</div>';
    if (!here.length) h += '<div class="note">Nothing on your list is found on this map.</div>';
    h += here.map(function (id) { var x = l.items[id], dn = x.have >= x.need; return '<div class="li' + (dn ? " dn" : "") + '"><span>' + esc(RT.item(id).n) + '</span><span class="q"><button type="button" data-have="' + esc(id) + '" data-d="-1" aria-label="One less">−</button>' + x.have + "/" + x.need + '<button type="button" data-have="' + esc(id) + '" data-d="1" aria-label="One more">+</button></span></div>'; }).join("");
    if (s.onlyMap && ids.length > here.length) h += '<div class="note">' + (ids.length - here.length) + " more on other maps.</div>";
    return h;
  }
  function questsTab() {
    var f = RT.follow(), qs = Object.keys(f.quests).map(RT.quest).filter(Boolean);
    if (!qs.length) return '<div class="h">Quests</div><div class="note">Follow a quest in Raider Toolkit (Quests) to tick off its objectives here.</div>';
    return '<div class="h">Quests you follow</div>' + qs.map(function (q) {
      var done = f.quests[q.id].done || [];
      return '<div class="grp"><div class="qn">' + esc(q.n) + "</div>" + (q.o || []).map(function (o, i) { var d = done.indexOf(i) > -1; return '<label class="ob' + (d ? " dn" : "") + '"><input type="checkbox" data-obj="' + esc(q.id) + '" data-i="' + i + '"' + (d ? " checked" : "") + "><span>" + esc(o) + "</span></label>"; }).join("") + "</div>";
    }).join('<div class="line"></div>');
  }
  function keysTab() {
    var ks = RT.follow().keys.map(RT.key).filter(Boolean);
    if (!ks.length) return '<div class="h">Keys</div><div class="note">Star a key in Raider Toolkit (Keys) to see its door here and on the map.</div>';
    return '<div class="h">Keys you follow</div>' + ks.map(function (k) { return '<div class="grp"><div class="qn">' + esc(k.n) + ' <span class="note">· ' + esc(RT.SHORT[k.mk] || k.mk || "") + '</span></div><div class="note" style="font-size:13px;color:#d6d3e6">' + esc(k.door || "") + "</div></div>"; }).join('<div class="line"></div>');
  }
  function side() {
    if (EMBED) stab = "map";
    if (stab !== "map") { $("side").innerHTML = tabsHtml() + (stab === "list" ? listTab() : stab === "quests" ? questsTab() : keysTab()); return; }
    var s = RT.settings(), L = s.layers, rt = RT.route(), at = RT.routeAt(), h = tabsHtml();
    var counts = pins ? { list: new Set([].concat.apply([], pins.list.map(function (x) { return x.ids; }))).size, keys: pins.keys.length, quests: new Set(pins.quests.map(function (x) { return x.id; })).size } : { list: 0, keys: 0, quests: 0 };
    if (rt) {
      var stop = rt.stops[at];
      h += '<div class="grp"><div class="h hi">' + (routeOn() ? (stop ? "Next stop · " + (at + 1) + " of " + rt.stops.length : "Last stop: extract") : "Your route") + "</div>";
      if (routeOn()) {
        h += '<div class="stop">' + esc(stop ? stop.w || "Stop " + (at + 1) : (rt.end && rt.end.n) || "Extract") + "</div>" +
          (stop && stop.ids && stop.ids.length ? '<div class="sub">' + esc(stop.ids.map(function (id) { return (RT.item(id) || {}).n || id; }).join(", ")) + "</div>" : "") +
          '<div class="btns"><button type="button" class="b go" data-act="next">' + (stop ? "Stop done" : "Done") + '</button><button type="button" class="b" data-act="prev">Back</button></div>' +
          '<div class="btns"><button type="button" class="b" data-act="route">Hide route</button><button type="button" class="b" data-act="clear">Remove route</button></div>';
      } else {
        h += '<div class="row"><span>' + esc(RT.mapName(RTMap.mapOf(rt.k))) + '</span><span class="mono">' + rt.stops.length + " stops</span></div>" +
          '<div class="btns"><button type="button" class="b go" data-act="route">Show route</button></div>';
      }
      h += "</div><div class=\"line\"></div>";
    }
    h += '<div class="grp"><div class="h">Show on map</div>' +
      ck("list", "l", "Shopping list", counts.list) + ck("keys", "k", "Keys you follow", counts.keys) + ck("quests", "q", "Quests you follow", counts.quests) + ck("ext", "e", "Extracts", null) + "</div>";
    var l = RT.list(), here = l.order.filter(function (id) { var x = l.items[id]; return x && x.have < x.need && RT.item(id) && RT.onMap(id, s.map); });
    h += '<div class="line"></div><div class="grp"><div class="h">Still needed here</div>' +
      (here.length ? here.slice(0, 14).map(function (id) { var x = l.items[id]; return '<div class="row"><span>' + esc(RT.item(id).n) + '</span><span class="mono">' + x.have + "/" + x.need + "</span></div>"; }).join("") + (here.length > 14 ? '<div class="note">+' + (here.length - 14) + " more</div>" : "")
        : '<div class="note">Nothing on your list is found on this map.</div>') + "</div>";
    if (!rt) h += '<div class="line"></div><div class="note">Plan a route on raidkits.com and press <b>Send to app</b> to walk it here, stop by stop.</div>';
    var k = s.keys || {};
    h += '<div class="sp"></div><div class="note">Scroll to zoom, drag to move. In game: ' + esc(k.route || "") + " shows the route, " + esc(k.next || "") + " ticks off a stop.</div>";
    $("side").innerHTML = h;
    function ck(k2, sw, label, n) { return '<label class="ck"><input type="checkbox" data-layer="' + k2 + '"' + (L[k2] ? " checked" : "") + '><span class="sw ' + sw + '"></span>' + label + (n != null ? " · " + n : "") + "</label>"; }
  }

  function act(a) {
    var s = RT.settings(), rt = RT.route();
    if (a === "route" && rt) { var v = s.mapView === "route" ? "map" : "route"; RT.setSetting("mapView", v); RT.setSetting("lastView", v); }
    if ((a === "next" || a === "prev") && rt) RT.setRouteAt(RT.routeAt() + (a === "next" ? 1 : -1));
    if (a === "clear") { RT.setRoute(null); RT.setSetting("mapView", "map"); }
    all();
  }
  function all() { document.documentElement.style.setProperty("--pa", RT.settings().panelBg); header(); side(); draw(); }

  /* zoom around the pointer, drag to pan */
  function zoomAt(f, mx, my) {
    if (!out) return;
    var p = [(mx - out.ox) / out.s, (my - out.oy) / out.s], z2 = Math.max(1, Math.min(10, view.z * f));
    if (z2 === view.z) return;
    var s2 = out.s * z2 / view.z, W = cv.clientWidth, H = cv.clientHeight;
    // keep the point under the pointer where it is: centre = p - (m - W/2) / s2
    var cx = p[0] - (mx - W / 2) / s2, cy = p[1] - (my - H / 2) / s2, c0 = [out.ox, out.oy];
    var bx = (W / 2 - c0[0]) / out.s - view.dx, by = (H / 2 - c0[1]) / out.s - view.dy;   // the fitted centre
    view.z = z2; view.dx = cx - bx; view.dy = cy - by; draw();
  }
  stage.addEventListener("wheel", function (e) { e.preventDefault(); var r = stage.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  var drag = null;
  stage.addEventListener("pointerdown", function (e) { if (e.target.closest(".zoom")) return; drag = { x: e.clientX, y: e.clientY }; stage.classList.add("drag"); stage.setPointerCapture(e.pointerId); });
  stage.addEventListener("pointermove", function (e) {
    var r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (drag && out) { view.dx -= (e.clientX - drag.x) / out.s; view.dy -= (e.clientY - drag.y) / out.s; drag = { x: e.clientX, y: e.clientY }; draw(); tip.style.display = "none"; return; }
    var hit = out && out.hits && out.hits.filter(function (h) { return Math.hypot(h.q[0] - mx, h.q[1] - my) <= h.r + 2; })[0];
    if (hit && hit.t) { tip.textContent = hit.t; tip.style.display = "block"; tip.style.left = Math.min(mx + 14, r.width - 290) + "px"; tip.style.top = (my + 12) + "px"; } else tip.style.display = "none";
  });
  stage.addEventListener("pointerup", function () { drag = null; stage.classList.remove("drag"); });
  stage.addEventListener("pointerleave", function () { tip.style.display = "none"; });
  $("zin").addEventListener("click", function () { zoomAt(1.4, cv.clientWidth / 2, cv.clientHeight / 2); });
  $("zout").addEventListener("click", function () { zoomAt(1 / 1.4, cv.clientWidth / 2, cv.clientHeight / 2); });
  $("zfit").addEventListener("click", function () { view = { z: 1, dx: 0, dy: 0 }; draw(); });

  function hide() { if (HUB) RT.invoke("toggle_menu", { open: false }); }
  function hint() {
    var s = RT.settings();
    $("hint").innerHTML = "<span><kbd>" + esc(s.hotkey || "Esc") + "</kbd> or <kbd>Esc</kbd> back to the game (or click the game)</span><span>Drag the overlay cards to move them · ⇱ unpins one</span><span><kbd>" + esc(s.hotkeyOverlay || "") + '</kbd> hides the overlay</span><button type="button" id="openapp">Open Raider Toolkit</button>';
  }
  if (HUB) {
    hint();
    $("hint").addEventListener("click", function (e) { if (e.target.id === "openapp") { hide(); RT.invoke("open_panel"); } });
  }
  $("close").addEventListener("click", hide);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
  $("mapsel").addEventListener("change", function (e) { RT.setSetting("map", e.target.value); all(); });
  $("floor").addEventListener("click", function (e) { var b = e.target.closest("[data-floor]"); if (b) { RT.setSetting("floor", b.dataset.floor); all(); } });
  $("side").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.stab) { stab = b.dataset.stab; side(); return; }
    if (b.dataset.have) { var x = RT.list().items[b.dataset.have]; if (x) RT.setHave(b.dataset.have, x.have + (+b.dataset.d)); pinSig = ""; all(); return; }
    if (b.dataset.act) act(b.dataset.act);
  });
  $("side").addEventListener("change", function (e) {
    var c = e.target;
    if (c.dataset.obj) { var f = RT.follow(), fq = f.quests[c.dataset.obj]; if (fq) { var i = +c.dataset.i, at = fq.done.indexOf(i); if (c.checked && at < 0) fq.done.push(i); if (!c.checked && at > -1) fq.done.splice(at, 1); RT.saveFollow(f); side(); } return; }
    if (!c.dataset.layer) return;
    var s = RT.settings(); s.layers[c.dataset.layer] = c.checked; RT.setSetting("layers", s.layers); draw();
  });
  window.addEventListener("storage", function () { if (HUB) hint(); all(); });
  window.addEventListener("resize", draw);
  setInterval(header, 1000);
  all();
  RT.load().then(all, all);
})();
