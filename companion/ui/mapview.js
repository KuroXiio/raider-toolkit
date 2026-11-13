/* The app's map: the same map pictures and markers as the interactive map on raidkits.com, drawn on a canvas.
   Pins for what you still need on your list, the keys and quests you follow, the extracts, and the route you
   sent from the site. Used by the overlay's map widget and by the big map window. Nothing here reads the game. */
(function () {
  "use strict";
  var MK = {}, WAIT = {}, IMG = {};
  // ARC wrecks and drones you loot (the site's route planner leaves these out of routes, so the pins do too)
  var ARC_SUB = { baron_husk: 1, wasp_husk: 1, rocketeer_husk: 1, arc_husk: 1, deforester_husk: 1, arc_courier: 1, arc_probe: 1 };
  // the same look as the site's map: cream places (return points filled), amber for keys and quests, your list in mint
  var COL = { list: "#5ff2ea", key: "#ffc24b", quest: "#ffc24b", ext: "#f1ece1", ink: "#12131c", done: "#5a5672", fg: "#f1ece1", bg: "rgba(13,14,22,.92)" };
  var GL = { ext: "M12 16.5V6M7.5 10.5 12 6l4.5 4.5M7 19.5h10", key: "M7 11h10v8H7zM9 11V8.5a3 3 0 0 1 6 0V11M12 14v2", quest: "M8.5 19.5V5M8.5 5.5h8l-2 3.2 2 3.3h-8", spn: "M12 5.5a2.3 2.3 0 1 1 0 4.6a2.3 2.3 0 1 1 0-4.6zM7.5 19c0-4 2-6 4.5-6s4.5 2 4.5 6" };
  /* a marker like the site's: sh "fill" (filled circle), "ring" or "hex"; the glyph is left out when it would be too small to read */
  function mark(x, q, r, sh, c, g) {
    x.save(); x.lineJoin = "round"; x.beginPath();
    if (sh === "hex") { for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; x[k ? "lineTo" : "moveTo"](q[0] + Math.cos(a) * r * 1.06, q[1] + Math.sin(a) * r * 1.06); } x.closePath(); }
    else x.arc(q[0], q[1], r, 0, 6.2832);
    x.lineWidth = 2.6; x.strokeStyle = "rgba(6,7,12,.75)"; x.stroke();
    x.fillStyle = sh === "fill" ? c : COL.bg; x.fill();
    if (sh !== "fill") { x.lineWidth = Math.max(1.2, r / 6.5); x.strokeStyle = c; x.stroke(); }
    if (r >= 7.5 && window.Path2D) { var sc = r * 2 / 24 * 0.72; x.translate(q[0] - 12 * sc, q[1] - 12 * sc); x.scale(sc, sc); x.lineWidth = sh === "fill" ? 2.6 : 2.2; x.lineCap = "round"; x.strokeStyle = sh === "fill" ? COL.ink : c; x.stroke(new Path2D(g)); }
    else if (sh !== "fill") { x.beginPath(); x.arc(q[0], q[1], r * 0.36, 0, 6.2832); x.fillStyle = c; x.fill(); }
    x.restore();
  }
  /* area names, like the in-game map: small spaced capitals; the smaller ones show once you are zoomed in */
  function areas(x, key, P, zoom, W, H) {
    var list = (D().areas || {})[key]; if (!list) return;
    var fs = Math.max(9, Math.min(13, 8.5 + zoom * 1.1)), boxes = [];
    x.save(); x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
    try { x.letterSpacing = (fs * 0.16).toFixed(1) + "px"; } catch (e) {}
    [1, 2].forEach(function (tier) {
      if (tier === 2 && (zoom < 1.45 || W < 520)) return;
      var f = tier === 1 ? fs : fs - 1.5; x.font = "700 " + f + "px Urbanist, 'Segoe UI', system-ui, sans-serif";
      list.forEach(function (a) {
        if (a[3] !== tier) return;
        var q = P([a[1], a[2]]), px = q[0], py = q[1] + 14; if (px < -60 || py < -20 || px > W + 60 || py > H + 20) return;
        var words = a[0].toUpperCase().split(" "), lines = [words[0]];
        for (var k = 1; k < words.length; k++) { if ((lines[lines.length - 1] + " " + words[k]).length <= 13) lines[lines.length - 1] += " " + words[k]; else lines.push(words[k]); }
        var w = 0; lines.forEach(function (l) { w = Math.max(w, x.measureText(l).width); });
        var h = lines.length * f * 1.22, b = [px - w / 2 - 5, py - h / 2 - 2, px + w / 2 + 5, py + h / 2 + 2];
        for (var n = 0; n < boxes.length; n++) if (b[0] < boxes[n][2] && b[2] > boxes[n][0] && b[1] < boxes[n][3] && b[3] > boxes[n][1]) return;
        boxes.push(b);
        lines.forEach(function (l, i) { var ly = py - h / 2 + f * 0.61 + i * f * 1.22; x.lineWidth = 3; x.strokeStyle = "rgba(6,7,12,.82)"; x.strokeText(l, px, ly); x.fillStyle = tier === 1 ? "rgba(241,236,225,.96)" : "rgba(241,236,225,.78)"; x.fillText(l, px, ly); });
      });
    });
    x.restore();
  }

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
    if (o.found) {
      // a search: only where that item or key is, nothing else in the way
      var fc = (o.cluster || 14) / s;
      if (o.found.kind === "key") o.found.pts.forEach(function (p) { var q = P(p); x.save(); x.beginPath(); x.arc(q[0], q[1], R + 11, 0, 6.2832); x.fillStyle = "rgba(255,194,75,.22)"; x.fill(); x.restore(); mark(x, q, R + 5, "ring", COL.key, GL.key); hits.push({ q: q, r: R + 6, t: o.found.name }); });
      else cluster(o.found.pts.map(function (p) { return { p: p, ids: [] }; }), fc).forEach(function (c) { var q = P(c.p); x.save(); x.beginPath(); x.arc(q[0], q[1], R + 6, 0, 6.2832); x.fillStyle = "rgba(95,242,234,.2)"; x.fill(); x.restore(); sq(x, q, c.n > 1 ? R : R - 1, COL.list); hits.push({ q: q, r: R + 3, t: o.found.name + (c.n > 1 ? " (" + c.n + " spots)" : "") }); });
      if (pn && L.ext) pn.ext.forEach(function (e) { var q = P(e.p); x.save(); x.globalAlpha = .7; mark(x, q, R + 2, "fill", COL.ext, GL.ext); x.restore(); });
    } else if (o.spawns) {
      // choosing where you spawned: only spawn points, big enough to click
      o.spawns.forEach(function (p) { var q = P(p); x.save(); x.beginPath(); x.arc(q[0], q[1], R + 9, 0, 6.2832); x.fillStyle = "rgba(241,236,225,.16)"; x.fill(); x.restore(); mark(x, q, R + 5, "ring", COL.ext, GL.spn); hits.push({ q: q, r: R + 9, t: "I spawned here", spawn: p }); });
    } else if (pn && !o.routeOnly) {
      var cr = (o.cluster || 14) / s;
      if (L.ext) pn.ext.forEach(function (e) { var q = P(e.p); mark(x, q, R + 4, "fill", COL.ext, GL.ext); hits.push({ q: q, r: R + 5, t: e.n }); });
      if (L.list) cluster(pn.list, cr).forEach(function (c) { var q = P(c.p); dot(x, q, c.n > 1 ? R + 1 : R, COL.list); hits.push({ q: q, r: R + 2, t: c.ids.map(function (id) { return (RT.item(id) || {}).n; }).join(", ") + (c.n > 1 ? " (" + c.n + " spots)" : "") }); });
      if (L.quests) cluster(pn.quests, cr).forEach(function (c) { var q = P(c.p); mark(x, q, R + 3, "hex", COL.quest, GL.quest); hits.push({ q: q, r: R + 3, t: c.name }); });
      if (L.keys) pn.keys.forEach(function (k) { var q = P(k.p); mark(x, q, R + 3, "ring", COL.key, GL.key); hits.push({ q: q, r: R + 3, t: k.n }); });
    }
    if (o.names !== false && W >= 260) areas(x, key, P, s / base, W, H);
    if (o.route && !o.found && !o.spawns) { o.route.dash = o.dash || 0; drawRoute(x, o.route, P, o.at || 0, R + 4); }
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
    if (rt.end) mark(x, pts[pts.length - 1], r + 1, "fill", COL.ext, GL.ext);
  }

  /* where the route line's dashes are now: they march from stop to stop (still for people who asked for less motion) */
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function dash() { return calm ? 0 : (performance.now() / 60) % 8; }

  /* where one item is found on a map (loot spots first; ARC only when nothing else has it), and the map's spawn points */
  function spots(data, id) {
    var m = itemMatch(id); if (!m || !data) return [];
    var loot = [], arc = []; data.m.forEach(function (r) { if (m(r)) (isArc(r) ? arc : loot).push([r[0], r[1]]); });
    return loot.length ? loot : arc;
  }
  function spawns(data) { var sp = typeIdx("locations:player_spawn"), o = []; if (data) data.m.forEach(function (r) { if (sp[r[2]]) o.push([r[0], r[1]]); }); return o; }
  window.RTMap = { spots: spots, spawns: spawns, itemMatch: itemMatch, isArc: isArc, typeIdx: typeIdx, types: types, dash: dash, calm: calm, extent: extent, keyOf: keyOf, mapOf: mapOf, files: files, markers: markers, image: image, pins: pins, draw: draw, route: route, COL: COL };
})();
