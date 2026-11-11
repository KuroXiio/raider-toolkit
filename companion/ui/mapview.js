/* The app's map: the same map pictures and markers as the interactive map on raidkits.com, drawn on a canvas.
   Pins for what you still need on your list, the keys and quests you follow, the extracts, and the route you
   sent from the site. Used by the overlay's map widget and by the big map window. Nothing here reads the game. */
(function () {
  "use strict";
  var MK = {}, WAIT = {}, IMG = {};
  // ARC wrecks and drones you loot (the site's route planner leaves these out of routes, so the pins do too)
  var ARC_SUB = { baron_husk: 1, wasp_husk: 1, rocketeer_husk: 1, arc_husk: 1, deforester_husk: 1, arc_courier: 1, arc_probe: 1 };
  var COL = { list: "#5ff2ea", key: "#ffc400", quest: "#ff7ab6", ext: "#ffc400", ink: "#0c0916", done: "#5a5672", fg: "#ece9f5" };

  function D() { return RT.data() || {}; }
  function files(k) { return (D().mapfiles || {})[k] || null; }
  function types() { return (D().mf || {}).types || []; }
  /* the picture to use for a map: Stella Montis has two floors */
  function keyOf(map, floor) { return map === "stella" ? "stella_" + (floor === "l" ? "l" : "u") : map; }
  function mapOf(key) { return String(key || "").indexOf("stella_") === 0 ? "stella" : key; }

  function markers(key, cb) {
    if (MK[key]) return cb(MK[key]);
    var f = files(key); if (!f || !f.mk) return cb(null);
    if (WAIT[key]) { WAIT[key].push(cb); return; }
    WAIT[key] = [cb];
    fetch(RT.SITE + f.mk).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) { MK[key] = d; }, function () { MK[key] = null; })
      .then(function () { var l = WAIT[key]; delete WAIT[key]; l.forEach(function (fn) { fn(MK[key]); }); });
  }
  /* true when the picture is ready; otherwise starts loading it and calls cb once it has */
  function image(key, cb) {
    var f = files(key); if (!f) return false;
    var im = IMG[key];
    if (im && im.complete && im.naturalWidth) return true;
    if (!im) { im = IMG[key] = new Image(); im.decoding = "async"; im.src = RT.SITE + f.img; }
    if (cb) im.addEventListener("load", function () { cb(im); }, { once: true });
    return false;
  }

  function isArc(r) {
    var t = types()[r[2]]; if (!t) return false;
    return t[0] === "arc" || !!ARC_SUB[t[1]] || (t[0] === "containers" && !!r[4] && !(r[4] & ~4096));
  }
  function itemMatch(id) {
    var it = RT.item(id); if (!it || !(it.st || it.la)) return null;
    var ts = {}; (it.st || []).forEach(function (x) { ts[x] = 1; });
    var T = types();
    return function (r) { return !!ts[r[2]] || !!(it.la && r[4] && (r[4] & it.la) && T[r[2]] && T[r[2]][0] === "containers"); };
  }
  function typeIdx(k) { var o = {}; types().forEach(function (t, i) { if (t[0] + ":" + t[1] === k) o[i] = 1; }); return o; }

  /* everything to draw on one map picture, in map units (the picture's own pixels) */
  function pins(key, data) {
    var s = RT.settings(), out = { list: [], keys: [], quests: [], ext: [] }; if (!data) return out;
    var l = RT.list(), map = mapOf(key);
    var want = l.order.filter(function (id) { var x = l.items[id]; return x && x.have < x.need; });
    var M = want.map(function (id) { return [id, itemMatch(id)]; }).filter(function (x) { return x[1]; });
    var ex = Object.assign(typeIdx("locations:extraction"), typeIdx("locations:metro_entrance"));
    var f = RT.follow(), Q = Object.keys(f.quests).map(RT.quest).filter(function (q) { return q && q.mt; });
    // items that also lie around show only those spots; items that only drop from ARC show where the ARC are
    var lootOnly = {};
    M.forEach(function (x) { lootOnly[x[0]] = data.m.some(function (r) { return !isArc(r) && x[1](r); }); });
    data.m.forEach(function (r, i) {
      if (ex[r[2]]) out.ext.push({ p: [r[0], r[1]], n: (data.n && data.n[i]) || "Extract" });
      if (M.length) { var arc = isArc(r), who = M.filter(function (x) { return (!arc || !lootOnly[x[0]]) && x[1](r); }).map(function (x) { return x[0]; }); if (who.length) out.list.push({ p: [r[0], r[1]], ids: who }); }
      Q.forEach(function (q) { if (q.mt.indexOf(r[2]) > -1) out.quests.push({ p: [r[0], r[1]], id: q.id, n: q.n }); });
    });
    f.keys.map(RT.key).forEach(function (k) { if (k && Array.isArray(k.pin) && k.pin[0] === key) out.keys.push({ p: [k.pin[1], k.pin[2]], id: k.id, n: k.n }); });
    out.map = map;
    return out;
  }
  /* pins closer than r map units become one pin, so a small map never turns into a carpet of dots */
  function cluster(list, r) {
    var out = [];
    list.forEach(function (x) {
      for (var i = 0; i < out.length; i++) { var c = out[i]; if (Math.abs(c.p[0] - x.p[0]) < r && Math.abs(c.p[1] - x.p[1]) < r) { c.n++; (x.ids || []).forEach(function (id) { if (c.ids.indexOf(id) < 0) c.ids.push(id); }); return; } }
      out.push({ p: x.p.slice(), n: 1, ids: (x.ids || []).slice(), name: x.n || "" });
    });
    return out;
  }

  /* the part of the picture worth showing: around the extracts (they ring the playable area) and your pins */
  function extent(pn) {
    if (!pn) return null;
    var ps = pn.ext.map(function (e) { return e.p; }).concat(pn.list.map(function (e) { return e.p; }), pn.keys.map(function (e) { return e.p; }), pn.quests.map(function (e) { return e.p; }));
    return ps.length > 1 ? ps : null;
  }

  /* ---------- the route sent from the site ---------- */
  function route() { var r = RT.route(); return r && files(r.k) ? r : null; }

  /* draw: the whole picture fitted into the canvas (view.z = 1), or zoomed and panned (view.z, view.cx, view.cy: the centre in map units) */
  function draw(cv, o) {
    o = o || {};
    var key = o.key, f = files(key), dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = cv.clientWidth, H = cv.clientHeight; if (!W || !H || !f) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    x.fillStyle = "#151224"; x.fillRect(0, 0, W, H);
    var R = o.r || 6, v = o.view || {}, z = v.z || 1, base = Math.min(W / f.w, H / f.h), s = base * z;
    var cx = f.w / 2 + (v.dx || 0), cy = f.h / 2 + (v.dy || 0);
    if (o.fit && o.fit.length) {   // zoom to the route
      var xs = o.fit.map(function (p) { return p[0]; }), ys = o.fit.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), pad = 14 + R;
      s = Math.min(base * 4, Math.max(base, Math.min((W - pad * 2) / Math.max(60, x1 - x0), (H - pad * 2) / Math.max(60, y1 - y0)))) * z;
      cx = (x0 + x1) / 2 + (v.dx || 0); cy = (y0 + y1) / 2 + (v.dy || 0);
    }
    var ox = W / 2 - cx * s, oy = H / 2 - cy * s, P = function (p) { return [ox + p[0] * s, oy + p[1] * s]; };
    o.out = { s: s, ox: ox, oy: oy };
    var im = IMG[key];
    if (im && im.complete && im.naturalWidth) { x.globalAlpha = o.dim == null ? 0.82 : o.dim; x.drawImage(im, ox, oy, f.w * s, f.h * s); x.globalAlpha = 1; }
    var pn = o.pins, L = o.layers || { list: 1, keys: 1, quests: 1, ext: 1 };
    x.lineWidth = 1.5; x.strokeStyle = COL.ink;
    var hits = [];
    if (pn && !o.routeOnly) {
      var cr = (o.cluster || 14) / s;
      if (L.ext) pn.ext.forEach(function (e) { var q = P(e.p); badge(x, q, R + 3, COL.ext, "E", COL.ink); hits.push({ q: q, r: R + 4, t: e.n }); });
      if (L.list) cluster(pn.list, cr).forEach(function (c) { var q = P(c.p); dot(x, q, c.n > 1 ? R + 1 : R, COL.list); hits.push({ q: q, r: R + 2, t: c.ids.map(function (id) { return (RT.item(id) || {}).n; }).join(", ") + (c.n > 1 ? " (" + c.n + " spots)" : "") }); });
      if (L.quests) cluster(pn.quests, cr).forEach(function (c) { var q = P(c.p); tri(x, q, R + 2, COL.quest); hits.push({ q: q, r: R + 3, t: c.name }); });
      if (L.keys) pn.keys.forEach(function (k) { var q = P(k.p); sq(x, q, R + 2, COL.key); hits.push({ q: q, r: R + 3, t: k.n }); });
    }
    if (o.route) { o.route.dash = o.dash || 0; drawRoute(x, o.route, P, o.at || 0, R + 4); }
    o.out.hits = hits;
  }
  function dot(x, q, r, c) { x.beginPath(); x.arc(q[0], q[1], r, 0, 6.2832); x.fillStyle = c; x.fill(); x.stroke(); }
  function sq(x, q, r, c) { x.beginPath(); x.roundRect ? x.roundRect(q[0] - r, q[1] - r, r * 2, r * 2, 2) : x.rect(q[0] - r, q[1] - r, r * 2, r * 2); x.fillStyle = c; x.fill(); x.stroke(); }
  function tri(x, q, r, c) { x.beginPath(); x.moveTo(q[0], q[1] - r); x.lineTo(q[0] + r, q[1] + r * 0.8); x.lineTo(q[0] - r, q[1] + r * 0.8); x.closePath(); x.fillStyle = c; x.fill(); x.stroke(); }
  function badge(x, q, r, bg, t, fg, ring) {
    x.beginPath(); x.arc(q[0], q[1], r, 0, 6.2832); x.fillStyle = bg; x.fill();
    if (ring) { x.lineWidth = 1.5; x.strokeStyle = ring; x.stroke(); x.strokeStyle = COL.ink; }
    x.fillStyle = fg; x.font = "700 " + Math.round(r * 1.05) + "px 'JetBrains Mono', monospace"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(t, q[0], q[1] + 0.5);
  }
  /* the route: a dotted line, S at the start, numbered stops (done ones grey, the next one big and bright), E at the extract */
  function drawRoute(x, rt, P, at, r) {
    var pts = [rt.spawn].concat(rt.stops.map(function (s) { return s.p; })).concat(rt.end ? [rt.end.p] : []).map(P);
    x.save(); x.setLineDash([2, 6]); x.lineDashOffset = -(rt.dash || 0); x.lineCap = "round"; x.lineWidth = 2.5; x.strokeStyle = COL.list; x.beginPath();
    pts.forEach(function (q, i) { if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); }); x.stroke(); x.restore();
    x.lineWidth = 1.5; x.strokeStyle = COL.ink;
    badge(x, pts[0], r, COL.fg, "S", COL.ink);
    rt.stops.forEach(function (s, i) {
      var q = pts[i + 1], n = String(i + 1);
      if (i < at) badge(x, q, r, COL.done, n, COL.fg);
      else if (i === at) badge(x, q, r + 3, COL.list, n, COL.ink);
      else badge(x, q, r, "#2b2740", n, COL.fg, COL.list);
    });
    if (rt.end) badge(x, pts[pts.length - 1], r + 1, COL.ext, "E", COL.ink);
  }

  /* where the route line's dashes are now: they march from stop to stop (still for people who asked for less motion) */
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function dash() { return calm ? 0 : (performance.now() / 60) % 8; }

  window.RTMap = { dash: dash, calm: calm, extent: extent, keyOf: keyOf, mapOf: mapOf, files: files, markers: markers, image: image, pins: pins, draw: draw, route: route, COL: COL };
})();
