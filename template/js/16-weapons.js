  /* ---------- Weapons ---------- */
  var WEAPONS = DB.weapons, MODS = DB.mods;
  var WIDX = {}; WEAPONS.forEach(function (w) { WIDX[w.id] = w; });
  var ROMAN = ["", "I", "II", "III", "IV", "V"];
  var SLOT_NAME = { muzzle: "Muzzle", special: "Special", grip: "Grip", magazine: "Magazine", stock: "Stock" };
  var SLOT_ORDER = ["muzzle", "special", "grip", "magazine", "stock"];
  var wp = store("rt-wp1") || {};
  if (!wp.sel || !WIDX[wp.sel]) wp.sel = "kettle";
  ["own", "from", "to", "amp", "mods", "bp"].forEach(function (k) { if (!wp[k]) wp[k] = {}; });
  function saveWp() { store("rt-wp1", wp); }
  Object.keys(wp.mods).forEach(function (wid) { Object.keys(wp.mods[wid] || {}).forEach(function (sl) { if (!modOk(wp.mods[wid][sl])) delete wp.mods[wid][sl]; }); });
  var wFilter = { q: "", t: "All types" };
  var openSlot = null;
  function wRc(w) { return rcol(w.r); }
  function gunThumb(w) { var b = ICONS_BIG[w.id]; return '<span class="th" style="--rc:' + wRc(w) + '">' + (b ? '<img alt="" loading="lazy" decoding="async" src="' + b.u + '">' : "<i></i>") + "</span>"; }
  function wTo(w) { var n = w.tiers.length; return Math.min(n, Math.max(1, wp.to[w.id] || n)); }
  function wFrom(w) { return wp.own[w.id] ? Math.min(wTo(w), Math.max(1, wp.from[w.id] || 1)) : 0; }
  function modThumb(id) { return IDX[id] ? thumb(id) : '<span class="th" style="--rc:' + rcol(MODS[id] && MODS[id].r) + '"><i></i></span>'; }
  function modOk(id) { var m = MODS[id]; return !!(m && ((m.rec && Object.keys(m.rec).length) || m.loot)); }
  function chips(rec) {
    rec = rec || {};
    return '<div class="cm-row">' + Object.keys(rec).map(function (k) { var it = IDX[k]; return '<span class="cm" style="--rc:' + rcol(it && it.r) + '">' + thumb(k) + esc(nm(k)) + " <b>×" + rec[k] + "</b></span>"; }).join("") + "</div>";
  }
  function efStr(ef) { return Object.keys(ef || {}).map(function (k) { return k + " " + ef[k]; }).join(" · "); }
  function vendStr(ve) { return (ve || []).map(function (v) { return (v.tr || "Trader") + " " + costStr(v.c) + (v.lv ? " (trader level " + v.lv + ")" : ""); }).join("; "); }

  function renderWTabs() {
    var types = {}; WEAPONS.forEach(function (w) { types[w.t] = (types[w.t] || 0) + 1; });
    $("#wtabs").innerHTML = ["All types"].concat(Object.keys(types).sort()).map(function (x) {
      return '<button type="button" data-wt="' + esc(x) + '" aria-pressed="' + (wFilter.t === x) + '">' + esc(x === "All types" ? "All" : x) + "</button>";
    }).join("");
  }
  function renderWList() {
    var q = wFilter.q.toLowerCase();
    var arr = WEAPONS.filter(function (w) {
      return (wFilter.t === "All types" || w.t === wFilter.t) && (!q || (w.n + " " + w.t).toLowerCase().indexOf(q) > -1);
    });
    $("#wList").innerHTML = arr.map(function (w) {
      var own = !!wp.own[w.id], b = ICONS_BIG[w.id];
      return '<div class="wcard' + (w.id === wp.sel ? " sel" : "") + '" style="--rc:' + wRc(w) + '"><i class="rb"></i><button type="button" class="wpick" data-pick="' + w.id + '" aria-pressed="' + (w.id === wp.sel) + '">' + (b ? '<img alt="" src="' + b.u + '">' : '<span class="ph">' + big({ t: w.t, n: w.n }) + "</span>") + "<b>" + esc(w.n) + (w.wip ? ' <span class="wip">WIP</span>' : "") + "</b><small>" + esc(w.t) + "</small></button></div>";
    }).join("") || '<div class="mutedp">No weapon matches.</div>';
    var n = Object.keys(wp.own).filter(function (k) { return wp.own[k]; }).length;
    $("#wown").textContent = "";
    centerWSel();
  }
  function centerWSel() { var sel = $("#wList .wcard.sel"), strip = $("#wList"); if (sel && strip.clientWidth) strip.scrollLeft = Math.max(0, sel.offsetLeft - strip.clientWidth / 2 + sel.offsetWidth / 2); }

  function wSeg(kind, w, val, min) {
    var out = "";
    for (var n = 1; n <= w.tiers.length; n++) {
      var dis = (kind === "from" && !wp.own[w.id]) || n < min;
      out += '<button type="button" class="orb" data-wk="' + kind + '" data-n="' + n + '" aria-pressed="' + (val === n) + '"' + (dis ? " disabled" : "") + ">" + ROMAN[n] + "</button>";
    }
    return '<div class="seg" role="group">' + out + "</div>";
  }

  function wCosts(w) {
    var from = wFrom(w), to = wTo(w), own = !!wp.own[w.id];
    var parts = [], tot = {}, use = {};
    function add(rec, label) { Object.keys(rec).forEach(function (k) { tot[k] = (tot[k] || 0) + rec[k]; (use[k] = use[k] || []).push(label + " ×" + rec[k]); }); }
    if (!own) { var wMiss = !!w.bp && arcBpMissing(w.id); parts.push({ label: w.n + " (tier I)", rec: w.rec, bpMiss: wMiss }); if (!wMiss) add(w.rec, w.n + " I"); }
    for (var t = Math.max(from, 1) + 1; t <= to; t++) {
      var u = w.up[t - 1];
      if (u) { parts.push({ label: "Upgrade to tier " + ROMAN[t], rec: u }); add(u, w.n + " " + ROMAN[t]); }
    }
    var mods = [];
    SLOT_ORDER.forEach(function (sl) {
      var id = wp.mods[w.id] && wp.mods[w.id][sl];
      if (id && w.slots[sl] && w.slots[sl].indexOf(id) > -1 && modOk(id)) { var mm = MODS[id], miss = !mm.loot && !!mm.bp && arcBpMissing(id); mods.push({ id: id, slot: sl, m: mm, bpMiss: miss }); if (!miss) add(mm.rec || {}, mm.n); }
    });
    var lvl = 0;
    if (!own) lvl = w.lvl || 0;
    mods.forEach(function (x) { if (!x.m.loot) lvl = Math.max(lvl, x.m.lvl || 0); });
    return { parts: parts, tot: tot, use: use, mods: mods, lvl: lvl, from: from, to: to, own: own };
  }

  var BPSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#9cc6ff" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 10v10"/></svg>';
  function bpBlock(key, name, loc, needs) {
    if (!needs) return '<span class="bpnone">No blueprint needed</span>';
    var tip = loc ? loc[0] : "No location for this blueprint is listed in the guides used here.";
    var src = loc ? "Source: " + (loc[1] || "community guide") : "";
    return '<span class="bpnone">Blueprint</span><button type="button" class="bpi" data-tip="' + esc(tip) + '" data-src="' + esc(src) + '" aria-label="Blueprint location for ' + esc(name) + ': ' + esc(tip) + '">' + BPSVG + "<b>i</b></button>";
  }
  function bpLoc() { return ""; }
  var tipEl = document.createElement("div"); tipEl.id = "bptip"; tipEl.hidden = true; document.body.appendChild(tipEl);
  var tipBtn = null;
  function showTip(b) {
    tipBtn = b; tipEl.innerHTML = "<em>Where to get the blueprint</em>" + esc(b.dataset.tip) + "";
    tipEl.hidden = false; b.classList.add("on");
    var r = b.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var x = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)), y = r.top - h - 10;
    if (y < 8) y = r.bottom + 10;
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
  }
  function hideTip() { tipEl.hidden = true; if (tipBtn) tipBtn.classList.remove("on"); tipBtn = null; }
  document.addEventListener("mouseover", function (e) { var b = e.target.closest && e.target.closest(".bpi"); if (b) showTip(b); });
  document.addEventListener("mouseout", function (e) { if (e.target.closest && e.target.closest(".bpi")) hideTip(); });
  document.addEventListener("focusin", function (e) { var b = e.target.closest && e.target.closest(".bpi"); if (b) showTip(b); });
  document.addEventListener("focusout", function (e) { if (e.target.closest && e.target.closest(".bpi")) hideTip(); });
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".bpi"); if (b) { if (tipBtn === b && !tipEl.hidden && e.detail === 0) hideTip(); else showTip(b); } else hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true });

  function renderDiagram(w, c) {
    var b = ICONS_BIG[w.id], W = 700, H = 300, cx = 350, cy = 160;
    var kinds = SLOT_ORDER.filter(function (k) { return w.slots[k]; });
    var bw = 280, bh = 190, x0 = cx - bw / 2, y0 = cy - bh / 2, iw = bw, ih = bh;
    if (b) { var sc = Math.min(bw / b.w, bh / b.h); iw = b.w * sc; ih = b.h * sc; x0 = cx - iw / 2; y0 = cy - ih / 2; }
    var NODE = { muzzle: [11, 22], special: [50, 10], grip: [30, 84], magazine: [64, 86], stock: [89, 78] };
    var ANC = { muzzle: [.10, .14], special: [.45, .30], grip: [.50, .68], magazine: [.42, .56], stock: [.90, .86] };
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true">' + (b ? '<image href="' + b.u + '" x="' + x0 + '" y="' + y0 + '" width="' + iw + '" height="' + ih + '" preserveAspectRatio="xMidYMid meet"/>' : '<rect class="body" x="190" y="130" width="320" height="50" rx="10"/>');
    var nodes = "";
    kinds.forEach(function (k) {
      var pos = NODE[k], ax = x0 + ANC[k][0] * iw, ay = y0 + ANC[k][1] * ih, nx = pos[0] / 100 * W, ny = pos[1] / 100 * H;
      var sel = wp.mods[w.id] && wp.mods[w.id][k], on = sel && modOk(sel);
      svg += '<line class="ln' + (on ? " on" : "") + '" x1="' + nx + '" y1="' + ny + '" x2="' + ax + '" y2="' + ay + '"/><circle class="pt" cx="' + ax + '" cy="' + ay + '" r="4"/>';
      nodes += '<button type="button" class="node orb" data-slot="' + k + '" aria-haspopup="listbox" aria-expanded="' + (openSlot === k) + '" aria-label="' + SLOT_NAME[k] + ": " + (on ? esc(MODS[sel].n) : "empty") + '" style="left:' + pos[0] + "%;top:" + pos[1] + "%;--nc:" + (on ? rcol(MODS[sel].r) : "#4a5388") + '">' +
        (on && ICONS[sel] ? '<img alt="" src="' + ICONS[sel] + '">' : '<span class="pl">' + (on ? "✓" : "+") + "</span>") +
        '<span class="nl">' + SLOT_NAME[k] + "<b>" + (on ? esc(MODS[sel].n) : "None") + "</b></span></button>";
    });
    svg += "</svg>";
    var hint = kinds.length ? "Click a square to choose what goes in that slot." : "This weapon has no attachment slots in the game data.";
    return '<div class="dgm-wrap"><h4>Attachments</h4><p class="hint">' + hint + '</p><div class="dgm" id="dgm">' + svg + nodes + "</div></div>";
  }

  function menuHtml(w, k) {
    var cur = wp.mods[w.id] && wp.mods[w.id][k];
    var h = '<div class="mh"><span>' + SLOT_NAME[k] + ' attachment</span><button type="button" class="x" data-close="1" aria-label="Close menu">×</button></div>' +
      '<button type="button" class="opt" data-set="" role="option" aria-selected="' + (!cur) + '"><span class="none">–</span><span><span class="o-n">None</span><span class="o-s">Leave this slot empty</span></span></button>';
    w.slots[k].forEach(function (id) {
      var m = MODS[id]; if (!m) return;
      if (!modOk(id)) return;
      if (m.loot) { h += '<button type="button" class="opt" data-set="' + id + '" role="option" aria-selected="' + (cur === id) + '">' + modThumb(id) + '<span><span class="o-n">' + esc(m.n) + ' <span class="lootb">Loot only</span></span><span class="o-s">' + esc(efStr(m.ef) || "No stat change listed") + " · <i>cannot be crafted</i></span></span></button>"; return; }
      h += '<button type="button" class="opt" data-set="' + id + '" role="option" aria-selected="' + (cur === id) + '">' + modThumb(id) + '<span><span class="o-n">' + esc(m.n) + '</span><span class="o-s">' + esc(efStr(m.ef) || "No stat change listed") + " · <i>Gunsmith " + (m.lvl || "?") + "</i>" + (m.bp ? " · blueprint" : "") + "</span></span></button>";
    });
    return h;
  }

  function renderWeapon() {
    try { renderWeaponInner(); }
    catch (err) { if (window.console) console.error(err); openSlot = null; var m = $("#amenu"); if (m) m.remove(); }
  }
  function renderWeaponInner() {
    var w = WIDX[wp.sel], f = flow();
    $("#v-weapons").classList.toggle("wpicked", !!f.picked);
    $("#wDetail").classList.toggle("off", !f.picked);
    if (!f.picked) { $("#wDetail").innerHTML = ""; return; }
    if (w.wip) {
      $("#wDetail").innerHTML = '<div class="wd-h"><div class="tile" style="--rc:' + wRc(w) + '"><div class="tin"><i class="sw"></i>' + big({ t: w.t, n: w.n }) + '</div></div><div class="grow"><h3>' + esc(w.n) + ' <span class="wip">WIP</span></h3><div class="row"><span class="pill">' + esc(w.t) + '</span><span class="pill r" style="--rc:' + wRc(w) + '">' + esc(w.r) + '</span></div></div><div class="wd-acts"><button type="button" class="wchg" data-wstep="pick">Change weapon</button></div></div>' +
        '<div class="wl"><div class="blk"><div class="blk-h"><b>Not in the calculator yet</b><span>New in update 2.0</span></div><div class="mutedp">The crafting recipe, upgrade costs and attachment slots for this weapon have not been published yet, so its costs cannot be calculated. What is known:<ul>' + w.facts.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul></div></div></div>";
      return;
    }
    var c = wCosts(w), own = c.own;
    var b = ICONS_BIG[w.id];
    var head = '<div class="wd-h"><div class="tile" style="--rc:' + wRc(w) + '"><div class="tin"><i class="sw"></i>' + (b ? '<img class="gl" alt="" src="' + b.u + '">' : big({ t: w.t, n: w.n })) + '</div></div>' +
      '<div class="grow"><h3>' + esc(w.n) + '</h3><div class="row"><span class="pill">' + esc(w.t) + '</span><span class="pill r" style="--rc:' + wRc(w) + '">' + esc(w.r) + '</span><span class="chipst ok">Gunsmith ' + (w.lvl || "?") + " to craft</span></div>" +
      '<div class="statline"><span><small>Tier ' + ROMAN[c.to] + " value</small>" + fmt(w.tv[c.to - 1]) + "</span>" + (dps(w.ste[c.to - 1]) != null ? '<span class="dpsv" title="Damage × fire rate"><small>DPS</small>' + fmt(dps(w.ste[c.to - 1])) + "</span>" : "") + (w.mag[c.to - 1] != null ? "<span><small>Magazine</small>" + w.mag[c.to - 1] + "</span>" : "") + (w.dur[c.to - 1] ? "<span><small>Durability</small>" + esc(w.dur[c.to - 1]) + "</span>" : "") + "</div></div>" +
      '<div class="wd-acts"><button type="button" class="wchg" data-wstep="pick">Change weapon</button><button type="button" class="btn orb sm" data-share="1">Copy build code</button><button type="button" class="btn orb sm" data-load="1">Load a build</button></div></div>' +
      (w.note ? '<p class="wnote">' + esc(w.note) + "</p>" : "") + '<div id="loadBox"></div>';
    var n = w.tiers.length, i, steps = "";
    var at = arcTier(w);
    if (at >= 0 && !f.own && f.edit !== "own") {
      wp.own[w.id] = at > 0; if (at) { wp.from[w.id] = at; if (wTo(w) < at) wp.to[w.id] = at; }
      f.own = 1; f.arc = 1; saveWp(); c = wCosts(w); own = c.own;
    }
    if (!f.own || f.edit === "own") {
      var ob = '<div class="wch"><button type="button" class="wopt' + (f.own && !own ? " on" : "") + '" data-wown="0"><b>No</b><small>I need to craft it</small></button>';
      for (i = 1; i <= n; i++) ob += '<button type="button" class="wopt' + (f.own && own && c.from === i ? " on" : "") + '" data-wown="' + i + '"><b>' + (n > 1 ? "Yes, tier " + ROMAN[i] : "Yes") + "</b><small>" + (arcHas(w.tiers[i - 1]) ? "In your stash" : "I already have it") + "</small></button>";
      $("#wDetail").innerHTML = head + stepOpen(2, "Do you already own a " + esc(w.n) + '?<span data-arcmini hidden></span>', ob + "</div>");
      renderArc();
      return;
    }
    steps += stepDone("Do you own it?", (own ? "Yes, tier " + ROMAN[c.from] : "No, crafting a new one") + (f.arc ? '<span class="arctag">from your ARCTracker stash</span>' : ""), "own");
    if (n === 1) f.to = 1;
    if (!f.to || f.edit === "to") {
      var tbt = '<div class="wch">';
      for (i = Math.max(1, c.from); i <= n; i++) { var d = dps(w.ste[i - 1]); tbt += '<button type="button" class="wopt' + (f.to && c.to === i ? " on" : "") + '" data-wto="' + i + '"><b>Tier ' + ROMAN[i] + "</b><small>" + (own && i === c.from ? "Keep what I have" : (d != null ? "DPS " + fmt(d) : "Value " + fmt(w.tv[i - 1]))) + "</small></button>"; }
      $("#wDetail").innerHTML = head + steps + stepOpen(3, "Which tier do you want?", tbt + "</div>");
      return;
    }
    steps += stepDone("Tier you want", "Tier " + ROMAN[c.to], n > 1 ? "to" : "", w.amp ? '<label class="own wampl"><input type="checkbox" data-amp="1"' + (wp.amp[w.id] ? " checked" : "") + ">Amplify to Mk. " + ROMAN[w.amp.mk] + "</label>" : "");
    var kinds = SLOT_ORDER.filter(function (k) { return w.slots[k]; });
    if (!kinds.length) f.done = 1;
    var picked = kinds.filter(function (k) { return f.sl[k] || (wp.mods[w.id] && wp.mods[w.id][k]); }).length;
    if (!f.done || f.edit === "mods") {
      steps += '<div class="wstep on"><span class="wsn">4</span><div class="wst"><b>Pick your attachments</b><small class="wcnt">' + picked + " of " + kinds.length + " slots set" + (picked < kinds.length ? " · the stats open when every slot is set (choose None to leave one empty)" : "") + '</small></div><button type="button" class="btn go orb sm" data-wdone="1">' + (picked === kinds.length ? "Done" : "Skip to stats") + "</button></div>" +
        '<div class="wmodd">' + renderDiagram(w, c).replace("<h4>Attachments</h4>", "") + "</div>";
    } else {
      steps += stepDone("Attachments", c.mods.length ? c.mods.map(function (x) { return esc(x.m.n); }).join(", ") : "None", kinds.length ? "mods" : "");
    }
    if (!f.done) { $("#wDetail").innerHTML = head + steps; if (openSlot) placeMenu(w); return; }
    cmpOpen = f.cmp !== 0;
    var cmp = tierTable(w, c);
    // list
    var top = '<div class="wl-top">' + (c.lvl ? '<span class="chipst">Needs Gunsmith ' + c.lvl + "</span>" : "") + (w.amp && wp.amp[w.id] ? '<span class="chipst">Amplification: Research Station IV + Outpost 4</span>' : "") + "</div>";
    var wblk = "";
    if (c.parts.length) {
      wblk = '<div class="blk"><div class="blk-h"><b>' + esc(w.n) + (own ? ": tier " + ROMAN[c.from] + " → " + ROMAN[c.to] : ": craft tier I" + (c.to > 1 ? " and upgrade to " + ROMAN[c.to] : "")) + "</b><span>Materials</span></div>";
      c.parts.forEach(function (p, i) {
        var base = i === 0 && !own;
        if (base) {
          wblk += '<div class="arow wbase">' + gunThumb(w) + '<div><div class="nm">' + esc(p.label) + "</div><small>" + (w.bp ? "Needs the blueprint, craft at Gunsmith " + (w.lvl || "?") : "Craft at Gunsmith " + (w.lvl || "?")) + (w.ve && w.ve.length ? " · Vendor: " + esc(vendStr(w.ve)) : "") + "</small>" + (p.bpMiss ? bpMissBox(w.n, w.bpl, [w.id + "_blueprint"]) : chips(p.rec)) + questLine([w.tiers[0]], "A " + w.n) + '</div><div class="bpcell">' + bpBlock("w:" + w.id, w.n, w.bpl, w.bp) + "</div></div>" + bpLoc("w:" + w.id, w.bpl, w.bp);
        } else {
          wblk += '<div class="tier-h">' + esc(p.label) + "</div>" + chips(p.rec);
        }
      });
      wblk += "</div>";
    } else if (own && c.from === c.to) {
      wblk = '<div class="blk"><div class="blk-h"><b>' + esc(w.n) + "</b><span>No weapon cost</span></div><div class=\"mutedp\">You already have tier " + ROMAN[c.to] + ". Raise “Tier you want” to price the upgrades.</div></div>";
    }
    var ampblk = "";
    if (w.amp && wp.amp[w.id]) {
      ampblk = '<div class="blk"><div class="blk-h"><b>Amplification</b><span>Mk. ' + ROMAN[w.amp.mk] + "</span></div><div class=\"arow\">" + thumb("amplification_module") + '<div><div class="nm">Amplification Module Mk. ' + ROMAN[w.amp.mk] + ' <span class="dim">×? quantity not published</span></div><small>' + (w.amp.explicit ? "Mark stated by guides." : "Mark follows the weapon rarity (Mk. I common up to Mk. V legendary); no guide states it for this weapon.") + " Modules drop from Frigates and the fallen Emperor on Pendola Pass. Applied at the Research Station.</small>" +
        (w.amp.opts && w.amp.opts.length ? "<small>Amplified perks you can pick: " + esc(w.amp.opts.join("; ")) + "</small>" : "") + (w.amp.conflict ? '<small class="dim">Note: ' + esc(w.amp.conflict) + "</small>" : "") + "</div><div></div></div></div>";
    }
    var mblk = "";
    if (c.mods.length) {
      mblk = '<div class="blk"><div class="blk-h"><b>Attachments</b><span>' + c.mods.length + " chosen</span></div>" + c.mods.map(function (x) {
        var m = x.m;
        return '<div class="arow" style="--rc:' + rcol(m.r) + '">' + modThumb(x.id) + '<div><div class="nm">' + esc(m.n) + ' <span class="dim">· ' + SLOT_NAME[x.slot] + "</span></div><small>" + esc(efStr(m.ef)) + (efStr(m.ef) ? " · " : "") + (m.loot ? "Loot only" : "Gunsmith " + (m.lvl || "?")) + (m.ve && m.ve.length ? " · Vendor: " + esc(vendStr(m.ve)) : "") + "</small>" + (m.loot ? '<div class="lootn">' + esc((m.bpl && m.bpl[0]) || "Found as loot; cannot be crafted.") + "</div>" : x.bpMiss ? bpMissBox(m.n, m.bpl, [x.id + "_blueprint"]) : chips(m.rec)) + questLine([x.id], m.n) + '</div><div class="bpcell">' + (m.loot ? '<span class="bpnone">Loot only</span>' : bpBlock("m:" + x.id, m.n, m.bpl, m.bp)) + "</div></div>" + bpLoc("m:" + x.id, m.bpl, m.bp);
      }).join("") + "</div>";
    }
    var names = Object.keys(c.tot).sort(function (a, z) { return c.tot[z] - c.tot[a] || nm(a).localeCompare(nm(z)); });
    var sum = 0; names.forEach(function (k) { sum += c.tot[k]; });
    var totblk = '<div class="blk"><div class="blk-h"><b>All materials</b><span>' + names.length + " kinds · " + fmt(sum) + " items</span></div>" +
      (names.length ? names.map(function (k) { var it = IDX[k]; return '<div class="trow" style="--rc:' + rcol(it && it.r) + '">' + thumb(k) + '<div class="nm"><button type="button" class="nm" style="all:unset;cursor:pointer;color:#fff;font-weight:700" data-find="' + esc(nm(k)) + '">' + esc(nm(k)) + "</button><span>×" + c.tot[k] + "</span><small>" + esc(c.use[k].join(" · ")) + "</small></div></div>"; }).join("") : '<div class="mutedp">Nothing to craft for this selection.</div>') + "</div>";
    var note = "";
    var addb = names.length ? '<button type="button" class="addl big" data-addw="1">+ Add these materials to my shopping list</button>' : "";
    $("#wDetail").innerHTML = head + steps + '<div class="wb-cols wres"><div class="wb-left"><div class="wl">' + wblk + ampblk + mblk + "</div>" + cmp + '</div><aside class="wb-right">' + top + totblk + addb + "</aside></div>";
    if (openSlot) placeMenu(w);
  }
  function flow() {
    if (!wp.flow || wp.flow.id !== wp.sel) wp.flow = { id: wp.sel, sl: {} };
    if (!wp.flow.sl) wp.flow.sl = {};
    return wp.flow;
  }
  function stepOpen(n, title, body) { return '<div class="wstep on"><span class="wsn">' + n + '</span><div class="wst"><b>' + title + "</b>" + body + "</div></div>"; }
  function stepDone(title, sum, key, extra) { return '<div class="wstep done"><span class="wsn">\u2713</span><div class="wst"><small>' + title + '</small><div class="wss">' + sum + "</div></div>" + (extra || "") + (key ? '<button type="button" class="wchg" data-wstep="' + key + '">Change</button>' : "") + "</div>"; }
  function wScrollTo(el) { if (!el) return; requestAnimationFrame(function () { var r = el.getBoundingClientRect(); if (r.top < 70 || r.top > innerHeight * 0.7) window.scrollTo({ top: scrollY + r.top - 90, behavior: "smooth" }); }); }
  function recStr(r) { return r ? Object.keys(r).map(function (k) { return r[k] + " " + nm(k); }).join(", ") : ""; }
  var cmpOpen = true;
  function tierTable(w, c) {
    var n = w.tiers.length, cols = [];
    for (var i = 0; i < n; i++) cols.push(i);
    function cls(i) { return i + 1 === c.to ? ' class="tgt"' : (c.own && i + 1 === c.from ? ' class="cur"' : ""); }
    function row(label, f) { return "<tr><td>" + label + "</td>" + cols.map(function (i) { var v = f(i); return "<td" + cls(i) + ">" + (v === "" || v == null ? '<span class="na">—</span>' : v) + "</td>"; }).join("") + "</tr>"; }
    var head = "<tr><th></th>" + cols.map(function (i) { return "<th" + cls(i) + ">Tier " + ROMAN[i + 1] + (i + 1 === c.to ? "<small>Your goal</small>" : (c.own && i + 1 === c.from ? "<small>You have</small>" : "")) + "</th>"; }).join("") + "</tr>";
    var body = row("Sell value", function (i) { return fmt(w.tv[i]); }) +
      row("Durability", function (i) { return esc(w.dur[i] || ""); }) +
      row("Magazine", function (i) { return w.mag[i] != null ? w.mag[i] : ""; }) +
      row("Tier bonuses", function (i) { var b = (w.tb || [])[i] || []; return i === 0 ? (b.length ? "<ul><li>" + b.map(esc).join("</li><li>") + "</li></ul>" : "Base weapon") : (b.length ? "<ul><li>" + b.map(esc).join("</li><li>") + "</li></ul>" : ""); }) +
      row("Cost", function (i) { return i === 0 ? "Craft: " + esc(recStr(w.rec)) : esc(recStr(w.up[i])); }) +
      row("Repair cost", function (i) { return esc(recStr((w.rep || [])[i])); });
    WSTAT.forEach(function (s) { if (w.ste.some(function (x) { return x && x[s] != null; })) body += row(WSTAT_LAB[s], function (i) { var x = w.ste[i]; if (!x || x[s] == null) return ""; var j = i - 1; while (j >= 0 && !(w.ste[j] && w.ste[j][s] != null)) j--; return statBar(x[s], j >= 0 ? statDelta(w, s, i, j) : "", x[s]); }); });
    var hasDps = w.ste.some(function (x) { return dps(x) != null; }), mx = dpsMax();
    if (hasDps) body += row("DPS", function (i) { var d = dps(w.ste[i]); if (d == null) return ""; var p = null; for (var j = i - 1; j >= 0 && p == null; j--) p = dps(w.ste[j]); return statBar(fmt(d), p != null ? sDelta(d - p) : "", d / mx * 100, " dps"); }).replace("<tr>", '<tr class="dpsrow">');
    var notes = [];
    if (hasDps) notes.push("DPS is damage × fire rate, to compare weapons with each other. It ignores reloads, headshots and shields.");
    if (w.frb) notes.push("Fire rate on tiers II to IV includes that tier’s Increased Fire Rate bonus.");
    if (w.sest) notes.push(STAT_EST);
    return '<details class="tcmp"' + (cmpOpen ? " open" : "") + ' id="tcmp"><summary>Compare tiers</summary><div class="tw"><table>' + head + body + '</table></div>' + notes.map(function (n) { return '<p class="tn">' + n + "</p>"; }).join("") + '</details>';
  }
  var WSTAT = ["damage", "fireRate", "range", "stability", "agility", "stealth"], WSTAT_LAB = { damage: "Damage", fireRate: "Fire rate", range: "Range", stability: "Stability", agility: "Agility", stealth: "Stealth" };
  var STAT_EST = "Some base stats for this weapon are not in the community data set and come from arcraiders.wiki (damage, fire rate, range) or arcraidershub.com (stability, agility, stealth, approximate).";
  function dps(x) { return x && x.damage != null && x.fireRate != null ? Math.round(x.damage * x.fireRate) : null; }
  var DPS_MAX = 0;
  function dpsMax() { if (!DPS_MAX) WEAPONS.forEach(function (w) { (w.ste || []).forEach(function (x) { var d = dps(x); if (d > DPS_MAX) DPS_MAX = d; }); }); return DPS_MAX || 1; }
  function frBonus(w, i) { var m = /Increased Fire Rate\s*([\d.]+)%/i.exec(((w.tb || [])[i] || []).join(" ")); return m ? +m[1] : 0; }
  function sDelta(d, pct) { var r = Math.round(d * 10) / 10; if (!r) return ""; return '<em class="' + (r > 0 ? "up" : "dn") + '">' + (r > 0 ? "+" : "\u2212") + fmt(Math.abs(r)) + (pct ? "%" : "") + "</em>"; }
  function statBar(v, delta, pct, cls) { pct = Math.max(3, Math.min(100, pct)); return '<div class="sbw"><div class="statbar' + (cls || "") + '"><i style="width:' + pct + '%"></i><b>' + v + "</b></div>" + (delta || "<em></em>") + "</div>"; }
  function statDelta(w, s, i, j) {
    var a = w.ste[i], b = w.ste[j];
    if (a && b && a[s] != null && b[s] != null && a[s] !== b[s]) return sDelta(a[s] - b[s]);
    if (s === "fireRate" && !w.frb) return sDelta(frBonus(w, i) - frBonus(w, j), true);
    return "";
  }
  document.addEventListener("toggle", function (e) { if (e.target.id === "tcmp") { cmpOpen = e.target.open; flow().cmp = cmpOpen ? 1 : 0; saveWp(); } }, true);
  function placeMenu(w) {
    var dgm = $("#dgm"), node = dgm && dgm.querySelector('[data-slot="' + openSlot + '"]');
    if (!node || !w.slots[openSlot]) { openSlot = null; return; }
    var menu = document.createElement("div"); menu.className = "amenu"; menu.setAttribute("role", "listbox"); menu.id = "amenu"; menu.innerHTML = menuHtml(w, openSlot);
    dgm.appendChild(menu);
    var W = dgm.clientWidth, H = dgm.clientHeight, mw = menu.offsetWidth, mh = menu.offsetHeight, nx = node.offsetLeft, ny = node.offsetTop, half = node.offsetWidth / 2 + 14;
    var left, top;
    if (nx > W * 0.6 && nx - half - mw >= 0) { left = nx - half - mw; top = Math.max(-40, Math.min(H - mh + 40, ny - mh / 2)); }
    else if (nx < W * 0.4 && nx + half + mw <= W) { left = nx + half; top = Math.max(-40, Math.min(H - mh + 40, ny - mh / 2)); }
    else {
      left = Math.max(0, Math.min(W - mw, nx - mw / 2));
      top = ny + half + 22;
      if (top + mh > H + 40) top = Math.max(-40, ny - half - mh);
    }
    menu.style.left = left + "px"; menu.style.top = top + "px";
  }
  function pickWeapon(id) { wp.sel = id; openSlot = null; flow().picked = 1; saveWp(); renderWList(); renderWeapon(); wScrollTo($("#wDetail")); }
  $("#wq").addEventListener("input", function () { wFilter.q = this.value; renderWList(); });
  $("#wtabs").addEventListener("click", function (e) { var b = e.target.closest("button[data-wt]"); if (!b) return; wFilter.t = b.dataset.wt; renderWTabs(); renderWList(); });
  document.querySelector(".wstripw").addEventListener("click", function (e) { var b = e.target.closest("button[data-wscr]"); if (b) $("#wList").scrollBy({ left: +b.dataset.wscr * $("#wList").clientWidth * 0.8, behavior: "smooth" }); });
  $("#wList").addEventListener("click", function (e) { var b = e.target.closest("button[data-pick]"); if (b) pickWeapon(b.dataset.pick); });
  function buildCode(w) {
    var m = wp.mods[w.id] || {}, slots = Object.keys(m).filter(function (k) { return modOk(m[k]); }).map(function (k) { return k + "=" + m[k]; }).join(",");
    var raw = ["RT1", w.id, wp.own[w.id] ? 1 : 0, wFrom(w), wTo(w), wp.amp[w.id] ? 1 : 0, slots].join("|");
    return "ARC-" + btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function applyCode(code) {
    try {
      var s = String(code).trim().replace(/^ARC-/i, "").replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      var p = atob(s).split("|");
      if (p[0] !== "RT1" || !WIDX[p[1]] || WIDX[p[1]].wip) return "That code is not a valid Raider Toolkit build.";
      var w = WIDX[p[1]], n = w.tiers.length;
      wp.own[w.id] = p[2] === "1"; wp.from[w.id] = Math.min(n, Math.max(1, +p[3] || 1)); wp.to[w.id] = Math.min(n, Math.max(1, +p[4] || n)); wp.amp[w.id] = p[5] === "1" && !!w.amp;
      wp.mods[w.id] = {};
      (p[6] || "").split(",").filter(Boolean).forEach(function (kv) { var a = kv.split("="); if (w.slots[a[0]] && w.slots[a[0]].indexOf(a[1]) > -1 && modOk(a[1])) wp.mods[w.id][a[0]] = a[1]; });
      wp.sel = w.id; openSlot = null; wp.flow = { id: w.id, picked: 1, own: 1, to: 1, done: 1, sl: {} }; SLOT_ORDER.forEach(function (k) { if (w.slots[k]) wp.flow.sl[k] = 1; }); saveWp(); renderWList(); renderWeapon(); toast("Loaded build: " + w.n);
      return "";
    } catch (er) { return "That code could not be read. Check that you copied all of it."; }
  }
  $("#wDetail").addEventListener("click", function (e) {
    var sh = e.target.closest("[data-share]");
    if (sh) {
      var code = buildCode(WIDX[wp.sel]);
      var ok = function () { sh.textContent = "Code copied!"; setTimeout(function () { sh.textContent = "Copy build code"; }, 1800); };
      var show = function () { $("#loadBox").innerHTML = '<div class="codebox"><span>Your build code:</span><input readonly value="' + esc(code) + '" aria-label="Build code"></div>'; var i = $("#loadBox input"); i.focus(); i.select(); };
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function () { ok(); show(); }, show); else show(); } catch (er) { show(); }
      return;
    }
    if (e.target.closest("[data-load]")) {
      $("#loadBox").innerHTML = '<div class="codebox"><span>Paste a build code:</span><input id="codeIn" placeholder="ARC-…" aria-label="Paste a build code"><button type="button" class="btn go orb sm" data-apply="1">Load</button><span class="err" id="codeErr"></span></div>';
      $("#codeIn").focus(); return;
    }
    if (e.target.closest("[data-apply]")) { var msg = applyCode($("#codeIn").value); if (msg) $("#codeErr").textContent = msg; return; }
    if (!e.target.closest("[data-addw]")) return;
    var w = WIDX[wp.sel], c = wCosts(w);
    var label = w.n + (c.own ? " tier " + ROMAN[c.from] + " to " + ROMAN[c.to] : " (craft" + (c.to > 1 ? ", up to tier " + ROMAN[c.to] : "") + ")") + (c.mods.length ? " + " + c.mods.length + " attachment" + (c.mods.length > 1 ? "s" : "") : "");
    shopSet("w:" + w.id, label, c.tot);
  });
  $("#wList").addEventListener("change", function (e) {
    var i = e.target.closest("input[data-own]"); if (!i) return;
    wp.own[i.dataset.own] = i.checked; if (i.checked && !wp.from[i.dataset.own]) wp.from[i.dataset.own] = 1; saveWp(); renderWList(); if (i.dataset.own === wp.sel) renderWeapon();
  });
  $("#wDetail").addEventListener("change", function (e) {
    var w = WIDX[wp.sel], t = e.target;
    if (t.dataset.ownd) { wp.own[w.id] = t.checked; if (t.checked && !wp.from[w.id]) wp.from[w.id] = 1; saveWp(); renderWList(); renderWeapon(); }
    else if (t.dataset.amp) { wp.amp[w.id] = t.checked; saveWp(); renderWeapon(); }
    else if (t.dataset.bp) { wp.bp[t.dataset.bp] = t.checked; saveWp(); renderWeapon(); }
  });
  $("#wDetail").addEventListener("click", function (e) {
    var w = WIDX[wp.sel], f = flow(), t;
    if ((t = e.target.closest("button[data-wstep]"))) {
      if (t.dataset.wstep === "pick") { f.picked = 0; openSlot = null; saveWp(); renderWeapon(); centerWSel(); wScrollTo($("#v-weapons .wpstep")); }
      else { f.edit = t.dataset.wstep; saveWp(); renderWeapon(); }
      return;
    }
    if ((t = e.target.closest("button[data-wown]"))) {
      var v = +t.dataset.wown; wp.own[w.id] = v > 0;
      if (v) { wp.from[w.id] = v; if (wTo(w) < v) wp.to[w.id] = v; }
      f.own = 1; f.arc = 0; f.edit = null; saveWp(); renderWeapon(); return;
    }
    if ((t = e.target.closest("button[data-wto]"))) { wp.to[w.id] = +t.dataset.wto; f.to = 1; f.edit = null; saveWp(); renderWeapon(); return; }
    if (e.target.closest("button[data-wdone]")) { f.done = 1; f.edit = null; f.cmp = 1; openSlot = null; saveWp(); renderWeapon(); wScrollTo($("#wDetail .wres")); return; }
    var sg = e.target.closest("button[data-wk]");
    if (sg) {
      var n = +sg.dataset.n;
      if (sg.dataset.wk === "from") { wp.from[w.id] = n; if (wTo(w) < n) wp.to[w.id] = n; } else wp.to[w.id] = Math.max(n, wFrom(w));
      saveWp(); renderWeapon(); return;
    }
    var o = e.target.closest("button[data-set]");
    if (o) {
      wp.mods[w.id] = wp.mods[w.id] || {};
      var kinds = SLOT_ORDER.filter(function (k) { return w.slots[k]; }), all = function () { return kinds.every(function (k) { return f.sl[k] || wp.mods[w.id][k]; }); };
      var was = all();
      if (o.dataset.set) wp.mods[w.id][openSlot] = o.dataset.set; else delete wp.mods[w.id][openSlot];
      f.sl[openSlot] = 1;
      openSlot = null;
      if (!was && all() && !f.done) { f.done = 1; f.edit = null; f.cmp = 1; saveWp(); renderWeapon(); wScrollTo($("#wDetail .wres")); return; }
      saveWp(); renderWeapon(); return;
    }
    var nd = e.target.closest("button[data-slot]");
    if (nd) { openSlot = openSlot === nd.dataset.slot ? null : nd.dataset.slot; renderWeapon(); return; }
    if (e.target.closest("button[data-close]")) { openSlot = null; renderWeapon(); return; }
  });
  document.addEventListener("click", function (e) {
    if (openSlot && !e.target.closest(".amenu") && !e.target.closest("button[data-slot]")) { openSlot = null; renderWeapon(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "codeIn") { var msg = applyCode(e.target.value); if (msg) $("#codeErr").textContent = msg; } if (e.key === "Escape" && openSlot) { openSlot = null; renderWeapon(); } });

