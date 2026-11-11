  /* ---------- map markers (MetaForge community map) ---------- */
  var MFD = DB.mf || null, MKT = MFD ? MFD.types : [], MKLOOT = MFD ? MFD.loot : [];
  // glyphs on a 24x24 grid, drawn as strokes
  var MKG = [
    { k: "ext", n: "Extraction", c: "#ff6b6b", m: ["locations:extraction", "locations:metro_entrance"], on: 1, g: "M12 17V6M7.5 10.5 12 6l4.5 4.5M7 19h10" },
    { k: "hat", n: "Raider hatches", c: "#f2c94c", m: ["locations:hatch"], on: 1, g: "M6 9h12v9H6zM9 9V6h6v3M9 12.5h6M9 15.5h6" },
    { k: "spn", n: "Player spawns", c: "#e8ecff", m: ["locations:player_spawn"], on: 0, g: "M12 5.5a2.3 2.3 0 1 1 0 4.6a2.3 2.3 0 1 1 0-4.6zM7.5 19c0-4 2-6 4.5-6s4.5 2 4.5 6" },
    { k: "sup", n: "Supply stations", c: "#7fa8ff", m: ["locations:supply_station"], on: 0, g: "M5 10.5 12 6l7 4.5v7.5H5zM9.5 18v-4h5v4" },
    { k: "lock", n: "Locked rooms and doors", c: "#4fe3ff", m: ["locations:locked_room", "locations:breach_room", "locations:fuel-cell", "locations:button"], on: 1, g: "M7 11h10v8H7zM9 11V8.5a3 3 0 0 1 6 0V11M12 14v2" },
    { k: "trav", n: "Ziplines and lifts", c: "#5cff9a", m: ["locations:zipline", "locations:gondola_landing", "locations:mast_lift"], on: 0, g: "M4 7l16 5M12 9.5V15M9 15h6v3H9z" },
    { k: "loc", n: "Other places", c: "#ff9f4a", cat: "locations", on: 0, g: "M12 4.5c3 0 5 2.2 5 5 0 3.8-5 9.5-5 9.5s-5-5.7-5-9.5c0-2.8 2-5 5-5zM12 8a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3z" },
    { k: "con", n: "Containers", c: "#c9b6ff", cat: "containers", sub: 1, on: 0, g: "M5 9h14v9H5zM5 9l2-3h10l2 3M10 12.5h4" },
    { k: "arc", n: "ARC", c: "#ff5c93", cat: "arc", sub: 1, on: 0, g: "M3.5 12S7 6.5 12 6.5 20.5 12 20.5 12 17 17.5 12 17.5 3.5 12 3.5 12zM12 10a2 2 0 1 1 0 4a2 2 0 1 1 0-4z" },
    { k: "nat", n: "Nature", c: "#86e06f", cat: "nature", sub: 1, on: 0, g: "M6 18c0-7 5-12 12-12 0 7-5 12-12 12zM6 18l6.5-6.5" },
    { k: "evt", n: "Events", c: "#ffd36b", cat: "events", sub: 1, on: 0, g: "M13 4 6.5 13.5h5L10.5 20 17.5 10.5h-5z" },
    { k: "qst", n: "Quests", c: "#c49bff", cat: "quests", sub: 1, on: 0, g: "M8 20V5M8 5.5h9l-2 3.5 2 3.5H8" }
  ];
  var MKGI = {}; MKG.forEach(function (g) { MKGI[g.k] = g; });
  var MKTG = MKT.map(function (t) {
    var key = t[0] + ":" + t[1];
    for (var i = 0; i < MKG.length; i++) if (MKG[i].m && MKG[i].m.indexOf(key) > -1) return MKG[i];
    for (var j = 0; j < MKG.length; j++) if (!MKG[j].m && MKG[j].cat === t[0]) return MKG[j];
    return null;
  });
  var mkLay = store("rt-mlay") || {}; // { g: {ext:true,...}, off: {"containers:car":1} }
  if (!mkLay.g) { mkLay.g = {}; MKG.forEach(function (g) { mkLay.g[g.k] = !!g.on; }); }
  if (!mkLay.off) mkLay.off = {};
  function mkSave() { store("rt-mlay", mkLay); }
  var MK_WAIT = {};
  function mkGet(key, cb) {
    if (MK[key]) return cb(MK[key]);
    if (!MKF[key]) return cb(null);
    if (MK_WAIT[key]) { MK_WAIT[key].push(cb); return; }
    MK_WAIT[key] = [cb];
    fetch(MKF[key]).then(function (r) { return r.json(); }).then(function (d) { MK[key] = d; }).catch(function () { MK[key] = { m: [], n: {}, s: {} }; })
      .then(function () { var l = MK_WAIT[key]; delete MK_WAIT[key]; l.forEach(function (f) { f(MK[key]); }); });
  }
  function mkItemMatch(id) {
    var it = IDX[id], sp = it && it.sp; if (!sp) return null;
    var ts = {}; (sp.t || []).forEach(function (x) { ts[x] = 1; });
    return function (r) { return ts[r[2]] || (sp.la && r[4] && (r[4] & sp.la) && MKT[r[2]] && MKT[r[2]][0] === "containers"); };
  }
  function mkVisible(r) {
    var g = MKTG[r[2]]; if (!g || !mkLay.g[g.k]) return false;
    var t = MKT[r[2]]; return !mkLay.off[t[0] + ":" + t[1]];
  }
  function mkLootTxt(m) { var o = []; MKLOOT.forEach(function (c, i) { if (m & (1 << i)) o.push(t(c)); }); return o.join(", "); }
  function mkSpots(id) { var it = IDX[id]; return (it && it.sp && it.sp.c) || {}; }
  function mkMapCount(id, k) { var c = mkSpots(id); return k === "stella" ? (c.stella_u || 0) + (c.stella_l || 0) : c[k] || 0; }
  function mkWhat(id) {
    var sp = (IDX[id] || {}).sp || {}, parts = [];
    (sp.t || []).forEach(function (x) { if (MKT[x]) parts.push(MKT[x][2]); });
    if (sp.la) parts.push(t("containers in") + " " + mkLootTxt(sp.la) + " " + t("areas"));
    return parts.join(", ");
  }
  /* what is shown on its own right now: one item, or one quest */
  function mkFocus() {
    if (MV.plan) return null;
    if (MV.item && IDX[MV.item] && IDX[MV.item].sp) {
      var id = MV.item;
      return { kind: "item", id: id, name: nm(id), match: mkItemMatch(id), c: mkSpots(id), what: mkWhat(id) };
    }
    var q = MV.quest && QIDX[MV.quest];
    if (q && q.mk) {
      var ts = {}; q.mk.t.forEach(function (x) { ts[x] = 1; });
      return { kind: "quest", id: q.id, name: qName(q), match: function (r) { return ts[r[2]]; }, c: q.mk.c, route: q.mk.route ? q.mk.st : null,
        what: q.mk.kw ? t("Any of these will do") + ": " + q.mk.t.map(function (x) { return MKT[x] ? MKT[x][2] : ""; }).join(", ") : "" };
    }
    return null;
  }
  function mkFocusCount(f, k) { return k === "stella" ? (f.c.stella_u || 0) + (f.c.stella_l || 0) : f.c[k] || 0; }

  /* sprites: drawn once per look and size, then stamped */
  var SPR = {}, ICIMG = {};
  function sprBadge(g, d, dpr, glyph) {
    var key = "b" + g.k + d + "_" + dpr + (glyph ? "g" : ""); if (SPR[key]) return SPR[key];
    var c = document.createElement("canvas"), px = Math.ceil((d + 4) * dpr); c.width = c.height = px;
    var x = c.getContext("2d"); x.scale(dpr, dpr); var m = (d + 4) / 2, r = d / 2;
    x.beginPath(); x.arc(m, m, r, 0, 6.2832); x.fillStyle = "rgba(11,15,38,.92)"; x.fill();
    x.lineWidth = Math.max(1.3, d / 9); x.strokeStyle = g.c; x.stroke();
    if (glyph) {
      x.save(); var sc = d / 24 * 0.8; x.translate(m - 12 * sc, m - 12 * sc); x.scale(sc, sc);
      x.lineWidth = 2.3; x.lineJoin = "round"; x.lineCap = "round"; x.strokeStyle = g.c; x.stroke(new Path2D(g.g)); x.restore();
    } else { x.beginPath(); x.arc(m, m, r * 0.38, 0, 6.2832); x.fillStyle = g.c; x.fill(); }
    return (SPR[key] = c);
  }
  function sprPin(kind, id, label, w, dpr) {
    var key = "p" + kind + id + label + w + "_" + dpr; if (SPR[key]) return SPR[key];
    var h = w * 38 / 30, c = document.createElement("canvas"); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    var x = c.getContext("2d"); x.scale(dpr * w / 30, dpr * w / 30);
    var col = kind === "quest" ? "#c49bff" : kind === "plan" ? "#5ff2ea" : "#ffe066";
    x.fillStyle = "#0b0f26"; x.strokeStyle = col; x.lineWidth = 2.4;
    var p = new Path2D("M15 37C15 37 2 22 2 14a13 13 0 0 1 26 0c0 8-13 23-13 23z"); x.fill(p); x.stroke(p);
    if (kind === "item") {
      var im = ICIMG[id];
      if (!im && ICONS[id]) { im = ICIMG[id] = new Image(); im.onload = function () { Object.keys(SPR).forEach(function (k) { if (k.indexOf("pitem" + id) === 0) delete SPR[k]; }); mkSoon(); }; im.src = ICONS[id]; }
      if (im && im.complete && im.naturalWidth) {
        x.save(); x.beginPath(); x.arc(15, 14, 9.5, 0, 6.2832); x.clip();
        var it2 = IDX[id]; x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--r-" + String((it2 && it2.r) || "common").toLowerCase()).trim() || "#6c7aa0"; x.globalAlpha = .45; x.fill(); x.globalAlpha = 1;
        var s2 = 19 / Math.max(im.naturalWidth, im.naturalHeight); x.drawImage(im, 15 - im.naturalWidth * s2 / 2, 14 - im.naturalHeight * s2 / 2, im.naturalWidth * s2, im.naturalHeight * s2); x.restore();
      } else { x.beginPath(); x.arc(15, 14, 4, 0, 6.2832); x.fillStyle = col; x.fill(); }
    } else if (label) {
      x.fillStyle = col; x.font = "800 " + (label.length > 1 ? 11 : 13) + "px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(label, 15, 14.5);
    } else {
      x.save(); x.translate(15 - 12 * 0.62, 14 - 12 * 0.62); x.scale(0.62, 0.62); x.lineWidth = 2.6; x.lineJoin = "round"; x.lineCap = "round"; x.strokeStyle = col; x.stroke(new Path2D(MKGI.qst.g)); x.restore();
    }
    return (SPR[key] = c);
  }
  var mkRaf = 0, mkPts = [];
  function mkSoon() { if (!mkRaf) mkRaf = requestAnimationFrame(function () { mkRaf = 0; mkDraw(); }); }
  function mkDraw() {
    var box = $("#mview"), cv = $("#mkc"); if (!box || !cv) return;
    var W = box.clientWidth, H = box.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var cx = cv.getContext("2d"); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    mkPts = [];
    var key = mapImgKey(), d = MAPIMG[key], data = MK[key];
    if (!d || !data) return;
    if (MV.plan) { planDraw(cx, data, Math.min(W / d.w, H / d.h) * MV.z, W, H, dpr); return; }
    var s = Math.min(W / d.w, H / d.h) * MV.z, f = mkFocus(), list = data.m, on = [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (f ? !f.match(r) : !mkVisible(r)) continue;
      var x = MV.x + r[0] * s, y = MV.y + r[1] * s;
      if (x < -30 || y < -40 || x > W + 30 || y > H + 30) continue;
      on.push([x, y, i]);
    }
    if (f) {
      var pw = Math.round(22 + Math.min(8, (MV.z - 1) * 2)), ph = pw * 38 / 30;
      if (f.route) {
        // one stop per step, each the closest to the step before, joined by a dashed line
        var bySt = {}; on.forEach(function (p) { var st = data.s && data.s[p[2]]; if (st) (bySt[st] = bySt[st] || []).push(p); });
        var steps = Object.keys(bySt).map(Number).sort(function (a, b) { return a - b; }), path = [];
        steps.forEach(function (st) { var c = bySt[st], prev = path[path.length - 1]; path.push(prev ? c.slice().sort(function (a, b) { return Math.hypot(a[0] - prev[0], a[1] - prev[1]) - Math.hypot(b[0] - prev[0], b[1] - prev[1]); })[0] : c[0]); });
        if (path.length > 1) {
          cx.save(); cx.lineWidth = 3; cx.strokeStyle = "rgba(196,155,255,.85)"; cx.setLineDash([7, 6]); cx.lineCap = "round";
          cx.shadowColor = "rgba(0,0,0,.7)"; cx.shadowBlur = 4;
          cx.beginPath(); path.forEach(function (p, k) { if (k) cx.lineTo(p[0], p[1] - 2); else cx.moveTo(p[0], p[1] - 2); }); cx.stroke(); cx.restore();
        }
      }
      on.sort(function (a, b) { return a[1] - b[1]; });
      on.forEach(function (p) {
        var st = f.route && data.s ? data.s[p[2]] : 0;
        cx.drawImage(sprPin(f.kind, f.kind === "item" ? f.id : "", st ? String(st) : "", pw, dpr), p[0] - pw / 2, p[1] - ph, pw, ph);
        mkPts.push([p[0], p[1] - ph * 0.62, p[2], ph * 0.45]);
      });
      return;
    }
    // a lot on screen: small rings; zoom in for the icons
    var dense = on.length > 500 && MV.z < 2.2, dd = dense ? 9 : Math.round(15 + Math.min(7, (MV.z - 1) * 1.8));
    var rank = function (p) { var g = MKTG[list[p[2]][2]]; return g ? MKG.indexOf(g) : 0; };
    on.sort(function (a, b) { return rank(b) - rank(a); });
    on.forEach(function (p) {
      var g = MKTG[list[p[2]][2]] || MKGI.loc, big = !g.cat || g.k === "loc";
      var size = dense && !big ? dd : Math.max(dd, 15), sp = sprBadge(g, size, dpr, !(dense && !big));
      cx.drawImage(sp, p[0] - (size + 4) / 2, p[1] - (size + 4) / 2, size + 4, size + 4);
      mkPts.push([p[0], p[1], p[2], size / 2 + 3]);
    });
  }
  function mkHit(px, py) {
    var best = null, bd = 1e9;
    for (var i = mkPts.length - 1; i >= 0; i--) { var p = mkPts[i], dd = Math.hypot(p[0] - px, p[1] - py); if (dd < Math.max(9, p[3]) && dd < bd) { bd = dd; best = p; } }
    return best;
  }
  function mkTip(p, ev) {
    var sk = planStopAt(p[2]); if (sk > -1) { planTipAt(planStopTip(sk), { left: ev.clientX - 14, top: ev.clientY - 14, width: 28, height: 28, right: ev.clientX + 14, bottom: ev.clientY + 14 }); return; }
    var data = MK[mapImgKey()], r = data.m[p[2]], ty = MKT[r[2]], g = MKTG[r[2]], f = mkFocus();
    var nmx = data.n[p[2]], sub = [g ? t(g.n) : "", ty[2]].filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(" · ");
    var body = [], st = f && f.route && data.s ? data.s[p[2]] : 0;
    if (st && f.route[st - 1]) body.push(t("Step") + " " + st + ": " + f.route[st - 1]);
    if (r[4]) body.push(t("Loot area") + ": " + mkLootTxt(r[4]));
    if (r[3] & 1) body.push(t("Behind a locked door"));
    if (r[3] & 2) body.push(t("Only during some map conditions"));
    tt.innerHTML = "<b>" + esc(nmx || ty[2]) + "</b><small>" + esc(sub) + "</small>" + (body.length ? "<p>" + body.map(esc).join("<br>") + "</p>" : "");
    tt.hidden = false;
    var w = tt.offsetWidth, h = tt.offsetHeight, x = Math.max(8, Math.min(innerWidth - w - 8, ev.clientX - w / 2)), y = ev.clientY - h - 18;
    if (y < 8) y = ev.clientY + 18;
    tt.style.left = x + "px"; tt.style.top = y + "px";
  }
  function mkCounts(key) {
    var data = MK[key], c = {}; if (!data) return c;
    data.m.forEach(function (r) { var g = MKTG[r[2]]; if (!g) return; c[g.k] = (c[g.k] || 0) + 1; var tk = MKT[r[2]][0] + ":" + MKT[r[2]][1]; c[tk] = (c[tk] || 0) + 1; });
    return c;
  }
  function mkIcon(g) { return '<svg class="mlsw" viewBox="0 0 24 24" style="--c:' + g.c + '"><circle cx="12" cy="12" r="10.5"/><path d="' + g.g + '"/></svg>'; }
  var mkOpen = {};
  function renderLayers() {
    var el = $("#mlayp"); if (!el) return;
    var key = mapImgKey(), c = mkCounts(key), f = mkFocus();
    if (!MK[key]) { el.innerHTML = '<p class="dim">' + esc(t("Loading markers…")) + "</p>"; return; }
    var html = '<div class="mlh2"><b>' + esc(t("Filter map")) + '</b><button type="button" class="mlx" data-mlclose aria-label="' + esc(t("Close")) + '">×</button></div>';
    if (f) html += '<label class="mlr mlonly"><input type="checkbox" data-mlfoc checked><span>' + esc(t("Only")) + ": <b>" + esc(f.name) + "</b></span></label>" +
      '<p class="mlnote2">' + esc(t("Everything else is hidden. Untick this, or tick anything below, to go back to your filter.")) + "</p>";
    var pins = keysOnImg(key);
    if (pins.length) html += '<label class="mlr"><input type="checkbox" data-mlkeys' + (MV.keys && !f ? " checked" : "") + '><svg class="mlsw key" viewBox="0 0 30 38"><path d="M15 37C15 37 2 22 2 14a13 13 0 0 1 26 0c0 8-13 23-13 23z"/><circle cx="11.5" cy="13" r="4"/><path d="M15 14.5h8m-3 0v3.5m3-3.5v2.5"/></svg><span>' + esc(t("Key rooms")) + "</span><small>" + pins.length + "</small></label>";
    MKG.forEach(function (g) {
      if (!c[g.k]) return;
      var subs = [];
      if (g.sub) MKT.forEach(function (ty, i) { var tk = ty[0] + ":" + ty[1]; if (MKTG[i] === g && c[tk]) subs.push([tk, ty[2], c[tk]]); });
      subs.sort(function (a, b) { return b[2] - a[2]; });
      var gon = mkLay.g[g.k] && !f;
      html += '<div class="mlg"><label class="mlr"><input type="checkbox" data-mlg="' + g.k + '"' + (gon ? " checked" : "") + ">" + mkIcon(g) + "<span>" + esc(t(g.n)) + "</span><small>" + fmt(c[g.k]) + "</small>" +
        (subs.length > 1 ? '<button type="button" class="mlexp" data-mlexp="' + g.k + '" aria-expanded="' + !!mkOpen[g.k] + '" aria-label="' + esc(t("Show types")) + '"></button>' : "") + "</label>";
      if (subs.length > 1 && mkOpen[g.k]) html += '<div class="mlsub">' + subs.map(function (s) { return '<label class="mlr"><input type="checkbox" data-mlt="' + esc(s[0]) + '"' + (!mkLay.off[s[0]] && gon ? " checked" : "") + (gon ? "" : " disabled") + "><span>" + esc(s[1]) + "</span><small>" + fmt(s[2]) + "</small></label>"; }).join("") + "</div>";
      html += "</div>";
    });
    html += '<div class="mlfoot"><button type="button" class="chip orb" data-mlall="1">' + esc(t("All on")) + '</button><button type="button" class="chip orb" data-mlall="0">' + esc(t("All off")) + '</button></div><p class="mlsrc">' + t("Markers from the <a href=\"https://metaforge.app/arc-raiders\" target=\"_blank\" rel=\"noopener\">MetaForge</a> community map.") + "</p>";
    el.innerHTML = html;
  }
  function mkKeyPins() {
    var pn = $("#mview .pins"); if (!pn) return;
    pn.innerHTML = MV.keys && !mkFocus() && !MV.plan ? pinGroups(keysOnImg(mapImgKey()), mapImgKey()).map(function (g) { return pinHtml(g, MAPIMG[mapImgKey()]); }).join("") : "";
  }
  function renderFocus() {
    var el = $("#mfoc"); if (!el) return;
    var f = mkFocus();
    if (!f) { el.hidden = true; el.innerHTML = ""; return; }
    var n = mkFocusCount(f, curMap), here = curMap === "stella" ? f.c["stella_" + MV.layer] || 0 : n;
    var other = MAP_ORDER.filter(function (k) { return k !== curMap && mkFocusCount(f, k); });
    var data = MK[mapImgKey()], present = {};
    if (f.route && data && data.s) Object.keys(data.s).forEach(function (i) { if (f.match(data.m[i])) present[data.s[i]] = 1; });
    var cnt = here ? fmt(here) + " " + esc(t(f.kind === "quest" ? (here === 1 ? "spot" : "spots") : here === 1 ? "marked spot" : "marked spots")) + (curMap === "stella" && n !== here ? " " + esc(t("on this floor")) + " (" + fmt(n) + " " + esc(t("in total")) + ")" : "") : esc(t("Nothing marked on this map"));
    var icon = f.kind === "item" ? thumb(f.id) : '<span class="th mfq"><svg viewBox="0 0 24 24"><path d="' + MKGI.qst.g + '"/></svg></span>';
    var steps = f.route ? '<ol class="mfst">' + f.route.map(function (x, i) { return "<li" + (present[i + 1] ? "" : ' class="no"') + "><i>" + (i + 1) + "</i>" + esc(x) + "</li>"; }).join("") + "</ol>" : "";
    el.hidden = false; el.className = "mfoc" + (f.kind === "quest" ? " q" : "");
    el.innerHTML = icon + '<div class="mfb"><b>' + esc(f.name) + '</b><span>' + (f.route ? esc(t("Route")) + " · " : "") + cnt + "</span>" + (f.what ? "<small>" + esc(f.what) + "</small>" : "") + steps +
      (other.length ? '<div class="mfo">' + esc(t("Also on")) + ": " + other.map(function (k) { return '<button type="button" data-mfmap="' + k + '">' + esc(MAPS[k].name) + " <em>" + fmt(mkFocusCount(f, k)) + "</em></button>"; }).join("") + "</div>" : "") +
      '</div><div class="mfa"><button type="button" class="mfx" data-mfclear aria-label="' + esc(t("Show my filter again")) + '" title="' + esc(t("Show my filter again")) + '">×</button>' + (f.kind === "item" ? '<button type="button" class="chip orb" data-find="' + esc(f.name) + '">' + esc(t("Item details")) + "</button>" : '<a class="chip orb" href="#quests">' + esc(t("Quest tracker")) + "</a>") + "</div>";
  }
  function mkFit() {
    var box = $("#mview"), key = mapImgKey(), d = MAPIMG[key], data = MK[key], f = mkFocus(); if (!box || !d || !data || !f) return;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    data.m.forEach(function (r) { if (f.match(r)) { n++; x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[0]); y1 = Math.max(y1, r[1]); } });
    var W = box.clientWidth, H = box.clientHeight, base = Math.min(W / d.w, H / d.h);
    if (!n) { MV.z = 1; MV.x = 0; MV.y = 0; mvApply(); return; }
    var pad = 70, z = Math.min((W - pad * 2) / Math.max(60, x1 - x0), (H - pad * 2) / Math.max(60, y1 - y0)) / base;
    MV.z = Math.max(1, Math.min(4, z)); var s = base * MV.z;
    MV.x = W / 2 - (x0 + x1) / 2 * s; MV.y = H / 2 - (y0 + y1) / 2 * s + 20; mvApply();
  }
  function mkShow(kind, id, mapKey) {
    var c = kind === "item" ? mkSpots(id) : (QIDX[id] && QIDX[id].mk && QIDX[id].mk.c) || {};
    var cnt = function (k) { return k === "stella" ? (c.stella_u || 0) + (c.stella_l || 0) : c[k] || 0; };
    var k = mapKey || (cnt(curMap) ? curMap : MAP_ORDER.filter(cnt).sort(function (a, b) { return cnt(b) - cnt(a); })[0]) || curMap;
    if (k === "stella") MV.layer = (c.stella_l || 0) > (c.stella_u || 0) ? "l" : "u";
    MV.item = kind === "item" ? id : ""; MV.quest = kind === "quest" ? id : ""; MV.layersOpen = false; MV.plan = null;
    var same = k === curMap && location.hash === "#maps";
    if (!same) { curMap = k; MV.z = 1; MV.x = 0; MV.y = 0; renderMapList(); renderMapDetail(); go("maps"); }
    else { var keep = { z: MV.z, x: MV.x, y: MV.y }; renderMapDetail(); MV.z = keep.z; MV.x = keep.x; MV.y = keep.y; }
    setTimeout(function () {
      var box = $("#mview"); if (!box) return;
      var top = box.getBoundingClientRect().top + window.pageYOffset - Math.max(80, (innerHeight - box.offsetHeight) / 2);
      window.scrollTo({ top: Math.max(0, top), behavior: same ? "smooth" : "instant" });
      mkGet(mapImgKey(), function () { mkFit(); renderFocus(); });
    }, 80);
  }
  function mapShowItem(id, mapKey) { if (!IDX[id] || !IDX[id].sp) { findItem(nm(id)); return; } mkShow("item", id, mapKey); }
  function mapShowQuest(id, mapKey) { if (QIDX[id] && QIDX[id].mk) mkShow("quest", id, mapKey); }
  function mapClearItem() { MV.item = ""; MV.quest = ""; var keep = { z: MV.z, x: MV.x, y: MV.y }; renderMapDetail(); MV.z = keep.z; MV.x = keep.x; MV.y = keep.y; mvApply(); }
  function mkUIClick(e, box) {
    if (e.target.closest("button[data-mlay]") && MV.plan) planClose();
    if (e.target.closest("button[data-mlay]") || e.target.closest("[data-mlclose]")) { MV.layersOpen = !MV.layersOpen; var lp = $("#mlayp"), lb = box.querySelector("[data-mlay]"); lp.hidden = !MV.layersOpen; if (lb) lb.setAttribute("aria-expanded", String(MV.layersOpen)); if (MV.layersOpen) renderLayers(); return true; }
    var ex = e.target.closest("[data-mlexp]"); if (ex) { e.preventDefault(); mkOpen[ex.dataset.mlexp] = !mkOpen[ex.dataset.mlexp]; renderLayers(); return true; }
    var al = e.target.closest("[data-mlall]"); if (al) { var on = al.dataset.mlall === "1"; MKG.forEach(function (g) { mkLay.g[g.k] = on; }); mkLay.off = {}; MV.keys = on; MV.item = MV.quest = ""; mkSave(); renderFocus(); mkKeyPins(); renderLayers(); mkSoon(); renderMapLoot(); return true; }
    if (e.target.closest("[data-mfclear]")) { mapClearItem(); return true; }
    var fm = e.target.closest("[data-mfmap]"); if (fm) { if (MV.quest) mapShowQuest(MV.quest, fm.dataset.mfmap); else mapShowItem(MV.item, fm.dataset.mfmap); return true; }
    return false;
  }
  function mkUIChange(e) {
    var c = e.target; if (!c.matches || !c.matches("input[type=checkbox]")) return;
    var hadFocus = !!mkFocus();
    if (c.hasAttribute("data-mlfoc")) { MV.item = MV.quest = ""; }
    else {
      if (hadFocus) { MV.item = MV.quest = ""; }
      if (c.dataset.mlg) { mkLay.g[c.dataset.mlg] = c.checked; }
      else if (c.dataset.mlt) { if (c.checked) delete mkLay.off[c.dataset.mlt]; else mkLay.off[c.dataset.mlt] = 1; }
      else if (c.hasAttribute("data-mlkeys")) MV.keys = c.checked;
    }
    mkSave(); renderFocus(); mkKeyPins(); renderLayers(); mkSoon();
    if (hadFocus) renderMapLoot();
  }


