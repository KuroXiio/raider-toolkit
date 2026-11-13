/* Planning a route inside the app: the same idea as the route planner on raidkits.com.
   Every container is a roll of the dice, so stops are added one at a time where they give the best chance at what you
   still need for the least extra walking, and it stops adding once every item is likely enough.
   A route made here is tied to your shopping list: it is planned from what is still missing, and planned again when
   that changes. A route sent from the site is left exactly as it was sent. */
(function () {
  "use strict";
  var Q = { Common: 0.1, Uncommon: 0.06, Rare: 0.035, Epic: 0.018, Legendary: 0.008 };
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function U(E, T) { return 1 - Math.exp(-1.6 * E / T); }

  /* what a route on this map should look for: missing list items found here, plus items added only to the route */
  function wanted(map, extra, got) {
    var l = RT.list(), out = [], seen = {};
    l.order.forEach(function (id) { var x = l.items[id]; if (x && x.have < x.need && RT.item(id) && RT.onMap(id, map)) { out.push({ id: id, n: x.need - x.have, list: true }); seen[id] = 1; } });
    (extra || []).forEach(function (id) { if (!seen[id] && RT.item(id)) { out.push({ id: id, n: 1, list: false }); seen[id] = 1; } });
    return out.filter(function (x) { return (got || []).indexOf(x.id) < 0; });
  }

  /* opt: { extra: [ids], got: [ids], keep: [stops already reached], from: [x, y], max: 20 } */
  function plan(key, data, spawn, opt) {
    opt = opt || {};
    var f = RTMap.files(key), T = RTMap.types(); if (!f || !data || !spawn) return null;
    var keep = opt.keep || [], size = Math.max(f.w, f.h), S = opt.from || spawn;
    var its = wanted(RTMap.mapOf(key), opt.extra, opt.got).map(function (x) { x.m = RTMap.itemMatch(x.id); x.T = Math.min(3, Math.max(1, x.n)); return x; }).filter(function (x) { return x.m; });
    var base = { k: key, spawn: spawn, own: true, extra: opt.extra || [], got: opt.got || [], odds: {}, stops: keep, end: null };
    var raw = [];
    data.m.forEach(function (r, i) {
      if (RTMap.isArc(r)) return; var e = null;
      its.forEach(function (x) {
        if (!x.m(r)) return;
        var it = RT.item(x.id), ty = T[r[2]], made = (it.st || []).indexOf(r[2]) > -1;
        (e = e || {})[x.id] = made ? (ty && ty[0] === "containers" ? 0.3 : 0.85) : (Q[it.r] || 0.05);
      });
      if (e) raw.push({ i: i, p: [r[0], r[1]], e: e });
    });
    // spots right next to each other (one building) are one stop: more rolls for the same walk
    var R = size * 0.022, cand = [];
    raw.sort(function (a, b) { return Object.keys(b.e).length - Object.keys(a.e).length; }).forEach(function (c) {
      var hit = null; for (var k = 0; k < cand.length && !hit; k++) if (dist(cand[k].p, c.p) <= R) hit = cand[k];
      if (hit) { hit.m.push(c.i); for (var id in c.e) hit.e[id] = (hit.e[id] || 0) + c.e[id]; }
      else { var e2 = {}; for (var id2 in c.e) e2[id2] = c.e[id2]; cand.push({ p: c.p, e: e2, m: [c.i] }); }
    });
    var want = Math.max(1, Math.min(40, opt.max || 20)) - keep.length, stopCost = 0.02 * size;
    function build(E) {
      var pts = [S, E], route = [], got = {}, used = {};
      its.forEach(function (x) { got[x.id] = 0; });
      for (var n = 0; n < want; n++) {
        var best = null, bs = 0, bpos = 0;
        for (var c = 0; c < cand.length; c++) {
          if (used[c]) continue;
          var cd = cand[c], gain = 0;
          for (var id in cd.e) { var x = its.filter(function (y) { return y.id === id; })[0]; gain += U(got[id] + cd.e[id], x.T) - U(got[id], x.T); }
          if (gain < 0.025) continue;
          var ins = 1e18, pos = 0;
          for (var k = 0; k < pts.length - 1; k++) { var dd = dist(pts[k], cd.p) + dist(cd.p, pts[k + 1]) - dist(pts[k], pts[k + 1]); if (dd < ins) { ins = dd; pos = k; } }
          var sc = gain / (ins + stopCost);
          if (sc > bs) { bs = sc; best = c; bpos = pos; }
        }
        if (best == null) break;
        used[best] = 1; pts.splice(bpos + 1, 0, cand[best].p); route.splice(bpos, 0, cand[best]);
        for (var id3 in cand[best].e) got[id3] += cand[best].e[id3];
      }
      // undo crossing lines
      var better = true, guard = 0;
      while (better && guard++ < 60) {
        better = false;
        for (var a = 1; a < pts.length - 2; a++) for (var c2 = a + 1; c2 < pts.length - 1; c2++) {
          var d0 = dist(pts[a - 1], pts[a]) + dist(pts[c2], pts[c2 + 1]), d1 = dist(pts[a - 1], pts[c2]) + dist(pts[a], pts[c2 + 1]);
          if (d1 + 0.01 < d0) { var sg = pts.slice(a, c2 + 1).reverse(), sp = route.slice(a - 1, c2).reverse(); pts.splice.apply(pts, [a, sg.length].concat(sg)); route.splice.apply(route, [a - 1, sp.length].concat(sp)); better = true; }
        }
      }
      var len = 0; for (var q = 1; q < pts.length; q++) len += dist(pts[q - 1], pts[q]);
      var tot = 0; its.forEach(function (x) { tot += U(got[x.id], x.T); });
      return { route: route, got: got, score: tot - len / size * 0.6 };
    }
    var ex = Object.assign(RTMap.typeIdx("locations:extraction"), RTMap.typeIdx("locations:metro_entrance")), exits = [];
    data.m.forEach(function (r, i) { if (ex[r[2]]) exits.push(i); });
    var res = null, end = null;
    var near = exits.slice().sort(function (a, b) { return dist(S, data.m[a]) - dist(S, data.m[b]); }).slice(0, 4);
    var far = exits.slice().sort(function (a, b) { return dist(S, data.m[b]) - dist(S, data.m[a]); }).slice(0, 1);
    near.concat(far).filter(function (v, k, arr) { return arr.indexOf(v) === k; }).forEach(function (ei) {
      var r2 = build([data.m[ei][0], data.m[ei][1]]); if (!res || r2.score > res.score) { res = r2; end = ei; }
    });
    if (!res) res = build(S);
    var name = function (c) {
      if (c.m.length === 1) return (data.n && data.n[c.m[0]]) || (T[data.m[c.m[0]][2]] || [])[2] || "Stop";
      var cnt = {}, o = []; c.m.forEach(function (i) { var n = (T[data.m[i][2]] || [])[2] || "Container"; if (!cnt[n]) o.push(n); cnt[n] = (cnt[n] || 0) + 1; });
      return o.slice(0, 3).map(function (n) { return n + (cnt[n] > 1 ? " ×" + cnt[n] : ""); }).join(", ");
    };
    base.stops = keep.concat(res.route.map(function (c) { return { p: c.p, ids: Object.keys(c.e), w: name(c) }; }));
    if (end != null) base.end = { p: [data.m[end][0], data.m[end][1]], n: (data.n && data.n[end]) || "Extraction" };
    its.forEach(function (x) { base.odds[x.id] = Math.round((1 - Math.exp(-res.got[x.id])) * 100); });
    base.items = its.map(function (x) { return x.id; });
    return base;
  }

  /* plan again from where you are: the stops you have reached stay, the rest follows what is still missing */
  function replan(cb) {
    var rt = RT.route(); if (!rt || !rt.own) return cb && cb(rt);
    RTMap.markers(rt.k, function (data) {
      if (!data) return cb && cb(rt);
      var at = Math.min(RT.routeAt(), rt.stops.length), keep = rt.stops.slice(0, at);
      var n = plan(rt.k, data, rt.spawn, { extra: rt.extra, got: rt.got, keep: keep, from: keep.length ? keep[keep.length - 1].p : rt.spawn });
      if (n) { RT.setRoute(n, true); }
      if (cb) cb(n || rt);
    });
  }
  function start(key, spawn, cb) {
    RTMap.markers(key, function (data) {
      var n = plan(key, data, spawn, {});
      if (n) { RT.setRoute(n); RT.setRouteAt(0); RT.setSetting("mapView", "route"); }
      if (cb) cb(n);
    });
  }
  function change(fn, cb) { var rt = RT.route(); if (!rt || !rt.own) return; fn(rt); RT.setRoute(rt, true); replan(cb); }
  window.RTRoute = {
    plan: plan, start: start, replan: replan, wanted: wanted,
    add: function (id, cb) { change(function (rt) { rt.extra = (rt.extra || []).filter(function (x) { return x !== id; }).concat([id]); rt.got = (rt.got || []).filter(function (x) { return x !== id; }); }, cb); },
    drop: function (id, cb) { change(function (rt) { rt.extra = (rt.extra || []).filter(function (x) { return x !== id; }); rt.got = (rt.got || []).concat([id]); }, cb); },
    skip: function (cb) { var rt = RT.route(); if (!rt) return; var at = RT.routeAt(); if (at >= rt.stops.length) return; rt.stops.splice(at, 1); RT.setRoute(rt, true); if (cb) cb(rt); }
  };
})();
