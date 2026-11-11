  /* ---------- route planner: spawn -> containers/plants for what you need -> extraction ---------- */
  var planSt = store("rt-plan") || {}; if (!planSt.off) planSt.off = {}; if (!planSt.add) planSt.add = []; if (!planSt.max || planSt.max === 10) planSt.max = 20;
  function planSave() { store("rt-plan", { off: planSt.off, add: planSt.add, max: planSt.max }); }
  function planMissing(id) { var n = needTotal(id) - haveOf(id); return n > 0 ? n : 0; }
  // ARC: the machines themselves, and their wrecks and drones you loot (husks, probes, couriers)
  var PLAN_ARC = { baron_husk: 1, wasp_husk: 1, rocketeer_husk: 1, arc_husk: 1, deforester_husk: 1, arc_courier: 1, arc_probe: 1 };
  function planIsArc(r) { var ty = MKT[r[2]]; if (!ty) return false; return ty[0] === "arc" || !!PLAN_ARC[ty[1]] || (ty[0] === "containers" && !!r[4] && !(r[4] & ~4096)); }
  var planCnt = {};
  function planSplit(id) {
    var key = mapImgKey(), data = MK[key], ck = key + ":" + id; if (!data) return null;
    if (planCnt[ck]) return planCnt[ck];
    var m = mkItemMatch(id), o = { loot: 0, arc: 0, types: {} };
    if (m) data.m.forEach(function (r) { if (!m(r)) return; if (planIsArc(r)) { o.arc++; var nmT = MKT[r[2]][2]; o.types[nmT] = (o.types[nmT] || 0) + 1; } else o.loot++; });
    return (planCnt[ck] = o);
  }
  function planItems() {
    var key = mapImgKey(), c = function (id) { var s = mkSpots(id); return s[key] || 0; }, out = [], seen = {}, F = MV.plan && MV.plan.fixed;
    if (F) F.forEach(function (id) { if (!seen[id] && IDX[id] && c(id)) { seen[id] = 1; out.push({ id: id, n: 1, src: "share" }); } });
    else shop.g.forEach(function (g) { Object.keys(g.items).forEach(function (id) { if (!seen[id] && planMissing(id) && c(id)) { seen[id] = 1; out.push({ id: id, n: planMissing(id), src: "list" }); } }); });
    if (!F) planSt.add.forEach(function (id) { if (!seen[id] && c(id)) { seen[id] = 1; out.push({ id: id, n: 1, src: "add" }); } });
    out.forEach(function (x) {
      x.spots = c(x.id); x.on = F ? !MV.plan.fixOff[x.id] : !planSt.off[x.id];
      var sp = planSplit(x.id); x.loot = sp ? sp.loot : x.spots; x.arc = sp ? sp.arc : 0; x.types = sp ? sp.types : {};
      x.kind = x.loot ? "loot" : "arc";
    });
    return out;
  }
  function planTypeIdx(k) { var o = []; MKT.forEach(function (t, i) { if (t[0] + ":" + t[1] === k) o.push(i); }); return o; }
  function planExits(data) {
    var ex = {}; planTypeIdx("locations:extraction").concat(planTypeIdx("locations:metro_entrance")).forEach(function (i) { ex[i] = 1; });
    var o = []; data.m.forEach(function (r, i) { if (ex[r[2]]) o.push(i); }); return o;
  }
  function planSpawns(data) { var sp = {}; planTypeIdx("locations:player_spawn").forEach(function (i) { sp[i] = 1; }); var o = []; data.m.forEach(function (r, i) { if (sp[r[2]]) o.push(i); }); return o; }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function planCompute() {
    var P = MV.plan, key = mapImgKey(), data = MK[key], d = MAPIMG[key]; if (!P || !data || !P.spawn || !d) return;
    var its = planItems().filter(function (x) { return x.on && x.kind === "loot"; }); P.err = "";
    if (!its.length) { P.stops = null; P.err = t("Pick at least one item that has spots on this map."); return; }
    var match = {}; its.forEach(function (x) { match[x.id] = mkItemMatch(x.id); });
    var raw = [];
    data.m.forEach(function (r, i) { if (planIsArc(r)) return; var cov = its.filter(function (x) { return match[x.id](r); }).map(function (x) { return x.id; }); if (cov.length) raw.push({ i: i, p: [r[0], r[1]], cov: cov }); });
    var S = P.spawn, size = Math.max(d.w, d.h), exits = planExits(data), want = Math.max(1, Math.min(80, P.max));
    // spots right next to each other (one building, one room) are one stop, so pins never pile up
    var R = size * 0.022, cand = [];
    raw.sort(function (a, b) { return b.cov.length - a.cov.length; }).forEach(function (c) {
      var hit = null; for (var k = 0; k < cand.length && !hit; k++) if (dist(cand[k].p, c.p) <= R) hit = cand[k];
      if (hit) { hit.m.push(c.i); c.cov.forEach(function (id) { if (hit.cov.indexOf(id) < 0) hit.cov.push(id); }); }
      else cand.push({ i: c.i, p: c.p, cov: c.cov.slice(), m: [c.i] });
    });
    function proj(p, A, B) {
      var vx = B[0] - A[0], vy = B[1] - A[1], L2 = vx * vx + vy * vy || 1, tt = ((p[0] - A[0]) * vx + (p[1] - A[1]) * vy) / L2, tc = Math.max(0, Math.min(1, tt));
      return { t: tt, d: Math.hypot(p[0] - (A[0] + vx * tc), p[1] - (A[1] + vy * tc)) };
    }
    function corridor(E, w) { return cand.filter(function (c) { var q = proj(c.p, S, E); return q.d <= w && q.t > -0.08 && q.t < 1.08; }); }
    // the exit: the one you picked, or the one with the most of your list on the way (a shorter walk wins a tie)
    var end = null;
    if (P.ext !== "auto" && data.m[P.ext]) end = +P.ext;
    else if (exits.length) {
      var best = -1e18;
      exits.forEach(function (ei) {
        var E = [data.m[ei][0], data.m[ei][1]], inC = corridor(E, size * 0.08), got = {};
        inC.forEach(function (c) { c.cov.forEach(function (id) { got[id] = 1; }); });
        var sc = Object.keys(got).length * 1000 + Math.min(inC.length, want) * 10 - dist(S, E) / size * 300;
        if (sc > best) { best = sc; end = ei; }
      });
    }
    var E = end != null ? [data.m[end][0], data.m[end][1]] : S;
    // a narrow band along the line first, wider until it holds enough stops
    var w = size * 0.035, pool = corridor(E, w);
    while (pool.length < want && w < size * 0.6) { w *= 1.4; pool = corridor(E, w); }
    // every item gets at least its closest spot to the line, even if that is a detour
    its.forEach(function (x) {
      if (pool.some(function (c) { return c.cov.indexOf(x.id) > -1; })) return;
      var bc = null, bd = 1e18; cand.forEach(function (c) { if (c.cov.indexOf(x.id) < 0) return; var q = proj(c.p, S, E); if (q.d < bd) { bd = q.d; bc = c; } });
      if (bc) pool.push(bc);
    });
    pool.forEach(function (c) { var q = proj(c.p, S, E); c.t = q.t; c.dd = q.d; });
    if (pool.length > want) {
      // keep the only spots of rare items, then spread the rest evenly from spawn to exit, best spot in each stretch
      var must = [];
      its.forEach(function (x) { var own = pool.filter(function (c) { return c.cov.indexOf(x.id) > -1; }); if (own.length <= 2) own.forEach(function (c) { if (must.indexOf(c) < 0) must.push(c); }); });
      must = must.slice(0, want);
      var rest = pool.filter(function (c) { return must.indexOf(c) < 0; }).sort(function (a, b) { return a.t - b.t; }), k = want - must.length, pick = [];
      for (var b = 0; b < k && rest.length; b++) {
        var lo = Math.floor(b * rest.length / k), hi = Math.max(lo + 1, Math.floor((b + 1) * rest.length / k));
        var seg = rest.slice(lo, hi).sort(function (a, c) { return (c.cov.length - a.cov.length) || (a.dd - c.dd); }); pick.push(seg[0]);
      }
      pool = must.concat(pick);
    }
    // walk them in order of progress towards the exit, so the line zig-zags between both sides of the way
    pool.sort(function (a, b) { return a.t - b.t; });
    var pts = [S].concat(pool.map(function (c) { return c.p; })).concat([E]), better = true, guard = 0;
    while (better && guard++ < 60) {
      better = false;
      for (var a = 1; a < pts.length - 2; a++) for (var c2 = a + 1; c2 < pts.length - 1; c2++) {
        var d0 = dist(pts[a - 1], pts[a]) + dist(pts[c2], pts[c2 + 1]), d1 = dist(pts[a - 1], pts[c2]) + dist(pts[a], pts[c2 + 1]);
        if (d1 + 0.01 < d0) { var sg = pts.slice(a, c2 + 1).reverse(), sp = pool.slice(a - 1, c2).reverse(); pts.splice.apply(pts, [a, sg.length].concat(sg)); pool.splice.apply(pool, [a - 1, sp.length].concat(sp)); better = true; }
      }
    }
    var len = 0; for (var q2 = 1; q2 < pts.length; q2++) len += dist(pts[q2 - 1], pts[q2]);
    var stops = pool.map(function (c) { return { i: c.i, p: c.p, cov: c.cov, m: c.m }; });
    P.stops = stops; P.end = end; P.len = len;
    P.short = its.map(function (x) { return x.id; }).filter(function (id) { return !stops.some(function (s) { return s.cov.indexOf(id) > -1; }); });
  }
  function planDraw(cx, data, s, W, H, dpr) {
    var P = MV.plan, scr = function (p) { return [MV.x + p[0] * s, MV.y + p[1] * s]; };
    var ring = Math.round(13 + Math.min(6, (MV.z - 1) * 1.6));
    if (P.tab === "arc") {
      var ai = planItems().filter(function (x) { return x.on && x.kind === "arc"; }), am = ai.map(function (x) { return mkItemMatch(x.id); }), big = ring + 6;
      data.m.forEach(function (r, i) {
        if (!planIsArc(r) || !am.some(function (m) { return m && m(r); })) return;
        var q = scr(r); if (q[0] < -20 || q[1] < -20 || q[0] > W + 20 || q[1] > H + 20) return;
        var g = MKTG[r[2]] || MKGI.con; cx.drawImage(sprBadge(g, big, dpr, true), q[0] - (big + 4) / 2, q[1] - (big + 4) / 2, big + 4, big + 4); mkPts.push([q[0], q[1], i, big / 2 + 2]);
      });
      return;
    }
    if (P.picking) {
      planSpawns(data).forEach(function (i) { var r = data.m[i], q = scr(r); var g = MKGI.spn; cx.drawImage(sprBadge(g, 18, dpr, true), q[0] - 11, q[1] - 11, 22, 22); mkPts.push([q[0], q[1], i, 12]); });
      if (P.spawn) { var q0 = scr(P.spawn); cx.drawImage(sprPin("plan", "", "S", 26, dpr), q0[0] - 13, q0[1] - 33, 26, 33); }
      return;
    }
    // only the route: spawn, numbered stops and the exit
    if (!P.spawn) return;
    var leg = P.play != null ? planLeg(P.play) : null;
    var path = leg ? [leg.from.p, leg.to.p] : [P.spawn].concat((P.stops || []).map(function (st) { return st.p; })); if (!leg && P.end != null && data.m[P.end]) path.push([data.m[P.end][0], data.m[P.end][1]]);
    if (path.length > 1) {
      cx.save(); cx.lineWidth = 3; cx.strokeStyle = "rgba(95,242,234,.95)"; cx.setLineDash([2, 7]); cx.lineDashOffset = -routeDash(); cx.lineCap = "round"; cx.shadowColor = "rgba(0,0,0,.8)"; cx.shadowBlur = 4;
      cx.beginPath(); path.forEach(function (p, k) { var q = scr(p); if (k) cx.lineTo(q[0], q[1]); else cx.moveTo(q[0], q[1]); }); cx.stroke(); cx.restore();
    }
    // round badges, the same as in the desktop app: S white, numbered stops dark with a cyan ring, E yellow
    var r = Math.round(10 + Math.min(5, (MV.z - 1) * 1.4));
    var badge = function (p, lab, bg, fg, ring, idx, rr) {
      var q = scr(p), R = rr || r;
      cx.save(); cx.shadowColor = "rgba(0,0,0,.6)"; cx.shadowBlur = 5;
      cx.beginPath(); cx.arc(q[0], q[1], R, 0, 6.2832); cx.fillStyle = bg; cx.fill(); cx.restore();
      cx.lineWidth = ring ? 2 : 1.5; cx.strokeStyle = ring || "#0c0916"; cx.beginPath(); cx.arc(q[0], q[1], R, 0, 6.2832); cx.stroke();
      cx.fillStyle = fg; cx.font = "700 " + Math.round(R * (lab.length > 1 ? 0.95 : 1.1)) + "px 'JetBrains Mono', ui-monospace, monospace"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(lab, q[0], q[1] + 0.5);
      if (idx != null) mkPts.push([q[0], q[1], idx, R + 2]);
    };
    var look = function (x, R) { return x.lab === "S" ? ["#ece9f5", "#0c0916", null] : x.lab === "E" ? ["#ffc400", "#0c0916", null] : ["#2b2740", "#ece9f5", "#5ff2ea"]; };
    if (leg) {
      // play mode: where you are (faded) and where you go next (big, pulsing ring)
      var a = look(leg.from), b = look(leg.to), q1 = scr(leg.to.p), pr = r + 6 + (dashCalm ? 0 : Math.sin(performance.now() / 260) * 3);
      cx.save(); cx.globalAlpha = .55; badge(leg.from.p, leg.from.lab, a[0], a[1], a[2], null); cx.restore();
      cx.save(); cx.lineWidth = 2; cx.strokeStyle = "rgba(95,242,234,.55)"; cx.beginPath(); cx.arc(q1[0], q1[1], pr + 4, 0, 6.2832); cx.stroke(); cx.restore();
      badge(leg.to.p, leg.to.lab, b[0], b[1], b[2], leg.to.i, r + 3);
      return;
    }
    if (P.hl != null && P.stops && P.stops[P.hl]) { var qh = scr(P.stops[P.hl].p); cx.save(); cx.fillStyle = "rgba(95,242,234,.22)"; cx.beginPath(); cx.arc(qh[0], qh[1], r + 10, 0, 6.2832); cx.fill(); cx.restore(); }
    (P.stops || []).slice().reverse().forEach(function (st, k, arr) { var n = arr.length - k; badge(st.p, String(n), "#2b2740", "#ece9f5", "#5ff2ea", st.i, P.hl === n - 1 ? r + 3 : null); });
    if (P.end != null && data.m[P.end]) badge([data.m[P.end][0], data.m[P.end][1]], "E", "#ffc400", "#0c0916", null, P.end, r + 1);
    badge(P.spawn, "S", "#ece9f5", "#0c0916", null, null);
  }
  /* the route line marches from stop to stop. The map is drawn again about 30 times a second only while a route
     is on screen, the tab is visible and the visitor hasn't asked for less motion. */
  var dashRaf = 0, dashLast = 0, dashCalm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function routeDash() {
    if (!dashCalm && !dashRaf) dashRaf = requestAnimationFrame(dashTick);
    return dashCalm ? 0 : (performance.now() / 55) % 9;
  }
  function dashTick(ts) {
    dashRaf = 0;
    var on = !document.hidden && $("#v-maps").classList.contains("on") && !$("#v-maps").classList.contains("pick") && MV.plan && MV.plan.spawn && MV.plan.stops && MV.plan.stops.length;
    if (!on) return;
    if (ts - dashLast > 32) { dashLast = ts; mkDraw(); } else dashRaf = requestAnimationFrame(dashTick);
  }
  function renderPlan() {
    var el = $("#mplanp"), P = MV.plan; if (!el) return;
    if (!P) { el.hidden = true; el.innerHTML = ""; planPlayHud(); return; }
    planPlayHud();
    el.hidden = false;
    var data = MK[mapImgKey()];
    if (!data) { el.innerHTML = '<p class="dim">' + esc(t("Loading markers…")) + "</p>"; return; }
    var all = planItems(), ex = planExits(data), arcIts = all.filter(function (x) { return x.kind === "arc"; }), its = all.filter(function (x) { return x.kind === "loot"; });
    if (!arcIts.length) P.tab = "loot"; else if (!P.tab) P.tab = its.length ? "loot" : "arc";
    var h = '<div class="mlh2"><b>' + esc(t("Plan a route")) + '</b><span><button type="button" class="mlx" data-pmin aria-label="' + esc(t(P.min ? "Show" : "Hide")) + '">' + (P.min ? "▾" : "▴") + '</button><button type="button" class="mlx" data-pclose aria-label="' + esc(t("Close")) + '">×</button></span></div>';
    if (P.min) { el.innerHTML = h + (P.stops ? '<p class="mlnote2">' + P.stops.length + " " + esc(t("stops")) + "</p>" : ""); el.classList.add("min"); return; }
    el.classList.remove("min");
    // two views so neither is crowded: Setup (what you need, spawn, exit) and Route (the stops). The route opens by itself the first time there is one.
    var hasRoute = !!(P.stops && P.stops.length);
    if (hasRoute && !P.had) P.view = "route";
    P.had = hasRoute;
    var view = hasRoute && P.view !== "setup" ? "route" : "setup";
    el.classList.toggle("rt", view === "route");
    if (hasRoute) h += '<div class="pptabs ppv" role="tablist"><button type="button" role="tab" data-pview="setup" aria-selected="' + (view === "setup") + '">' + esc(t("Setup")) + '</button><button type="button" role="tab" data-pview="route" aria-selected="' + (view === "route") + '">' + esc(t("Route")) + " <em>" + P.stops.length + "</em></button></div>";
    if (view === "route") {
      var got = {}; P.stops.forEach(function (st) { st.cov.forEach(function (id) { got[id] = 1; }); });
      h += '<div class="pps"><span><b>' + P.stops.length + "</b>" + esc(t("stops")) + "</span><span><b>" + Object.keys(got).length + "</b>" + esc(t("items")) + "</span>" + (P.end != null ? '<span class="ppx"><b>E</b>' + esc(data.n[P.end] || t("Extraction")) + "</span>" : "") + "</div>";
      h += P.play != null ? '<button type="button" class="btn orb ppplay" data-pplayx>' + esc(t("Stop playing")) + "</button>" : '<button type="button" class="btn go orb ppplay" data-pplay><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' + esc(t("Play route")) + "</button>";
      h += '<ol class="ppst">' + P.stops.map(function (st, k) { return '<li tabindex="0" data-pst="' + k + '"' + (P.play === k ? ' class="cur"' : P.play > k ? ' class="did"' : "") + ' style="--i:' + Math.min(k, 14) + '"><i>' + (k + 1) + "</i><span><b>" + esc(planStopName(st, data)) + "</b>" + planThumbs(st.cov, 5) + "</span></li>"; }).join("") +
        (P.end != null ? '<li class="ex' + (P.play === P.stops.length ? " cur" : "") + '" style="--i:' + Math.min(P.stops.length, 15) + '"><i>E</i><span><b>' + esc(data.n[P.end] || t("Extraction")) + "</b><small>" + esc(t("Extract")) + "</small></span></li>" : "") + "</ol>";
      if (P.short && P.short.length) h += '<p class="mlnote2">' + esc(t("Not enough stops for")) + ": " + esc(P.short.map(nm).join(", ")) + ". " + esc(t("Raise the max stops.")) + "</p>";
      h += '<div class="ppshare"><button type="button" class="btn go orb sm" data-papp title="' + esc(t("Show this route in the Raider Toolkit Companion app")) + '">' + esc(t("Send to app")) + '</button><button type="button" class="btn orb sm" data-pshare>' + esc(t("Share route")) + "</button>" + (P.shareUrl ? '<input readonly value="' + esc(P.shareUrl) + '" aria-label="' + esc(t("Route link")) + '">' : "") + "</div>";
      h += '<p class="mlsrc">' + esc(t("Straight lines between stops, not walking paths. Containers are random, so a stop can come up empty.")) + "</p>";
      el.innerHTML = h;
      var cur = el.querySelector(".ppst .cur"); if (cur) { var top = cur.offsetTop - el.clientHeight / 2 + cur.offsetHeight / 2; el.scrollTo({ top: Math.max(0, top), behavior: dashCalm ? "auto" : "smooth" }); }
      return;
    }
    if (arcIts.length) h += '<div class="pptabs" role="tablist"><button type="button" role="tab" data-ptab="loot" aria-selected="' + (P.tab !== "arc") + '">' + esc(t("Loot route")) + " <em>" + its.length + '</em></button><button type="button" role="tab" data-ptab="arc" aria-selected="' + (P.tab === "arc") + '">' + esc(t("ARC drops")) + " <em>" + arcIts.length + "</em></button></div>";
    if (P.tab === "arc") {
      h += '<p class="mlsrc pparc">' + esc(t("These come from fighting or looting ARC, so they are not on the route. The map shows where those ARC are usually found.")) + "</p>";
      h += '<div class="ppits">' + arcIts.map(function (x) {
        var ty = Object.keys(x.types).sort(function (a, b) { return x.types[b] - x.types[a]; });
        return '<label class="mlr ppar"><input type="checkbox" data-pit="' + x.id + '"' + (x.on ? " checked" : "") + ">" + thumb(x.id) + '<span class="ppan"><span>' + esc(nm(x.id)) + (x.src === "list" ? ' <small class="dim">×' + x.n + "</small>" : "") + '</span><small class="ppty">' + esc(ty.join(", ")) + "</small></span><small>" + fmt(x.arc) + "</small></label>";
      }).join("") + "</div>";
      el.innerHTML = h; return;
    }
    if (P.fixed) h += '<p class="mlnote2 ppshared">' + esc(t("Shared route")) + ' · <button type="button" class="pplink" data-pown>' + esc(t("use my own list instead")) + "</button></p>";
    h += '<h6>1 · ' + esc(t("What you need")) + "</h6>";
    h += its.length ? '<div class="ppits">' + its.map(function (x) {
      return '<label class="mlr"><input type="checkbox" data-pit="' + x.id + '"' + (x.on ? " checked" : "") + ">" + thumb(x.id) + "<span>" + esc(nm(x.id)) + (x.src === "list" ? ' <small class="dim">×' + x.n + "</small>" : "") + "</span><small>" + fmt(x.spots) + "</small>" + (x.src === "add" ? '<button type="button" class="mlx" data-pdel="' + x.id + '" aria-label="' + esc(t("Remove")) + '">×</button>' : "") + "</label>";
    }).join("") + "</div>" : '<p class="dim pph">' + esc(t("Nothing from your shopping list has marked spots on this map. Add items below.")) + "</p>";
    if (arcIts.length) h += '<p class="mlnote2 ppnote">' + esc(arcIts.length + " " + t(arcIts.length === 1 ? "item comes from ARC" : "items come from ARC")) + ' · <button type="button" class="pplink" data-ptab="arc">' + esc(t("see ARC drops")) + "</button></p>";
    var sc = planMapScores(), om = MAP_ORDER.filter(function (k) { return k !== curMap && sc[k]; }).sort(function (a, b) { return sc[b].n - sc[a].n; });
    if (om.length) h += '<div class="ppmaps"><span>' + esc(t("Your list on other maps")) + ':</span>' + om.map(function (k) { return '<button type="button" data-pmap="' + k + '">' + esc(MAPS[k].name) + ' <em>' + sc[k].n + '</em></button>'; }).join("") + '</div>';
    h += '<div class="ppadd"><input type="search" id="ppq" placeholder="' + esc(t("Add an item…")) + '" autocomplete="off" value="' + esc(P.q || "") + '"><div class="ppres" id="ppres"></div></div>';
    h += '<h6>2 · ' + esc(t("Where you spawn")) + "</h6>";
    h += '<button type="button" class="chip orb pppick' + (P.picking ? " on" : "") + '" data-ppick>' + esc(P.picking ? t("Tap your spawn on the map…") : P.spawn ? t("Spawn set · change") : t("Pick your spawn on the map")) + "</button>";
    h += '<h6>3 · ' + esc(t("Where you leave")) + "</h6>";
    h += '<select id="ppext"><option value="auto">' + esc(t("Best exit for your list")) + "</option>" + ex.map(function (i) { var nmx = data.n[i] || MKT[data.m[i][2]][2]; return '<option value="' + i + '"' + (String(P.ext) === String(i) ? " selected" : "") + ">" + esc(nmx) + "</option>"; }).join("") + "</select>";
    h += '<label class="ppmax"><span>' + esc(t("Max stops")) + ' <b id="ppmaxv">' + planSt.max + '</b></span><input type="range" id="ppmax" min="3" max="80" value="' + planSt.max + '"></label>';
    if (P.err) h += '<p class="mlnote2">' + esc(P.err) + "</p>";
    if (hasRoute) {
      h += '<button type="button" class="btn go orb sm ppgo" data-pview="route">' + esc(t("Show the route")) + " · " + P.stops.length + " " + esc(t("stops")) + "</button>";
    } else if (!P.spawn && its.length) h += '<p class="mlsrc">' + esc(t("Pick your spawn and the route draws itself.")) + "</p>";
    el.innerHTML = h;
    renderPlanRes();
  }
  function planStopName(st, data) {
    var m = st.m || [st.i]; if (m.length === 1) return data.n[st.i] || MKT[data.m[st.i][2]][2];
    var c = {}, o = []; m.forEach(function (i) { var n = MKT[data.m[i][2]][2]; if (!c[n]) o.push(n); c[n] = (c[n] || 0) + 1; });
    return o.map(function (n) { return n + (c[n] > 1 ? " ×" + c[n] : ""); }).join(", ");
  }
  function planThumbs(ids, max) {
    var more = ids.length - max;
    return '<span class="ppth">' + ids.slice(0, max).map(function (id) { return thumb(id); }).join("") + (more > 0 ? "<em>+" + more + "</em>" : "") + "<small>" + ids.length + " " + esc(t(ids.length === 1 ? "item" : "items")) + "</small></span>";
  }
  /* what a stop gives you: shown when you hover a stop in the list or on the map */
  function planStopTip(k) {
    var P = MV.plan, data = MK[mapImgKey()], st = P && P.stops && P.stops[k]; if (!st || !data) return "";
    return "<b>" + esc(t("Stop") + " " + (k + 1) + " · " + planStopName(st, data)) + "</b><small>" + esc(st.cov.length + " " + t(st.cov.length === 1 ? "item on your route" : "items on your route")) + '</small><ul class="ttits">' + st.cov.map(function (id) { return "<li>" + thumb(id) + "<span>" + esc(nm(id)) + "</span></li>"; }).join("") + "</ul>";
  }
  function planStopAt(idx) { var P = MV.plan; if (!P || !P.stops || P.picking || P.tab === "arc") return -1; for (var k = 0; k < P.stops.length; k++) if (P.stops[k].i === idx) return k; return -1; }
  function planTipAt(html, r) {
    tt.innerHTML = html; tt.hidden = false;
    var w = tt.offsetWidth, h = tt.offsetHeight, x = r.left - w - 12, y = Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2));
    if (x < 8) { x = Math.max(8, Math.min(innerWidth - w - 8, r.left)); y = r.top - h - 8; if (y < 8) y = r.bottom + 8; }
    tt.style.left = x + "px"; tt.style.top = y + "px";
  }
  function planHover(k) { var P = MV.plan; if (!P || P.hl === k) return; P.hl = k; mkSoon(); }
  document.addEventListener("mouseover", function (e) { var li = e.target.closest && e.target.closest("#mplanp [data-pst]"); if (li) { planTipAt(planStopTip(+li.dataset.pst), li.getBoundingClientRect()); planHover(+li.dataset.pst); } });
  document.addEventListener("mouseout", function (e) { var li = e.target.closest && e.target.closest("#mplanp [data-pst]"); if (li && !li.contains(e.relatedTarget)) { hideTT(); planHover(null); } });
  document.addEventListener("focusin", function (e) { var li = e.target.closest && e.target.closest("#mplanp [data-pst]"); if (li) { planTipAt(planStopTip(+li.dataset.pst), li.getBoundingClientRect()); planHover(+li.dataset.pst); } });
  document.addEventListener("focusout", function (e) { if (e.target.closest && e.target.closest("#mplanp [data-pst]")) { hideTT(); planHover(null); } });

  /* ---------- play route: one leg at a time, zoomed to where you are and where you go next ---------- */
  function planTargets() {
    var P = MV.plan, data = MK[mapImgKey()], o = (P.stops || []).map(function (st, k) { return { p: st.p, lab: String(k + 1), i: st.i, k: k, name: planStopName(st, data), cov: st.cov }; });
    if (P.end != null && data.m[P.end]) o.push({ p: [data.m[P.end][0], data.m[P.end][1]], lab: "E", i: P.end, name: data.n[P.end] || t("Extraction"), cov: [] });
    return o;
  }
  function planLeg(k) {
    var T = planTargets(); if (!T.length) return null; k = Math.max(0, Math.min(T.length - 1, k));
    return { from: k ? T[k - 1] : { p: MV.plan.spawn, lab: "S" }, to: T[k], n: T.length, k: k };
  }
  var mvAnim = 0;
  function planZoomTo(ps, pad) {
    var box = $("#mview"), d = MAPIMG[mapImgKey()]; if (!box || !d) return;
    var x0 = Math.min.apply(null, ps.map(function (q) { return q[0]; })), x1 = Math.max.apply(null, ps.map(function (q) { return q[0]; })), y0 = Math.min.apply(null, ps.map(function (q) { return q[1]; })), y1 = Math.max.apply(null, ps.map(function (q) { return q[1]; }));
    var W = box.clientWidth, H = box.clientHeight, base = Math.min(W / d.w, H / d.h), padY = pad + (MV.plan && MV.plan.play != null ? 60 : 0);
    var z = Math.max(1, Math.min(MV.plan && MV.plan.play != null ? 5 : 3.5, Math.min((W - pad * 2) / Math.max(60, x1 - x0), (H - padY * 2) / Math.max(60, y1 - y0)) / base));
    var sc = base * z, tx = W / 2 - (x0 + x1) / 2 * sc, ty = H / 2 - (y0 + y1) / 2 * sc + (MV.plan && MV.plan.play != null ? 10 : 20);
    cancelAnimationFrame(mvAnim);
    if (dashCalm) { MV.z = z; MV.x = tx; MV.y = ty; mvApply(); return; }
    // glide: interpolate in "where the map centre is" space so the zoom doesn't swing off to one side
    var z0 = MV.z, cx0 = (W / 2 - MV.x) / (base * z0), cy0 = (H / 2 - MV.y) / (base * z0), cx1 = (W / 2 - tx) / sc, cy1 = (H / 2 - ty) / sc, t0 = performance.now(), dur = 650;
    var step = function (now) {
      var u = Math.min(1, (now - t0) / dur), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      var zz = z0 * Math.pow(z / z0, e), s2 = base * zz, ccx = cx0 + (cx1 - cx0) * e, ccy = cy0 + (cy1 - cy0) * e;
      MV.z = zz; MV.x = W / 2 - ccx * s2; MV.y = H / 2 - ccy * s2; mvApply();
      if (u < 1) mvAnim = requestAnimationFrame(step);
    };
    mvAnim = requestAnimationFrame(step);
  }
  function planPlayGo(k) {
    var P = MV.plan; if (!P || !P.stops || !P.stops.length) return;
    var leg = planLeg(k); P.play = leg.k; P.hl = null; hideTT();
    renderPlan(); planZoomTo([leg.from.p, leg.to.p], 110);
  }
  function planPlayStop() { var P = MV.plan; if (!P || P.play == null) return; P.play = null; renderPlan(); planFit(); }
  function planPlayHud() {
    var box = $("#mview"), P = MV.plan, el = box && box.querySelector(".pplay");
    if (!box) return;
    if (!P || P.play == null || !P.stops || !P.stops.length) { if (el) el.remove(); box.classList.remove("playing"); return; }
    var leg = planLeg(P.play), last = leg.k === leg.n - 1, to = leg.to;
    if (!el) { el = document.createElement("div"); el.className = "pplay"; box.appendChild(el); }
    box.classList.add("playing");
    el.innerHTML = '<div class="pptop"><button type="button" class="mlx" data-pplayx aria-label="' + esc(t("Stop playing")) + '">×</button>' +
      '<div class="ppcnt"><b>' + (leg.k + 1) + "</b><span>/" + leg.n + "</span></div>" +
      '<div class="ppnow"><small>' + esc(to.lab === "E" ? t("Extract") : t("Next stop")) + "</small><b>" + esc(to.name) + "</b>" + (to.cov.length ? '<span class="ppchips">' + to.cov.slice(0, 6).map(function (id) { return "<span>" + thumb(id) + esc(nm(id)) + "</span>"; }).join("") + (to.cov.length > 6 ? "<span>+" + (to.cov.length - 6) + "</span>" : "") + "</span>" : "") + "</div></div>" +
      '<div class="ppbar"><i style="width:' + Math.round((leg.k + 1) / leg.n * 100) + '%"></i></div>' +
      '<div class="ppnav"><button type="button" class="btn orb sm" data-pplayb' + (leg.k ? "" : " disabled") + ' aria-label="' + esc(t("Previous stop")) + '">‹</button>' +
      (last ? '<button type="button" class="btn go orb" data-pplayx>' + esc(t("Done")) + "</button>" : '<button type="button" class="btn go orb" data-pplayn>' + esc(t("Next stop")) + " ›</button>") + "</div>";
  }
  document.addEventListener("keydown", function (e) {
    var P = MV.plan; if (!P || P.play == null || !$("#v-maps").classList.contains("on")) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "n") { e.preventDefault(); if (P.play < planLeg(P.play).n - 1) planPlayGo(P.play + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); if (P.play > 0) planPlayGo(P.play - 1); }
    else if (e.key === "Escape") planPlayStop();
  });
  function renderPlanRes() {
    var box = $("#ppres"), P = MV.plan; if (!box || !P) return;
    var q = (P.q || "").trim().toLowerCase(); if (!q) { box.innerHTML = ""; return; }
    var key = mapImgKey(), have = {}; planItems().forEach(function (x) { have[x.id] = 1; });
    var hits = ITEMS.filter(function (i) { return !have[i.id] && i.sp && i.sp.c && i.sp.c[key] && i.n.toLowerCase().indexOf(q) > -1; }).slice(0, 6);
    box.innerHTML = hits.length ? hits.map(function (i) { return '<button type="button" data-padd="' + i.id + '">' + thumb(i.id) + "<span>" + esc(i.n) + "</span><small>" + fmt(i.sp.c[key]) + "</small></button>"; }).join("") : '<p class="dim">' + esc(t("No item by that name has spots on this map.")) + "</p>";
  }
  function planOpen() {
    MV.item = MV.quest = ""; MV.layersOpen = false; var lp = $("#mlayp"); if (lp) lp.hidden = true;
    MV.plan = { spawn: null, stops: null, ext: "auto", max: planSt.max, picking: true, q: "", tab: "" };
    renderFocus(); mkKeyPins(); var b = $("#mview [data-mplan]"); if (b) b.setAttribute("aria-expanded", "true");
    mkGet(mapImgKey(), function () { renderPlan(); mkSoon(); }); mkTabsSync();
  }
  function planListIds() { var ids = []; shop.g.forEach(function (g) { Object.keys(g.items).forEach(function (id) { if (planMissing(id) && ids.indexOf(id) < 0) ids.push(id); }); }); return ids; }
  function planMapScores() {
    var sc = {}; planListIds().forEach(function (id) { var c = mkSpots(id); Object.keys(c).forEach(function (k) { var m = k.indexOf("stella_") === 0 ? "stella" : k; sc[m] = sc[m] || { n: 0, s: 0, best: k, bs: 0 }; if (!sc[m]["i" + id]) { sc[m]["i" + id] = 1; sc[m].n++; } sc[m].s += c[k]; if (c[k] > sc[m].bs && m === "stella") { sc[m].bs = c[k]; sc[m].best = k; } }); });
    return sc;
  }
  function planFromList() {
    var ids = planListIds();
    if (!ids.length) { toast(t("Your shopping list has nothing left to find."), true); return; }
    var sc = planMapScores(), best = Object.keys(sc).sort(function (a, b) { return sc[b].n - sc[a].n || sc[b].s - sc[a].s; })[0];
    if (!best) { toast(t("Nothing on your list has marked spots on a map yet."), true); return; }
    if (best === "stella") MV.layer = sc[best].best.slice(7);
    MV.item = MV.quest = ""; MV.plan = null; curMap = best; MV.z = 1; MV.x = 0; MV.y = 0; renderMapList(); renderMapDetail(); go("maps");
    setTimeout(function () {
      planOpen(); var box = $("#mview"); if (!box) return;
      var top = box.getBoundingClientRect().top + window.pageYOffset - Math.max(80, (innerHeight - box.offsetHeight) / 2);
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    }, 80);
  }
  function planShare() {
    var P = MV.plan, data = MK[mapImgKey()]; if (!P || !P.spawn || !P.stops || !data) return;
    var o = { v: 1, k: mapImgKey(), s: [Math.round(P.spawn[0] * 10) / 10, Math.round(P.spawn[1] * 10) / 10], e: P.end != null ? P.end : -1, n: planSt.max,
      i: planItems().filter(function (x) { return x.on && x.kind === "loot"; }).map(function (x) { return x.id; }),
      x: P.end != null ? (data.n[P.end] || MKT[data.m[P.end][2]][2]) : "", c: P.stops.length };
    var url = location.origin + location.pathname + "#maps?route=r" + b64u(new TextEncoder().encode(JSON.stringify(o)));
    P.shareUrl = url; renderPlan();
    var done = function () { toast(t("Route link copied. Paste it anywhere, or into /share in Discord."), true); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () {}); } catch (er) {}
    var i = $("#mplanp .ppshare input"); if (i) { i.focus(); i.select(); }
  }
  /* Send to app: the stops as they are drawn here, for the desktop app's map. Synced straight to the app when sync is on,
     otherwise copied as a link to paste in the app (Settings → Map and route). */
  function planSendApp() {
    var P = MV.plan, key = mapImgKey(), data = MK[key]; if (!P || !P.spawn || !P.stops || !data) return;
    var r1 = function (v) { return Math.round(v * 10) / 10; };
    var o = { k: key, n: MAPS[curMap] + " · " + P.stops.length + " " + t("stops"), at: Date.now(), spawn: [r1(P.spawn[0]), r1(P.spawn[1])],
      stops: P.stops.map(function (st) { return { p: [r1(st.p[0]), r1(st.p[1])], w: planStopName(st, data), ids: st.cov.slice(0, 12) }; }),
      end: P.end != null && data.m[P.end] ? { p: [r1(data.m[P.end][0]), r1(data.m[P.end][1])], n: data.n[P.end] || t("Extraction") } : null };
    if (syncSendRoute(o)) { toast(t("Sent to the app. It shows up on the app's map in a few seconds."), true); return; }
    var url = location.origin + location.pathname + "#app-route=" + b64u(new TextEncoder().encode(JSON.stringify(o)));
    copyText(url, function () {});
    toast(t("Link copied. In the app, open Map and paste it under Route. Turn on Sync on your shopping list to skip this step."), true);
  }
  function planLoadShared(code) {
    var o; try { o = JSON.parse(new TextDecoder().decode(unb64u(code.slice(1)))); } catch (er) { o = null; }
    var key = o && String(o.k || ""), m = key.indexOf("stella_") === 0 ? "stella" : key;
    if (!o || code[0] !== "r" || !MAPS[m] || !Array.isArray(o.i) || !Array.isArray(o.s)) { toast(t("That route link is broken or incomplete."), true); return; }
    if (m === "stella") MV.layer = key.slice(7);
    MV.item = MV.quest = ""; MV.plan = null; curMap = m; MV.z = 1; MV.x = 0; MV.y = 0; renderMapList(); renderMapDetail();
    setTimeout(function () {
      planOpen(); var P = MV.plan;
      P.fixed = o.i.filter(function (id) { return IDX[id]; }).slice(0, 60); P.fixOff = {}; P.spawn = [+o.s[0] || 0, +o.s[1] || 0]; P.picking = false;
      planSt.max = P.max = Math.max(3, Math.min(80, +o.n || 20));
      mkGet(key, function (data) {
        if (MV.plan !== P) return;
        P.ext = data && planExits(data).indexOf(+o.e) > -1 ? +o.e : "auto";
        planRefresh(); planFit();
        var box = $("#mview"); if (box) window.scrollTo({ top: Math.max(0, box.getBoundingClientRect().top + window.pageYOffset - 80), behavior: "instant" });
      });
    }, 80);
  }
  function planClose() { cancelAnimationFrame(mvAnim); MV.plan = null; renderPlan(); mkKeyPins(); mkTabsSync(); var b = $("#mview [data-mplan]"); if (b) b.setAttribute("aria-expanded", "false"); mkSoon(); }
  function planRefresh() { if (MV.plan) MV.plan.play = null; if (MV.plan && MV.plan.spawn) planCompute(); renderPlan(); mkSoon(); }
  function planPick(e, box) {
    var P = MV.plan, d = MAPIMG[mapImgKey()], data = MK[mapImgKey()]; if (!P || !d || !data) return;
    var r = box.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, s = Math.min(box.clientWidth / d.w, box.clientHeight / d.h) * MV.z;
    var hit = mkHit(sx, sy), p = hit ? [data.m[hit[2]][0], data.m[hit[2]][1]] : [(sx - MV.x) / s, (sy - MV.y) / s];
    P.spawn = p; P.picking = false; hideTT(); box.dataset.mkt = ""; planRefresh(); planFit();
  }
  function planFit() {
    var P = MV.plan, box = $("#mview"), d = MAPIMG[mapImgKey()], data = MK[mapImgKey()]; if (!P || !P.spawn || !box || !d) return;
    var ps = [P.spawn].concat((P.stops || []).map(function (x) { return x.p; })); if (P.end != null && data.m[P.end]) ps.push(data.m[P.end]);
    planZoomTo(ps, 90);
  }
  function planClick(e, box) {
    if (e.target.closest("[data-mplan]")) { if (MV.plan) planClose(); else planOpen(); return true; }
    if (!MV.plan) return false;
    if (e.target.closest("[data-pclose]")) { planClose(); return true; }
    var pm = e.target.closest("[data-pmap]"); if (pm) { var sc = planMapScores(), k = pm.dataset.pmap; if (k === "stella" && sc.stella) MV.layer = sc.stella.best.slice(7); selectMap(k); return true; }
    if (e.target.closest("[data-pshare]")) { planShare(); return true; }
    if (e.target.closest("[data-papp]")) { planSendApp(); return true; }
    if (e.target.closest("[data-pplay]")) { planPlayGo(0); return true; }
    var ps = e.target.closest("#mplanp [data-pst]"); if (ps && MV.plan.play != null) { planPlayGo(+ps.dataset.pst); return true; }
    if (e.target.closest("[data-pplayn]")) { planPlayGo(MV.plan.play + 1); return true; }
    if (e.target.closest("[data-pplayb]")) { planPlayGo(MV.plan.play - 1); return true; }
    if (e.target.closest("[data-pplayx]")) { planPlayStop(); return true; }
    if (e.target.closest("[data-pown]")) { MV.plan.fixed = null; MV.plan.shareUrl = ""; planRefresh(); return true; }
    if (e.target.closest("[data-pmin]")) { MV.plan.min = !MV.plan.min; renderPlan(); return true; }
    var pv = e.target.closest("[data-pview]"); if (pv) { MV.plan.view = pv.dataset.pview; renderPlan(); return true; }
    var tb = e.target.closest("[data-ptab]"); if (tb) { MV.plan.tab = tb.dataset.ptab; renderPlan(); mkSoon(); return true; }
    if (e.target.closest("[data-ppick]")) { MV.plan.picking = !MV.plan.picking; renderPlan(); mkSoon(); return true; }
    var a = e.target.closest("[data-padd]"); if (a) { if (planSt.add.indexOf(a.dataset.padd) < 0) planSt.add.push(a.dataset.padd); delete planSt.off[a.dataset.padd]; MV.plan.q = ""; planSave(); planRefresh(); return true; }
    var dl = e.target.closest("[data-pdel]"); if (dl) { e.preventDefault(); planSt.add = planSt.add.filter(function (x) { return x !== dl.dataset.pdel; }); planSave(); planRefresh(); return true; }
    return false;
  }
  function planChange(e) {
    var c = e.target; if (!MV.plan) return false;
    if (c.dataset && c.dataset.pit && MV.plan.fixed) { if (c.checked) delete MV.plan.fixOff[c.dataset.pit]; else MV.plan.fixOff[c.dataset.pit] = 1; planRefresh(); return true; }
    if (c.dataset && c.dataset.pit) { if (c.checked) delete planSt.off[c.dataset.pit]; else planSt.off[c.dataset.pit] = 1; planSave(); planRefresh(); return true; }
    if (c.id === "ppext") { MV.plan.ext = c.value; planRefresh(); return true; }
    if (c.id === "ppmax") { planSt.max = MV.plan.max = +c.value; planSave(); planRefresh(); return true; }
    return false;
  }
  function planInput(e) {
    if (!MV.plan) return;
    if (e.target.id === "ppq") { MV.plan.q = e.target.value; renderPlanRes(); }
    if (e.target.id === "ppmax") { var v = $("#ppmaxv"); if (v) v.textContent = e.target.value; }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-mshow]"); if (b) { e.preventDefault(); hideTT(); mapShowItem(b.dataset.mshow); return; }
    var q = e.target.closest && e.target.closest("[data-qmshow]"); if (q) { e.preventDefault(); e.stopPropagation(); hideTT(); mapShowQuest(q.dataset.qmshow); }
  }, true);
  function setSbw() { document.documentElement.style.setProperty("--sbw", Math.max(0, window.innerWidth - document.documentElement.clientWidth) + "px"); }
  setSbw();
  window.addEventListener("resize", function () { setSbw(); mvApply(); });
  function selectMap(k) { if (MV.plan) { MV.plan.spawn = null; MV.plan.stops = null; MV.plan.picking = true; MV.plan.ext = "auto"; MV.plan.tab = ""; MV.plan.play = null; } mTagQ = ""; mTagKind = "all"; curMap = k; MV.z = 1; MV.x = 0; MV.y = 0; renderMapList(); renderMapDetail(); }
  /* ---------- the Maps page opens on a grid of the maps; pick one and it grows into the map screen ---------- */
  var mapWantGrid = /^#maps$/.test(location.hash) && !document.documentElement.classList.contains("embed");
  function renderMapGrid() {
    // big cards: the map picture, then a box with the name, what's going on there now and a line about it
    $("#mapgrid").innerHTML = MAP_ORDER.map(function (k, n) {
      var m = MAPS[k];
      return '<button type="button" class="mpk orb" data-mapopen="' + k + '" style="--i:' + n + ';--img:url(bot/' + k + '.jpg)"><span class="mpi"><img src="bot/' + k + '.jpg" alt="" loading="lazy"><span class="mgo" aria-hidden="true">' + esc(t("Open map")) + ' →</span></span>' +
        '<span class="mpb"><span class="mpt"><b>' + esc(m.name) + "</b>" + (mapWip(k).length ? '<span class="wip">WIP</span>' : "") + '<small>' + esc(t(m.unlock || "")) + "</small></span>" +
        '<span class="mpe"><span class="now" data-evm="' + k + '" hidden></span><span class="nxt" data-evn="' + k + '"></span></span>' +
        '<span class="mpd">' + esc(t(m.blurb || "")) + "</span>" +
        '<span class="mpf"><span>' + (m.pois || []).length + " " + esc(t("named areas")) + "</span>" + ((m.events || []).length ? "<span>" + m.events.length + " " + esc(t("map conditions")) + "</span>" : "") + "</span></span></button>";
    }).join("");
    renderEvents();
  }
  function mapsGrid(on) {
    $("#v-maps").classList.toggle("pick", !!on); $("#mapsBack").hidden = !!on;
    if (on) renderMapGrid(); else $("#mapgrid").innerHTML = "";
  }
  function mapOpenFromGrid(k, card) {
    var open = function () { mapsGrid(false); selectMap(k); window.scrollTo(0, 0); };
    var im = card && card.querySelector("img"), calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!im || calm || !document.startViewTransition) { open(); return; }
    im.style.viewTransitionName = "mapzoom";
    var vt = document.startViewTransition(function () { open(); $("#mapstage").style.viewTransitionName = "mapzoom"; });
    vt.finished.then(function () { $("#mapstage").style.viewTransitionName = ""; }, function () { $("#mapstage").style.viewTransitionName = ""; });
  }
  $("#mapgrid").addEventListener("click", function (e) { var b = e.target.closest("[data-mapopen]"); if (b) mapOpenFromGrid(b.dataset.mapopen, b); });
  $("#mapsBack").addEventListener("click", function () { mapsGrid(true); window.scrollTo(0, 0); });
  // the Maps link in the menu always goes to the grid; links to something on a map go straight to that map
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#maps"]'); if (!a || document.documentElement.classList.contains("embed")) return;
    if (location.hash === "#maps") mapsGrid(true); else mapWantGrid = true;
  }, true);
  $("#maplist").addEventListener("click", function (e) {
    var c = e.target.closest(".mpcur"); if (c) { var o = !$("#maplist").classList.contains("open"); $("#maplist").classList.toggle("open", o); c.setAttribute("aria-expanded", String(o)); return; }
    var b = e.target.closest("button[data-mapsel]"); if (b) { $("#maplist").classList.remove("open"); selectMap(b.dataset.mapsel); }
  });
  document.addEventListener("click", function (e) { var ml = $("#maplist"); if (ml && ml.classList.contains("open") && !ml.contains(e.target)) { ml.classList.remove("open"); var c = ml.querySelector(".mpcur"); if (c) c.setAttribute("aria-expanded", "false"); } });

  document.addEventListener("click", function (e) {
    var m = e.target.closest("button[data-map]"); if (m) { selectMap(m.dataset.map); go("maps"); return; }
    var f = e.target.closest("button[data-find]"); if (f) { var fid = itemIdByName(f.dataset.find); if (fid) drwOpen("item", fid); else findItem(f.dataset.find); }
  });

