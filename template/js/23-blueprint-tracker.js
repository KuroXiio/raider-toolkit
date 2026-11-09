  /* ---------- Blueprint tracker ---------- */
  var BPD = DB.bp || { list: [], rp: [] }, BPL = BPD.list || [];
  var BP_CATS = [["wpn", "Weapons"], ["att", "Attachments"], ["exp", "Grenades & mines"], ["heal", "Healing"], ["gad", "Gadgets"], ["aug", "Augments"], ["parts", "Gun parts"]];
  var BP_CN = {}; BP_CATS.forEach(function (c) { BP_CN[c[0]] = c[1]; });
  var bpS = store("rt-bp") || {}; bpS.own = bpS.own || {}; bpS.cat = bpS.cat || "all"; bpS.scope = bpS.scope || "now"; bpS.q = ""; var bpOpen = {};
  if (bpS.quest == null) bpS.quest = true; if (bpS.craft == null) bpS.craft = true; bpS.rpItem = bpS.rpItem || "";
  function saveBp() { store("rt-bp", { own: bpS.own, cat: bpS.cat, miss: !!bpS.miss, rp: bpS.rp || 0, scope: bpS.scope, quest: !!bpS.quest, craft: !!bpS.craft, rpItem: bpS.rpItem || "" }); }
  var BPQS = BPD.qs || {};
  function bpQuestFor(e) { if (!bpS.quest) return null; var q = bpQ(e).filter(function (x) { return x.done !== true; })[0]; return q || null; }
  /* builds one shopping list group for a set of missing blueprints, following the chosen options */
  function bpShop(list, key, label) {
    var items = {}, notes = [], res = [], byQ = {}, find = [];
    function add(m, mul) { Object.keys(m || {}).forEach(function (k) { items[k] = (items[k] || 0) + m[k] * (mul || 1); }); }
    list.forEach(function (e) {
      var q = bpQuestFor(e);
      if (q) { (byQ[q.q.id] = byQ[q.q.id] || { q: q.q, bps: [] }).bps.push(e.n); return; }
      if (e.rs) res.push(e); else find.push(e);
    });
    var rp = 0; res.forEach(function (e) { rp += e.rs.p; add(e.rs.m); });
    if (rp) {
      var have = Math.max(0, parseInt(bpS.rp, 10) || 0), need = Math.max(0, rp - have), ri = (BPD.rp || []).filter(function (x) { return x.i === bpS.rpItem; })[0];
      notes.push(fmt(rp) + " Research Points to research " + res.length + " blueprint" + (res.length === 1 ? "" : "s") + (have ? " (" + fmt(need) + " after the " + fmt(have) + " you have)" : "") + ".");
      if (ri && need) { var nb = Math.ceil(need / ri.p); items[ri.i] = (items[ri.i] || 0) + nb; notes.push(nb + "× " + nm(ri.i) + " covers that (" + fmt(ri.p) + " each)."); }
    }
    Object.keys(byQ).forEach(function (id) {
      var x = byQ[id], qd = BPQS[id] || {};
      notes.push("Quest: " + x.q.n + (qd.tr ? " (" + qd.tr + ")" : "") + " gives the " + x.bps.join(", ") + " blueprint" + (x.bps.length > 1 ? "s" : "") + "." + (qd.pre && qd.pre.length ? " Comes after " + qd.pre.join(", ") + "." : ""));
      add(qd.d);
    });
    find.forEach(function (e) {
      var w = e.fc && e.fc.length ? e.fc.join(" or ") : (e.f || "no source listed yet").split(/[.;]/)[0];
      notes.push("Find the " + e.n + " blueprint: " + w + (e.fc && e.fc.length ? " (map condition)" : "") + ".");
    });
    if (bpS.craft) list.forEach(function (e) { var it = IDX[e.id]; if (it && it.rp) add(it.rp); });
    shopSet(key, label, items, notes);
  }
  function stLvl(id) { return (ws.cur && ws.cur[id]) || 0; }
  function stById(id) { return STATIONS.filter(function (x) { return x.id === id; })[0]; }
  function stN(id) { var s = stById(id); return s ? sname(s) : id; }
  function bpArc(e) {
    if (!arcOn() || !arc.bp || arcNoData()) return false;
    var b = arc.bp;
    return !!((e.b && (b[e.b] || b[e.b.replace(/_blueprint$/, "")])) || b[e.id] || (e.w && b[e.w]) || b[arcNorm(e.n)] || b[arcNorm(e.n) + "_blueprint"]);
  }
  function bpOwned(e) { return bpArc(e) || !!bpS.own[e.id]; }
  function bpCraft(e) {
    var it = IDX[e.id], w = e.w && WIDX[e.w];
    var bench = w ? "weapon_bench" : it && it.cb && it.cb[0], lvl = w ? w.lvl : it && it.sl;
    if (!bench) return null;
    lvl = lvl || 1;
    return { bench: bench, lvl: lvl, ok: stLvl(bench) >= lvl };
  }
  function bpQ(e) {
    return (e.q || []).map(function (q) { return { q: q, done: arcOn() && arc.qd && !arcNoData() ? !!(arc.qd[arcNorm(q.id)] || arc.qd[arcNorm(q.n)]) : null }; });
  }
  function bpPlan(e) {
    if (bpOwned(e)) return { k: "own", c: bpCraft(e) };
    var qs = bpQ(e).filter(function (x) { return x.done !== true; });
    if (qs.length && bpS.quest) return { k: "quest", q: qs[0] };
    if (e.rs && stLvl("research") >= e.rs.l) return { k: "res" };
    if (qs.length) return { k: "quest", q: qs[0] };
    if (e.f && !/^Research Station/.test(e.f)) return { k: "find" };
    if (e.rs) return { k: "up", l: e.rs.l };
    return { k: "find" };
  }
  var BP_ORDER = { res: 0, quest: 1, find: 2, up: 3, own: 4 };
  function bpDur(s) { s = Math.max(0, s); if (s < 3600) return evClock(s); var m = Math.floor(s % 3600 / 60); return Math.floor(s / 3600) + " h " + (m < 10 ? "0" : "") + m + " min"; }
  function evFind(name, maps) {
    if (!EV || !EV.m) return null;
    var t0 = Date.parse(EV.t0), now = Date.now(), h = Math.floor((now - t0) / 3600000), left = (t0 + (h + 1) * 3600000 - now) / 1000;
    var ms = (maps && maps.length ? maps : MAP_ORDER).filter(function (m) { return EV.m[m]; });
    for (var k = 0; k <= EV.per; k++) for (var i = 0; i < ms.length; i++) {
      if (evAt(ms[i], h + k).split(" + ").indexOf(name) > -1) return { m: ms[i], now: k === 0, s: k === 0 ? left : left + (k - 1) * 3600 };
    }
    return null;
  }
  function bpCondTxt(c, maps) {
    var f = evFind(c, maps);
    if (!f) return '<b>' + esc(c) + '</b> <span class="dim">' + esc(t("not in the recorded rotation")) + "</span>";
    return "<b>" + esc(c) + "</b> " + (f.now ? '<span class="bpnow">' + esc(t("now on")) + " " + esc(MAPS[f.m].name) + "</span> · " + bpDur(f.s) + " " + esc(t("left")) : '<span class="dim">' + esc(t("next on")) + " " + esc(MAPS[f.m].name) + " " + esc(t("in")) + " " + bpDur(f.s) + "</span>");
  }
  function bpCond(c, maps) { return '<span class="bpc" data-bpc="' + esc(c) + '" data-bpm="' + esc((maps || []).join(",")) + '">' + bpCondTxt(c, maps) + "</span>"; }
  function bpThumb(e) {
    var id = ICONS[e.id] ? e.id : e.b && ICONS[e.b] ? e.b : e.id;
    return IDX[id] || ICONS[id] ? thumb(id) : '<span class="th"><i></i></span>';
  }
  function bpHow(e, p) {
    var rs = e.rs, s = "";
    if (p.k === "own") {
      if (!p.c) return '<span class="dim">' + esc(t("Recipe not published yet")) + "</span>";
      return p.c.ok ? esc(stN(p.c.bench)) + " " + p.c.lvl : '<span class="bpwarn">' + esc(t("Needs")) + " " + esc(stN(p.c.bench)) + " " + p.c.lvl + "</span> <small class=\"dim\">(" + esc(t("you have")) + " " + stLvl(p.c.bench) + ")</small>";
    }
    if (p.k === "res") return '<span class="bptag res">' + esc(t("Research")) + "</span> " + esc(t("Research Station")) + " " + rs.l;
    if (p.k === "quest") return '<span class="bptag q">' + esc(t("Quest")) + "</span> " + esc(p.q.q.n) + (p.q.done === false ? ' <small class="dim">(' + esc(t("not done yet")) + ")</small>" : "");
    if (p.k === "up") return '<span class="bptag up">' + esc(t("Upgrade")) + "</span> " + esc(t("Research Station")) + " " + rs.l + ' <small class="dim">(' + esc(t("you have")) + " " + stLvl("research") + ")</small>";
    s = '<span class="bptag find">' + esc(t("Find it")) + "</span> ";
    if (e.fc && e.fc.length) s += bpCond(e.fc[0], e.fm);
    else s += '<span class="bpf">' + esc(e.f || t("No source listed yet")) + "</span>";
    if (rs) s += '<small class="dim bpor">' + esc(t("or research at Research Station")) + " " + rs.l + "</small>";
    return s;
  }
  function bpDetail(e, p) {
    var out = [], rs = e.rs, rsl = stLvl("research");
    if (rs) out.push('<div class="bpd"><h5>' + esc(t("Research")) + '</h5><p><b class="rpv">' + fmt(rs.p) + " RP</b> · " + esc(t("Research Station")) + " " + rs.l +
      (rsl >= rs.l ? ' <span class="chipst ok">' + esc(t("unlocked")) + "</span>" : ' <span class="chipst">' + esc(t("you have level")) + " " + rsl + "</span>") + "</p>" + chips(rs.m).replace('class="cm-row"', 'class="cm-row tight"') + "</div>");
    if (e.f || (e.fc && e.fc.length)) out.push('<div class="bpd"><h5>' + esc(t("Where to find it")) + "</h5><p>" + esc(e.f || "") + "</p>" +
      (e.fc && e.fc.length ? '<ul class="bpcl">' + e.fc.map(function (c) { return "<li>" + bpCond(c, e.fm) + "</li>"; }).join("") + "</ul>" : "") +
      (e.fm && e.fm.length ? '<div class="chips tight">' + e.fm.map(function (k) { return MAPS[k] ? '<button type="button" class="chip orb" data-map="' + k + '">' + esc(MAPS[k].name) + "</button>" : ""; }).join("") + "</div>" : "") +
      (e.fs ? '<small class="dim">' + esc(t("Source")) + ": " + esc(e.fs) + "</small>" : "") + "</div>");
    var qs = bpQ(e);
    if (qs.length) out.push('<div class="bpd"><h5>' + esc(t("Quest reward")) + "</h5>" + qs.map(function (x) {
      var qd = BPQS[x.q.id] || {};
      return "<p><b>" + esc(x.q.n) + "</b>" + (qd.tr ? " · " + esc(qd.tr) : "") + (qd.m && qd.m.length ? " · " + esc(qd.m.join(", ")) : "") + (x.done === true ? ' <span class="qdone">done</span>' : x.done === false ? ' <span class="qopen">not done yet</span>' : "") + "</p>" +
        (qd.o && qd.o.length ? '<ul class="bpql">' + qd.o.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ul>" : "") +
        (qd.pre && qd.pre.length ? '<small class="dim">' + esc(t("Comes after")) + ": " + esc(qd.pre.join(", ")) + "</small>" : "");
    }).join("") + '<small class="dim">' + esc(t("A quest always gives the blueprint.")) + "</small></div>");
    var c = bpCraft(e), it = IDX[e.id];
    if (c) out.push('<div class="bpd"><h5>' + esc(t("Craft")) + "</h5><p>" + esc(stN(c.bench)) + " " + c.lvl + (c.ok ? ' <span class="chipst ok">' + esc(t("ready")) + "</span>" : ' <span class="chipst">' + esc(t("you have level")) + " " + stLvl(c.bench) + "</span>") + "</p>" +
      (it && it.rp ? chips(it.rp).replace('class="cm-row"', 'class="cm-row tight"') + '<button type="button" class="wchg" data-addm="' + e.id + '">+ ' + esc(t("Materials to shopping list")) + "</button>" : "") + "</div>");
    return '<div class="bpdet">' + out.join("") + "</div>";
  }
  function bpMats(list) { var m = {}, p = 0; list.forEach(function (e) { p += e.rs.p; Object.keys(e.rs.m).forEach(function (k) { m[k] = (m[k] || 0) + e.rs.m[k]; }); }); return { m: m, p: p }; }
  function bpInCat(e) { return bpS.cat === "all" || e.c === bpS.cat; }
  function bpMatchQ(e) { var q = (bpS.q || "").toLowerCase().trim(); return !q || e.n.toLowerCase().indexOf(q) > -1; }
  function renderBpTop() {
    var el = $("#bpTop"); if (!el) return;
    var rsl = stLvl("research"), miss = BPL.filter(function (e) { return !bpOwned(e); });
    var own = BPL.length - miss.length, craft = BPL.filter(function (e) { var p = bpPlan(e); return p.k === "own" && p.c && p.c.ok; }).length;
    var resNow = miss.filter(function (e) { return e.rs && e.rs.l <= rsl; }), rpNow = bpMats(resNow).p;
    var find = miss.filter(function (e) { var k = bpPlan(e).k; return k === "find" || k === "quest"; }).length;
    var src = arcOn() && arc.bp && !arcNoData() ? '<span class="arctag">' + esc(t("from your ARCTracker")) + "</span>" : '<span class="dim bpsrc">' + esc(t("Tick the blueprints you have, or link ARCTracker to fill this in.")) + "</span>";
    var stats = '<div class="bpstats">' +
      '<div class="bpsx"><b>' + own + "<small>/" + BPL.length + "</small></b><span>" + esc(t("Learned")) + "</span></div>" +
      '<div class="bpsx"><b>' + craft + "</b><span>" + esc(t("Can craft now")) + "</span></div>" +
      '<div class="bpsx"><b>' + resNow.length + "</b><span>" + esc(t("Research now")) + (rpNow ? " · " + fmt(rpNow) + " RP" : "") + "</span></div>" +
      '<div class="bpsx"><b>' + find + "</b><span>" + esc(t("To find or quest")) + "</span></div></div>" + '<p class="bpsrcl">' + src + "</p>";
    // research station card
    var rs = stById("research"), need = 0, unlock = 0;
    miss.forEach(function (e) { if (e.rs && e.rs.l > rsl) { if (!need || e.rs.l < need) need = e.rs.l; } });
    var nx = rsl + 1, card1;
    if (!rs) card1 = "";
    else {
      unlock = miss.filter(function (e) { return e.rs && e.rs.l === nx; }).length;
      var cost = nx <= rs.max ? (rs.lv[nx - 1] || []) : [], cm = {}; cost.forEach(function (x) { cm[x.i] = x.q; });
      var req = rs.req && rs.req[nx - 1], outL = stLvl("outpost");
      var body;
      if (rsl >= 3 || !need) body = "<p>" + esc(rsl ? t("Every blueprint you are missing can be researched at your level.") : t("You have no missing blueprints that need research.")) + "</p>";
      else body = "<p>" + (rsl ? esc(t("Level")) + " " + nx + " " + esc(t("unlocks research for")) + " <b>" + unlock + "</b> " + esc(t("of your missing blueprints.")) : esc(t("Build it to research blueprints instead of hunting for them. Level 1 unlocks")) + " <b>" + unlock + "</b> " + esc(t("of your missing blueprints."))) + "</p>" +
        (req ? '<p class="dim bpreq">' + esc(t("Needs")) + " " + esc(req) + (/Outpost level (\d)/.test(req) ? " · " + esc(t("you have")) + " " + outL + (outL >= +req.match(/Outpost level (\d)/)[1] ? ' <span class="chipst ok">ok</span>' : "") : "") + "</p>" : "") +
        (cost.length ? chips(cm).replace('class="cm-row"', 'class="cm-row tight"') + '<div class="bpbtns"><button type="button" class="btn orb sm" data-bpup="' + nx + '">' + esc(t("Add upgrade to shopping list")) + '</button><a class="wchg" href="#workshop">' + esc(t("Open Workshop planner")) + "</a></div>" : "");
      card1 = '<section class="panel bpcard"><div class="tag-k">' + esc(t("Research Station")) + '</div><h3>' + (rsl ? esc(t("Level")) + " " + rsl : esc(t("Not built yet"))) + ' <small class="dim">' + esc(t("from your Workshop planner")) + "</small></h3>" + body + "</section>";
    }
    // research points card
    var mine = Math.max(0, parseInt(bpS.rp, 10) || 0), left = Math.max(0, rpNow - mine);
    var rpl = (BPD.rp || []).map(function (r) { return '<li><button type="button" class="bprpn" data-find="' + esc(nm(r.i)) + '" title="' + esc(t("Show where it spawns")) + '">' + thumb(r.i) + esc(nm(r.i)) + '</button><b>' + fmt(r.p) + "</b><small>" + esc(r.w) + "</small></li>"; }).join("");
    var hb = (BPD.rp || []).filter(function (r) { return r.i === "exodus_technical_handbook"; })[0], fn = (BPD.rp || []).filter(function (r) { return r.i === "frigate_diagnostic_node"; })[0];
    var card2 = '<section class="panel bpcard"><div class="tag-k">' + esc(t("Research points")) + "</div><h3>" + (rpNow ? fmt(left) + ' <small class="dim">' + esc(t("RP still to collect")) + "</small>" : '<small class="dim">' + esc(t("Nothing to research at your level right now")) + "</small>") + "</h3>" +
      '<label class="bprpin"><span>' + esc(t("Research points you have")) + '</span><input type="number" min="0" step="50" id="bpRp" value="' + (mine || "") + '" placeholder="0" inputmode="numeric"></label>' +
      (left && hb && fn ? '<p class="dim bpeq">' + esc(t("That is about")) + " " + Math.ceil(left / hb.p) + " × " + esc(nm(hb.i)) + " " + esc(t("or")) + " " + Math.ceil(left / fn.p) + " × " + esc(nm(fn.i)) + ".</p>" : "") +
      '<p class="bpfr">' + bpCond("ARC Frigate") + "</p>" +
      '<details class="bprpd"><summary>' + esc(t("Where to farm research points")) + "</summary><ul class=\"bprpl\">" + rpl + "</ul></details></section>";
    // filters
    var cnt = {}; miss.forEach(function (e) { cnt[e.c] = (cnt[e.c] || 0) + 1; });
    var chipsH = '<div class="chips bpcats"><button type="button" class="chip" data-bpcat="all" aria-pressed="' + (bpS.cat === "all") + '">' + esc(t("All")) + " <small>" + miss.length + "</small></button>" +
      BP_CATS.map(function (c) { return '<button type="button" class="chip" data-bpcat="' + c[0] + '" aria-pressed="' + (bpS.cat === c[0]) + '">' + esc(t(c[1])) + " <small>" + (cnt[c[0]] || 0) + "</small></button>"; }).join("") + "</div>";
    var rpo = '<option value="">' + esc(t("Research Points only")) + "</option>" + (BPD.rp || []).map(function (x) { return '<option value="' + x.i + '"' + (bpS.rpItem === x.i ? " selected" : "") + ">" + esc(nm(x.i)) + " (" + x.p + ")</option>"; }).join("");
    var opts = '<div class="panel bpopts"><div class="bpoh"><b>' + esc(t("Shopping list")) + "</b><span class=\"dim\">" + esc(t("What the + buttons add for missing blueprints")) + "</span></div>" +
      '<label class="bptog"><input type="checkbox" id="bpOptQ"' + (bpS.quest ? " checked" : "") + "> <span>" + esc(t("Use a quest when one gives the blueprint")) + "</span></label>" +
      '<label class="bptog"><input type="checkbox" id="bpOptC"' + (bpS.craft ? " checked" : "") + "> <span>" + esc(t("Include crafting materials")) + "</span></label>" +
      '<label class="bpsel"><span>' + esc(t("Research Points as")) + '</span><select id="bpOptRp">' + rpo + "</select></label>" +
      '<button type="button" class="btn go orb sm" data-bpshopcat="all">' + esc(t("Add all to shopping list")) + "</button></div>";
    var bar = opts + '<div class="bpbar">' + chipsH + '<div class="bpbar2"><label class="bptog"><input type="checkbox" id="bpMiss"' + (bpS.miss ? " checked" : "") + "> <span>" + esc(t("Missing only")) + '</span></label><input type="search" id="bpQ" placeholder="' + esc(t("Search blueprints…")) + '" autocomplete="off" aria-label="' + esc(t("Search blueprints…")) + '"></div><small class="dim bpnote">' + esc(t("Counts show how many you are still missing.")) + "</small></div>";
    var qv = ($("#bpQ") || {}).value || "";
    el.innerHTML = stats + '<div class="bpcards">' + card1 + card2 + "</div>" + renderBpCost(miss, rsl) + bar;
    if ($("#bpQ")) $("#bpQ").value = qv;
  }
  function renderBpCost(miss, rsl) {
    var pool = miss.filter(function (e) { return e.rs && !bpQuestFor(e) && (bpS.scope === "all" || e.rs.l <= rsl); });
    var rows = BP_CATS.map(function (c) {
      var l = pool.filter(function (e) { return e.c === c[0]; }); if (!l.length) return "";
      var m = bpMats(l);
      return '<div class="bpcr"><div class="bpcrh"><b>' + esc(t(c[1])) + '</b><span class="dim">' + l.length + " " + esc(t(l.length === 1 ? "blueprint" : "blueprints")) + '</span><b class="rpv">' + fmt(m.p) + " RP</b></div>" + chips(m.m).replace('class="cm-row"', 'class="cm-row tight"') + "</div>";
    }).join("");
    var tot = bpMats(pool);
    return '<details class="panel bpcost"' + (bpS.costOpen ? " open" : "") + '><summary><span>' + esc(t("Combined research cost")) + '</span><b class="rpv">' + fmt(tot.p) + " RP</b><small class=\"dim\">" + pool.length + " " + esc(t("blueprints")) + " · " + Object.keys(tot.m).length + " " + esc(t("materials")) + "</small></summary>" +
      '<div class="bpcb"><div class="seg bpseg" role="group"><button type="button" data-bpscope="now" aria-pressed="' + (bpS.scope !== "all") + '">' + esc(t("Researchable now")) + '</button><button type="button" data-bpscope="all" aria-pressed="' + (bpS.scope === "all") + '">' + esc(t("All missing")) + "</button></div>" +
      (rows || '<p class="dim">' + esc(bpS.scope === "all" ? t("Nothing left to research.") : t("Nothing to research at your level right now")) + "</p>") +
      (pool.length ? '<div class="bpcrt"><b>' + esc(t("Total")) + '</b><b class="rpv">' + fmt(tot.p) + ' RP</b><button type="button" class="btn go orb sm" data-bpshop="1">' + esc(t("Add materials to shopping list")) + "</button></div>" : "") + "</div></details>";
  }
  function renderBpList() {
    var el = $("#bpBody"); if (!el) return;
    var rsl = stLvl("research"), cats = bpS.cat === "all" ? BP_CATS : BP_CATS.filter(function (c) { return c[0] === bpS.cat; });
    var html = cats.map(function (c) {
      var all = BPL.filter(function (e) { return e.c === c[0]; });
      var list = all.filter(function (e) { return bpMatchQ(e) && (!bpS.miss || !bpOwned(e)); });
      if (!list.length) return "";
      var ownN = all.filter(bpOwned).length, rest = bpMats(all.filter(function (e) { return !bpOwned(e) && e.rs && !bpQuestFor(e); }));
      var rows = list.map(function (e) { return { e: e, p: bpPlan(e) }; }).sort(function (a, b) { return BP_ORDER[a.p.k] - BP_ORDER[b.p.k] || a.e.n.localeCompare(b.e.n); }).map(function (r) {
        var e = r.e, p = r.p, own = p.k === "own", fromArc = bpArc(e), open = !!bpOpen[e.id];
        var st = own ? (p.c && p.c.ok ? '<span class="bps ok">' + esc(t("Can craft")) + "</span>" : '<span class="bps own">' + esc(t("Learned")) + "</span>") : '<span class="bps miss">' + esc(t("Missing")) + "</span>";
        return '<tr class="bpr' + (own ? " own" : "") + (open ? " open" : "") + '" data-bprow="' + e.id + '"><td class="bcc">' +
          '<button type="button" class="bpck" data-bpown="' + e.id + '" aria-pressed="' + own + '"' + (fromArc ? ' disabled title="' + esc(t("Learned, from your ARCTracker")) + '"' : ' title="' + esc(own ? t("Untick if you have not learned it") : t("Tick if you have learned it")) + '"') + '><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></button></td>' +
          '<td class="bcn"><div class="bpn">' + bpThumb(e) + "<div><b>" + esc(e.n) + "</b>" + (fromArc ? '<small class="arctag">ARCTracker</small>' : "") + "</div></div></td>" +
          '<td class="bcs">' + st + "</td>" +
          '<td class="bch">' + bpHow(e, p) + "</td>" +
          '<td class="r bcr">' + (e.rs && !own && p.k !== "quest" ? fmt(e.rs.p) + " <small>RP</small>" : p.k === "quest" ? '<small class="bpfree">' + esc(t("free")) + "</small>" : '<span class="dim">–</span>') + "</td>" +
          '<td class="bcx"><span class="bpchev" aria-hidden="true"></span></td></tr>' + (open ? '<tr class="bpdr"><td colspan="6">' + bpDetail(e, p) + "</td></tr>" : "");
      }).join("");
      return '<section class="bpgrp"><header class="bpgh"><h3>' + esc(t(c[1])) + '</h3><span class="dim">' + ownN + " / " + all.length + " " + esc(t("learned")) + "</span>" + (rest.p ? '<span class="rpv">' + fmt(rest.p) + " RP " + esc(t("to research the rest")) + "</span>" : "") + (all.some(function (x) { return !bpOwned(x); }) ? '<button type="button" class="wchg bpaddc" data-bpshopcat="' + c[0] + '">+ ' + esc(t("Add to shopping list")) + "</button>" : "") + '</header><div class="bptw"><table class="bpt"><colgroup><col class="bcc"><col class="bcn"><col class="bcs"><col class="bch"><col class="bcr"><col class="bcx"></colgroup><thead><tr><th class="bcc"><span class="sr">' + esc(t("Learned")) + '</span></th><th>' + esc(t("Blueprint")) + "</th><th>" + esc(t("Status")) + "</th><th>" + esc(t("Best way to get it")) + '</th><th class="r">' + esc(t("Research cost")) + '</th><th class="bcx"></th></tr></thead><tbody>' + rows + "</tbody></table></div></section>";
    }).join("");
    el.innerHTML = html || '<p class="dim bpempty">' + esc(bpS.miss ? t("Nothing missing here. Nice.") : t("No blueprint matches that search.")) + "</p>";
  }
  function renderBp() { renderBpTop(); renderBpList(); }
  function bpTick() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-bpc]"), function (s) { var m = s.dataset.bpm; s.innerHTML = bpCondTxt(s.dataset.bpc, m ? m.split(",") : null); });
  }
  setInterval(function () { var v = $("#v-blueprints"); if (v && v.classList.contains("on") && !document.hidden) bpTick(); }, 1000);
  document.addEventListener("click", function (e) {
    var v = $("#v-blueprints"); if (!v || !v.contains(e.target)) return;
    var b;
    if ((b = e.target.closest("[data-bpcat]"))) { bpS.cat = b.dataset.bpcat; saveBp(); renderBp(); return; }
    if ((b = e.target.closest("[data-bpscope]"))) { bpS.scope = b.dataset.bpscope; bpS.costOpen = true; saveBp(); renderBpTop(); return; }
    if ((b = e.target.closest("[data-bpown]"))) { var id = b.dataset.bpown; if (bpS.own[id]) delete bpS.own[id]; else bpS.own[id] = 1; saveBp(); renderBp(); return; }
    if ((b = e.target.closest("[data-bpup]"))) {
      var n = +b.dataset.bpup, rs = stById("research"), m = {}; ((rs && rs.lv[n - 1]) || []).forEach(function (x) { m[x.i] = x.q; });
      shopSet("bp:rs" + n, t("Research Station") + " " + t("level") + " " + n, m); return;
    }
    if ((b = e.target.closest("[data-bpshopcat]"))) {
      var ck = b.dataset.bpshopcat, cl = BPL.filter(function (x) { return !bpOwned(x) && (ck === "all" || x.c === ck); });
      bpShop(cl, "bp:cat:" + ck, (ck === "all" ? t("All missing blueprints") : t(BP_CN[ck]) + " " + t("blueprints")) + " (" + cl.length + ")"); return;
    }
    if ((b = e.target.closest("[data-bpshop]"))) {
      var rsl = stLvl("research"), pool = BPL.filter(function (x) { return !bpOwned(x) && x.rs && (bpS.scope === "all" || x.rs.l <= rsl); });
      bpShop(pool, "bp:research", t("Blueprint research") + " (" + pool.length + ")"); return;
    }
    if (e.target.closest("a, button, input, label, .bpdet")) return;
    if ((b = e.target.closest("[data-bprow]"))) { var k = b.dataset.bprow; bpOpen[k] = !bpOpen[k]; renderBpList(); }
  });
  document.addEventListener("toggle", function (e) { if (e.target && e.target.classList && e.target.classList.contains("bpcost")) bpS.costOpen = e.target.open; }, true);
  document.addEventListener("input", function (e) {
    if (!e.target) return;
    if (e.target.id === "bpQ") { bpS.q = e.target.value; renderBpList(); }
    if (e.target.id === "bpRp") { bpS.rp = Math.max(0, parseInt(e.target.value, 10) || 0); saveBp(); clearTimeout(bpRpT); bpRpT = setTimeout(function () { var f = document.activeElement && document.activeElement.id === "bpRp"; renderBpTop(); if (f && $("#bpRp")) { var i = $("#bpRp"); i.focus(); var l = i.value.length; try { i.setSelectionRange(l, l); } catch (x) {} } }, 500); }
  });
  var bpRpT;
  document.addEventListener("change", function (e) {
    if (!e.target) return; var id = e.target.id;
    if (id === "bpMiss") { bpS.miss = e.target.checked; saveBp(); renderBpList(); }
    if (id === "bpOptQ") { bpS.quest = e.target.checked; saveBp(); renderBp(); }
    if (id === "bpOptC") { bpS.craft = e.target.checked; saveBp(); }
    if (id === "bpOptRp") { bpS.rpItem = e.target.value; saveBp(); }
  });

