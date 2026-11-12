  /* ---------- loot on this map: by area type (the loot icons on the in-game map), plus what is special here ---------- */
  var LOOT_CATS = ["Residential", "Commercial", "Industrial", "Medical", "Electrical", "Mechanical", "Technological", "Security", "Old World", "Exodus", "Raider", "Nature", "ARC"];
  var mlCat = null, mlQ = "";
  function lootHere() {
    var here = [], byCat = {};
    Object.keys(GUIDE).forEach(function (id) { var g = GUIDE[id]; if (IDX[id] && g.m.indexOf(curMap) > -1 && g.m.length < 4) here.push(id); });
    LOOT_CATS.forEach(function (c) { byCat[c] = []; });
    ITEMS.forEach(function (i) { if (!i.f) return; String(i.f).split(/\s*,\s*/).forEach(function (c) { if (byCat[c]) byCat[c].push(i.id); }); });
    var val = function (a, b) { return ((IDX[b] || {}).v || 0) - ((IDX[a] || {}).v || 0) || nm(a).localeCompare(nm(b)); };
    here.sort(val); LOOT_CATS.forEach(function (c) { byCat[c].sort(val); });
    return { here: here, byCat: byCat };
  }
  function lootTile(id, catLabel) {
    var it = IDX[id] || {}, g = GUIDE[id];
    var sub = [it.r || "", it.t || "", it.v != null ? fmt(it.v) + " coins" : ""].filter(Boolean).join(" · ");
    var body = g ? g.w : it.f ? t("Found in") + ": " + it.f : "", n = mkMapCount(id, curMap);
    var act = n ? 'data-mshow="' + id + '"' : 'data-find="' + esc(nm(id)) + '"';
    return '<button type="button" class="mlt' + (MV.item === id ? " on" : "") + '" ' + act + ' data-tt="' + esc(nm(id)) + '" data-ts="' + esc(sub) + '" data-tb="' + esc(body + (n ? "\n" + t("Marked on this map") + ": " + n + " (" + mkWhat(id) + ")" : "")) + '" data-th="' + esc(t(n ? "Click to mark where it turns up on the map" : "Click for item details")) + '">' + thumb(id) +
      '<span class="mltn">' + esc(nm(id)) + (catLabel ? "<small>" + esc(catLabel) + "</small>" : "") + "</span>" + (n ? '<b class="mlpin" title="' + esc(t("Marked spots on this map")) + '">' + PINSVG + fmt(n) + "</b>" : "") + (it.v != null ? '<em>' + fmt(it.v) + "</em>" : "") + "</button>";
  }
  function renderMapLoot() {
    var el = $("#mlMain"); if (!el) return;
    var L = lootHere(), m = MAPS[curMap], q = mlQ.trim().toLowerCase();
    var cats = (L.here.length ? [["here", t("Special here"), L.here]] : []).concat(LOOT_CATS.filter(function (c) { return L.byCat[c].length; }).map(function (c) { return [c, t(c), L.byCat[c]]; }));
    if (!mlCat || !cats.some(function (c) { return c[0] === mlCat; })) mlCat = cats.length ? cats[0][0] : null;
    var body, note;
    if (q) {
      var seen = {}, hits = [];
      cats.forEach(function (c) { c[2].forEach(function (id) { if (!seen[id] && nm(id).toLowerCase().indexOf(q) > -1) { seen[id] = 1; hits.push([id, c[1]]); } }); });
      note = hits.length + " " + t(hits.length === 1 ? "match" : "matches");
      body = hits.length ? hits.slice(0, 60).map(function (h) { return lootTile(h[0], h[1]); }).join("") : '<p class="dim mlnone">' + esc(t("Nothing by that name in this map's loot. Try the Item finder, it searches everything.")) + "</p>";
    } else {
      var cur = cats.filter(function (c) { return c[0] === mlCat; })[0];
      note = (mlCat === "here" ? t("Items the guides tie to this map or its conditions.") : t("Search containers in areas with this loot icon on the in-game map. Loot by area type is the same on every map.")) + (MFD ? " " + t("Items with a pin count can be marked on the map above.") : "");
      body = cur ? cur[2].map(function (id) { return lootTile(id); }).join("") : "";
    }
    el.innerHTML = '<header class="mlh"><h4>' + esc(t("Loot on")) + " " + esc(m.name) + '</h4><input type="search" id="mlQ" placeholder="' + esc(t("Search loot on this map…")) + '" value="' + esc(mlQ) + '" autocomplete="off" aria-label="' + esc(t("Search loot on this map…")) + '"></header>' +
      '<div class="mlcats" role="group" aria-label="' + esc(t("Area types")) + '">' + cats.map(function (c) { return '<button type="button" class="mlc' + (c[0] === "here" ? " here" : "") + '" data-mlcat="' + esc(c[0]) + '" aria-pressed="' + (!q && c[0] === mlCat) + '">' + esc(c[1]) + " <small>" + c[2].length + "</small></button>"; }).join("") + "</div>" +
      '<p class="mlnote dim">' + esc(note) + '</p><div class="mlgrid">' + body + "</div>";
  }
  function mapCondNames() {
    var m = MAPS[curMap], names = [];
    (m.events || []).forEach(function (n) { n = n === "Frigate" ? "ARC Frigate" : n; if (names.indexOf(n) < 0) names.push(n); });
    if (EV && EV.m && EV.m[curMap]) {
      var t0 = Date.parse(EV.t0), h = Math.floor((Date.now() - t0) / 3600000);
      for (var k = 0; k < EV.per; k++) evAt(curMap, h + k).split(" + ").forEach(function (n) { if (n && n !== "None" && names.indexOf(n) < 0) names.push(n); });
    }
    return names;
  }
  function renderMapSide() {
    var ke = $("#mlKeys"), co = $("#mlConds"); if (!ke || !co) return;
    var mk = KEYS.filter(function (k) { return k.m === curMap || (k.pin && String(k.pin[0]).indexOf(curMap) === 0); });
    ke.innerHTML = '<h4>' + esc(t("Keys here")) + " <small>" + mk.length + "</small></h4>" + (mk.length ? '<ul class="mlkl">' + mk.map(function (k) {
      return '<li><button type="button" data-kshow="' + k.id + '" data-tt="' + esc(nm(k.id)) + '" data-tb="' + esc(t("Opens") + ": " + k.door) + '">' + thumb(k.id) + '<span>' + esc(nm(k.id)) + "</span>" + (k.pin ? '<em>' + esc(t("Show")) + "</em>" : '<em class="dim">' + esc(t("No pin yet")) + "</em>") + "</button></li>";
    }).join("") + "</ul>" : '<p class="dim">' + esc(t("No keys known for this map yet.")) + "</p>");
    var cn = mlCondOrder();
    co.innerHTML = '<h4>' + esc(t("Conditions here")) + " <small>" + cn.length + "</small></h4>" + (cn.length ? '<ul class="mlcl">' + cn.map(function (n) {
      var ev = EVENTS.filter(function (e) { return e.n === n || (n === "ARC Frigate" && e.n === "Frigate"); })[0], maj = ev && ev.cat === "major";
      var f = evFind(n, [curMap]);
      return '<li' + (f ? "" : ' class="off"') + '><span class="mlcn"><i class="' + (maj ? "maj" : "min") + '"></i>' + esc(n) + '</span><span class="mlct" data-mlc="' + esc(n) + '"></span></li>';
    }).join("") + '</ul><p class="dim mlcnote">' + esc(t("Times are estimated from the recorded rotation.")) + "</p>" : '<p class="dim">' + esc(t("No conditions recorded for this map.")) + "</p>");
    mlCondTick();
  }
  function mlCondOrder() {
    var rows = mapCondNames().map(function (n, i) { var f = evFind(n, [curMap]); return [n, f ? (f.now ? -1e9 + f.s : f.s) : 1e12 + i]; });
    rows.sort(function (a, b) { return a[1] - b[1]; });
    return rows.map(function (r) { return r[0]; });
  }
  var mlOrd = "";
  function mlCondTick() {
    var ord = mlCondOrder().join("|"), co = $("#mlConds");
    if (co && mlOrd && ord !== mlOrd) { mlOrd = ord; renderMapSide(); return; }
    mlOrd = ord;
    Array.prototype.forEach.call(document.querySelectorAll("[data-mlc]"), function (el) {
      var f = evFind(el.dataset.mlc, [curMap]);
      el.className = "mlct" + (f && f.now ? " now" : "");
      el.textContent = !f ? t("not in rotation") : f.now ? t("now") + " · " + evClock(f.s) : t("in") + " " + evClock(f.s);
    });
  }
  setInterval(function () { var v = $("#v-maps"); if (v && v.classList.contains("on") && !document.hidden) mlCondTick(); }, 1000);
  $("#mapdetail").addEventListener("click", function (e) {
    var c = e.target.closest("[data-mlcat]"); if (c) { mlCat = c.dataset.mlcat; mlQ = ""; renderMapLoot(); return; }
  });
  $("#mapdetail").addEventListener("input", function (e) {
    if (e.target.id !== "mlQ") return; mlQ = e.target.value; renderMapLoot();
    var i = $("#mlQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  });
  $("#mapdetail").addEventListener("input", function (e) { if (e.target.id === "mtq") { mTagQ = e.target.value; renderMapTags(); } });
  $("#mapdetail").addEventListener("click", function (e) {
    var k = e.target.closest("[data-mtk]"); if (k) { mTagKind = k.dataset.mtk; renderMapTags(); return; }
    var q = e.target.closest("[data-mtq]"); if (q) { mTagQ = q.dataset.mtq; mTagKind = "all"; $("#mtq").value = mTagQ; renderMapTags(); hideTT(); return; }
    if (e.target.closest("#mtclear")) { mTagQ = ""; $("#mtq").value = ""; renderMapTags(); }
  });
  /* generic hover card for tags */
  var tt = document.createElement("div"); tt.id = "ttip"; tt.hidden = true; document.body.appendChild(tt);
  function showTT(b) {
    tt.innerHTML = "<b>" + esc(b.dataset.tt) + "</b>" + (b.dataset.ts ? "<small>" + esc(b.dataset.ts) + "</small>" : "") + (b.dataset.tb ? "<p>" + esc(b.dataset.tb).replace(/\n/g, "<br>") + "</p>" : "") + (b.dataset.th ? "<em>" + esc(b.dataset.th) + "</em>" : "");
    tt.hidden = false;
    var r = b.getBoundingClientRect(), w = tt.offsetWidth, h = tt.offsetHeight;
    var x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)), y = r.top - h - 8;
    if (y < 8) y = Math.min(innerHeight - h - 8, r.bottom + 8);
    tt.style.left = x + "px"; tt.style.top = y + "px";
  }
  function hideTT() { tt.hidden = true; }
  document.addEventListener("mouseover", function (e) { var b = e.target.closest && e.target.closest("[data-tt]"); if (b) showTT(b); });
  document.addEventListener("mouseout", function (e) { if (e.target.closest && e.target.closest("[data-tt]")) hideTT(); });
  document.addEventListener("focusin", function (e) { var b = e.target.closest && e.target.closest("[data-tt]"); if (b) showTT(b); });
  document.addEventListener("focusout", function (e) { if (e.target.closest && e.target.closest("[data-tt]")) hideTT(); });
  window.addEventListener("scroll", hideTT, { passive: true });
  window.addEventListener("hashchange", hideTT);

  var MV = { z: 1, x: 0, y: 0, key: "", layer: "u", keys: true, focus: "", item: "", quest: "", layersOpen: false };
  function mapImgKey() { return curMap === "stella" ? "stella_" + MV.layer : curMap; }
  function mvApply() {
    var box = $("#mview"), im = box && box.querySelector(".mi"); if (!im) return;
    var d = MAPIMG[mapImgKey()], W = box.clientWidth, H = box.clientHeight, base = Math.min(W / d.w, H / d.h);
    var s = base * MV.z, iw = d.w * s, ih = d.h * s;
    MV.x = iw <= W ? (W - iw) / 2 : Math.min(0, Math.max(W - iw, MV.x));
    MV.y = ih <= H ? (H - ih) / 2 : Math.min(0, Math.max(H - ih, MV.y));
    im.style.width = iw + "px"; im.style.height = ih + "px"; im.style.transform = "translate(" + MV.x + "px," + MV.y + "px)";
    tileSoon(); mkSoon();
  }
  var TS = 1024, tileRaf = 0;
  function tileSoon() { if (!tileRaf) tileRaf = requestAnimationFrame(function () { tileRaf = 0; tileUpdate(); }); }
  function tileUpdate() {
    var box = $("#mview"), layer = $("#tl"), im = box && box.querySelector(".mi");
    if (!layer || !im) return;
    var key = mapImgKey(), meta = (typeof TILES !== "undefined") && TILES[key];
    if (!meta) { layer.innerHTML = ""; return; }
    var W = box.clientWidth, H = box.clientHeight, iw = im.offsetWidth, ih = im.offsetHeight;
    var need = iw * Math.min(2, window.devicePixelRatio || 1), base = MAPIMG[key].w, lv = -1;
    if (need > base * 1.02) { lv = 0; for (var i = meta.L.length - 1; i >= 0; i--) { if (meta.L[i].w >= need) { lv = i; break; } } }
    var keep = {};
    if (lv >= 0) {
      var L = meta.L[lv];
      var fx0 = Math.max(0, -MV.x / iw), fx1 = Math.min(1, (W - MV.x) / iw), fy0 = Math.max(0, -MV.y / ih), fy1 = Math.min(1, (H - MV.y) / ih);
      var x0 = Math.floor(fx0 * L.w / TS), x1 = Math.min(L.nx - 1, Math.floor(fx1 * L.w / TS)), y0 = Math.floor(fy0 * L.h / TS), y1 = Math.min(L.ny - 1, Math.floor(fy1 * L.h / TS));
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) {
        var id = key + "/" + lv + "/" + x + "_" + y; keep[id] = 1;
        if (layer.querySelector('[data-t="' + id + '"]')) continue;
        var tw = Math.min(TS, L.w - x * TS), th = Math.min(TS, L.h - y * TS), img = new Image();
        img.alt = ""; img.draggable = false; img.dataset.t = id; img.decoding = "async";
        img.style.left = (x * TS / L.w * 100) + "%"; img.style.top = (y * TS / L.h * 100) + "%";
        img.style.width = "calc(" + (tw / L.w * 100) + "% + 1px)"; img.style.height = "calc(" + (th / L.h * 100) + "% + 1px)";
        img.onload = function () { this.classList.add("ld"); };
        img.src = "mt/" + id + ".webp";
        layer.appendChild(img);
      }
    }
    var hdb = $("#hdb"); if (hdb) hdb.classList.toggle("on", lv >= 0);
    Array.prototype.slice.call(layer.children).forEach(function (c) {
      if (keep[c.dataset.t]) return;
      var sameLevel = lv >= 0 && c.dataset.t.indexOf(key + "/" + lv + "/") === 0;
      if (sameLevel && layer.children.length < 60) return;
      layer.removeChild(c);
    });
  }
  function mvZoom(f, cx, cy) {
    var box = $("#mview"), nz = Math.max(1, Math.min(10, MV.z * f)), r = nz / MV.z;
    if (cx == null) { cx = box.clientWidth / 2; cy = box.clientHeight / 2; }
    MV.x = cx - (cx - MV.x) * r; MV.y = cy - (cy - MV.y) * r; MV.z = nz; mvApply();
  }
  function mapWip(k) {
    var img = MAPIMG[k === "stella" ? "stella_u" : k], ks = KEYS.filter(function (x) { return x.m === k; }), pinned = ks.filter(function (x) { return x.pin; }).length;
    var why = [];
    if (!img) why.push("no map image yet");
    if (ks.length && !pinned) why.push("key pins not placed yet");
    if (!MAPS[k].pois.length) why.push("named areas not added yet");
    return why;
  }
  function mapViewHtml() {
    var m = MAPS[curMap], d = MAPIMG[mapImgKey()];
    var pins = d ? keysOnImg(mapImgKey()) : [];
    var wipw = mapWip(curMap);
    var card = '<div class="mcard"><div class="tag-k">' + esc(m.unlock) + (wipw.length ? ' <span class="wip">WIP</span>' : "") + "</div><h3>" + esc(m.name) + "</h3>" + (EV && EV.m[curMap] ? '<div class="mcev" title="Estimated from the recorded rotation, can be off"><span id="mcevt"></span><select id="evReg" aria-label="Server region">' + EVREG.map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === evReg ? " selected" : "") + ">" + r[1] + "</option>"; }).join("") + "</select></div>" : "") + (wipw.length ? '<p class="wipn">Work in progress: ' + esc(wipw.join(", ")) + ".</p>" : "") +
      (curMap === "stella" ? '<div class="mbtns">' + (curMap === "stella" ? '<button type="button" data-layer="u" aria-pressed="' + (MV.layer === "u") + '">Upper</button><button type="button" data-layer="l" aria-pressed="' + (MV.layer === "l") + '">Lower</button>' : "") +
      "" + "</div>" : "") + "</div>";
    var open = "";
    if (!d) return '<div class="mview">' + card + '<div class="mnone">No map image is available for ' + esc(m.name) + " yet.</div>" + open + "</div>";
    return '<div class="mwrap"><div class="mview" id="mview"><div class="mi"><img alt=""In-game map of ' + esc(m.name) + '" src="' + d.u + '" draggable="false"><div class="tl" id="tl"></div><div class="pins">' + (MV.keys && !MV.item && !MV.quest && !MV.plan ? pinGroups(pins, mapImgKey()).map(function (g) { return pinHtml(g, d); }).join("") : "") + "</div></div>" +
      '<canvas class="mkc" id="mkc" aria-hidden="true"></canvas>' + card + '<div class="mctl"><button type="button" class="orb" data-mz="1.5" aria-label="Zoom in">+</button><button type="button" class="orb" data-mz="0.67" aria-label="Zoom out">−</button><button type="button" class="orb" data-mz="0" aria-label="Reset view">⟲</button>' + '</div><span class="hd" id="hdb" title="Lights up when full-resolution map tiles are showing">HD</span><div class="mhint">Scroll to zoom · drag to pan</div>' + open + "</div>" + mkDockHtml() + "</div>";
  }
  function mvInit() {
    var box = $("#mview"); if (!box) return;
    var pts = {}, last = null;
    box.addEventListener("wheel", function (e) { e.preventDefault(); var r = box.getBoundingClientRect(); mvZoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    var moved = 0, downAt = null;
    box.addEventListener("pointerdown", function (e) { if (e.target.closest("button, a, .mcard, .mlayp, .mplanp, .mfoc, .pplay, label, input, select")) return; box.setPointerCapture(e.pointerId); pts[e.pointerId] = [e.clientX, e.clientY]; downAt = [e.clientX, e.clientY]; moved = 0; box.classList.add("drag"); last = null; });
    box.addEventListener("pointermove", function (e) {
      if (Object.keys(pts).length) { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) moved = 1; return; }
      if (e.pointerType !== "mouse" || e.target.closest(".mcard, .mlayp, .mplanp, .mfoc, .mctl, .kpin, .pplay")) { box.classList.remove("mkhov"); return; }
      var r = box.getBoundingClientRect(), p = mkHit(e.clientX - r.left, e.clientY - r.top);
      box.classList.toggle("mkhov", !!p); if (p) mkTip(p, e); else if (box.dataset.mkt) hideTT();
      box.dataset.mkt = p ? "1" : "";
    });
    box.addEventListener("pointerleave", function () { if (box.dataset.mkt) { hideTT(); box.dataset.mkt = ""; } });
    box.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return;
      var ids = Object.keys(pts);
      if (ids.length === 2) {
        var o = pts[ids[0] == e.pointerId ? ids[1] : ids[0]], a = pts[e.pointerId], d0 = Math.hypot(a[0] - o[0], a[1] - o[1]);
        pts[e.pointerId] = [e.clientX, e.clientY]; var d1 = Math.hypot(e.clientX - o[0], e.clientY - o[1]);
        if (d0 > 0) { var r = box.getBoundingClientRect(); mvZoom(d1 / d0, (e.clientX + o[0]) / 2 - r.left, (e.clientY + o[1]) / 2 - r.top); }
        return;
      }
      MV.x += e.clientX - pts[e.pointerId][0]; MV.y += e.clientY - pts[e.pointerId][1]; pts[e.pointerId] = [e.clientX, e.clientY]; mvApply();
    });
    function up(e) {
      var was = !!pts[e.pointerId]; delete pts[e.pointerId]; if (!Object.keys(pts).length) box.classList.remove("drag");
      if (was && !moved && e.type === "pointerup" && MV.plan && MV.plan.picking && MV.plan.tab !== "arc") { planPick(e, box); return; }
      if (was && !moved && e.type === "pointerup") { var r = box.getBoundingClientRect(), p = mkHit(e.clientX - r.left, e.clientY - r.top); if (p) { mkTip(p, e); box.dataset.mkt = "1"; } else if (box.dataset.mkt) { hideTT(); box.dataset.mkt = ""; } }
    }
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    var wrap = box.parentNode;
    wrap.addEventListener("click", function (e) {
      var tb = e.target.closest("[data-mtab]");
      if (tb) { if (tb.dataset.mtab === "route") { if (!MV.plan) planOpen(); } else if (MV.plan) planClose(); return; }
      var z = e.target.closest("button[data-mz]"), l = e.target.closest("button[data-layer]");
      if (z) { var f = +z.dataset.mz; if (f === 0) { MV.z = 1; MV.x = 0; MV.y = 0; mvApply(); } else mvZoom(f); }
      if (l) { if (MV.plan) { MV.plan.spawn = null; MV.plan.stops = null; MV.plan.ext = "auto"; } MV.layer = l.dataset.layer; MV.z = 1; MV.x = 0; MV.y = 0; renderMapDetail(); }
      if (e.target.closest("button[data-ktog]")) { MV.keys = !MV.keys; var keep = { z: MV.z, x: MV.x, y: MV.y }; renderMapDetail(); MV.z = keep.z; MV.x = keep.x; MV.y = keep.y; mvApply(); }
      if (planClick(e, box)) return;
      if (mkUIClick(e, box)) return;
    });
    wrap.addEventListener("change", function (e) { if (!planChange(e)) mkUIChange(e); });
    wrap.addEventListener("input", planInput);
    if (MV.plan) mkGet(mapImgKey(), function () { renderPlan(); mkSoon(); });
    mvApply();
    renderFocus();
    mkGet(mapImgKey(), function () { mkSoon(); renderLayers(); renderFocus(); });
  }

