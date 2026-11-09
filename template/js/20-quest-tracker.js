  /* ---------- Quest tracker (needs ARCTracker for finished quests) ---------- */
  var QUESTS = DB.quests || [], QIDX = {}; QUESTS.forEach(function (q) { QIDX[q.id] = q; });
  var QTR = ["Shani", "Celeste", "Tian Wen", "Apollo", "Lance"];
  QUESTS.forEach(function (q) { if (q.tr && QTR.indexOf(q.tr) < 0) QTR.push(q.tr); });
  var qS = store("rt-q") || {}; qS.show = qS.show || "open"; qS.tr = qS.tr || "all"; qS.q = ""; var qOpen = {};
  function saveQ() { store("rt-q", { show: qS.show, tr: qS.tr }); }
  function qOn() { return arcOn() && !!arc.at && !arcNoData() && !arc.err && !!arc.qd; }
  function qName(q) { return (q.nl && q.nl[LANG]) || q.n; }
  function qDone(q) { if (!arc.qd) return false; return !!(arc.qd[arcNorm(q.id)] || arc.qd[arcNorm(q.n)]); }
  function qState(q) { if (qDone(q)) return "done"; return q.pre.every(function (p) { return !QIDX[p] || qDone(QIDX[p]); }) ? "open" : "locked"; }
  function qItems(list, cls) {
    return (list || []).map(function (x) {
      var it = IDX[x[0]], bp = it && it.t === "Blueprint";
      return '<span class="qi' + (bp ? " bp" : "") + (cls ? " " + cls : "") + '" title="' + esc(nm(x[0])) + (x[1] > 1 ? " ×" + x[1] : "") + '">' + thumb(x[0]) + (bp ? "<em>BP</em>" : "") + (x[1] > 1 ? "<b>" + fmt(x[1]) + "</b>" : "") + "</span>";
    }).join("");
  }
  function qMaps(q) { return q.m.length ? q.m.map(function (k) { return MAPS[k] ? MAPS[k].name : k; }).join(", ") : '<span class="dim">' + esc(t("Any map")) + "</span>"; }
  function qMapBtn(q) {
    if (!q.mk) return "";
    var n = 0; Object.keys(q.mk.c).forEach(function (k) { n += q.mk.c[k]; });
    var lab = q.mk.route ? t("Show route") : n > 1 ? t("Show locations") : t("Show location");
    return '<button type="button" class="qmapb" data-qmshow="' + q.id + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (q.mk.route ? "M6 18c3-6 9-2 12-12M6 18a1.6 1.6 0 1 1 0 .1M18 6a1.6 1.6 0 1 1 0 .1" : "M12 21s7-7.6 7-13a7 7 0 0 0-14 0c0 5.4 7 13 7 13zM12 6.5a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4z") + '"/></svg>' + esc(lab) + "</button>";
  }
  function qDetail(q, st) {
    var out = [];
    out.push('<div class="bpd"><h5>' + esc(t("What to do")) + '</h5><ol class="qobj">' + q.o.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") + "</ol>" + (q.oth ? '<small class="dim">' + esc(q.oth.join(", ")) + "</small>" : "") + "</div>");
    if (q.req.length) {
      var m = {}; q.req.forEach(function (x) { m[x[0]] = x[1]; });
      out.push('<div class="bpd"><h5>' + esc(t("Items to hand in")) + "</h5>" + chips(m).replace('class="cm-row"', 'class="cm-row tight"') + (st !== "done" ? '<button type="button" class="wchg" data-qshop="' + q.id + '">+ ' + esc(t("Add to shopping list")) + "</button>" : "") + "</div>");
    }
    var rw = {}; q.r.forEach(function (x) { rw[x[0]] = x[1]; });
    out.push('<div class="bpd"><h5>' + esc(t("Rewards")) + "</h5>" + (q.r.length ? chips(rw).replace('class="cm-row"', 'class="cm-row tight"') : '<p class="dim">' + esc(t("No item rewards")) + "</p>") + (q.g.length ? '<small class="dim">' + esc(t("You also get for the quest")) + ": " + esc(q.g.map(function (x) { return nm(x[0]); }).join(", ")) + "</small>" : "") + "</div>");
    var pre = q.pre.map(function (k) { return QIDX[k]; }).filter(Boolean), nx = q.nx.map(function (k) { return QIDX[k]; }).filter(Boolean);
    if (pre.length || nx.length) out.push('<div class="bpd"><h5>' + esc(t("Quest chain")) + "</h5>" +
      (pre.length ? "<p><span class=\"dim\">" + esc(t("Comes after")) + ":</span> " + pre.map(function (x) { return esc(qName(x)) + (qDone(x) ? ' <span class="qdone">' + esc(t("done")) + "</span>" : ""); }).join(", ") + "</p>" : "") +
      (nx.length ? "<p><span class=\"dim\">" + esc(t("Unlocks")) + ":</span> " + nx.map(function (x) { return esc(qName(x)); }).join(", ") + "</p>" : "") + "</div>");
    return '<div class="bpdet">' + out.join("") + "</div>";
  }
  function renderQuests() {
    var el = $("#qBody"), top = $("#qTop"); if (!el || !top) return;
    var on = qOn(), nd = arcOn() && arcNoData();
    var cnt = { done: 0, open: 0, locked: 0 }, st = {};
    QUESTS.forEach(function (q) { st[q.id] = on ? qState(q) : "open"; cnt[st[q.id]]++; });
    var bpLeft = on ? QUESTS.filter(function (q) { return st[q.id] !== "done" && q.r.some(function (x) { var it = IDX[x[0]]; return it && it.t === "Blueprint"; }); }).length : 0;
    var newer = on && arc.qc ? Math.max(0, arc.qc - cnt.done) : 0;
    var gate = "";
    if (!on) gate = '<div class="panel qgate"><div class="qgi" aria-hidden="true"></div><div><b>' + esc(nd ? t("ARCTracker has no quest data for you yet") : arc.err && arcOn() ? t("ARCTracker could not be reached") : t("Link ARCTracker to use the Quest tracker")) + "</b><p>" +
      esc(nd ? t("Your key works, but ARCTracker has nothing from the game yet. Install ARC Tracker Link on your PC and sync once, then refresh here.") : t("The Quest tracker shows which quests you have finished, which are open now and what each one gives. It reads your finished quests from ARCTracker, so it only works once you have linked it.")) +
      "</p>" + (nd ? '<a class="btn orb sm" href="' + ARC_APP_URL + '" target="_blank" rel="noopener">' + esc(t("Open the install guide")) + "</a>" : '<button type="button" class="btn go orb sm" data-arc="open">' + esc(t("Link ARCTracker")) + "</button>") + "</div></div>";
    var stats = '<div class="bpstats' + (on ? "" : " qoff") + '">' +
      '<div class="bpsx"><b>' + (on ? cnt.done : "–") + "<small>/" + QUESTS.length + "</small></b><span>" + esc(t("Finished")) + "</span></div>" +
      '<div class="bpsx"><b>' + (on ? cnt.open : "–") + "</b><span>" + esc(t("Open now")) + "</span></div>" +
      '<div class="bpsx"><b>' + (on ? cnt.locked : "–") + "</b><span>" + esc(t("Locked")) + "</span></div>" +
      '<div class="bpsx"><b>' + (on ? bpLeft : "–") + "</b><span>" + esc(t("Still give a blueprint")) + "</span></div></div>" +
      (newer ? '<p class="bpsrcl dim">' + newer + " " + esc(t(newer === 1 ? "finished quest is newer than the site's data and is not listed." : "finished quests are newer than the site's data and are not listed.")) + "</p>" : "");
    var trc = {}; QUESTS.forEach(function (q) { if (!on || st[q.id] !== "done") trc[q.tr] = (trc[q.tr] || 0) + 1; });
    var bar = '<div class="bpbar' + (on ? "" : " qoff") + '"><div class="bpbar2"><div class="seg bpseg" role="group">' +
      [["open", "Open now"], ["all", "All"], ["done", "Finished"]].map(function (x) { return '<button type="button" data-qshow="' + x[0] + '" aria-pressed="' + (qS.show === x[0]) + '"' + (on ? "" : " disabled") + ">" + esc(t(x[1])) + "</button>"; }).join("") + "</div>" +
      '<input type="search" id="qQ" placeholder="' + esc(t("Search quests…")) + '" autocomplete="off" aria-label="' + esc(t("Search quests…")) + '"' + (on ? "" : " disabled") + ">" +
      (on && cnt.open ? '<button type="button" class="btn orb sm" data-qshopall="1">' + esc(t("Add items for open quests")) + "</button>" : "") + "</div>" +
      '<div class="chips bpcats"><button type="button" class="chip" data-qtr="all" aria-pressed="' + (qS.tr === "all") + '"' + (on ? "" : " disabled") + ">" + esc(t("All traders")) + "</button>" +
      QTR.map(function (n) { return '<button type="button" class="chip" data-qtr="' + esc(n) + '" aria-pressed="' + (qS.tr === n) + '"' + (on ? "" : " disabled") + ">" + esc(n) + " <small>" + (trc[n] || 0) + "</small></button>"; }).join("") + "</div></div>";
    var qv = ($("#qQ") || {}).value || "";
    top.innerHTML = gate + stats + bar;
    if ($("#qQ")) $("#qQ").value = qv;
    var q = (qS.q || "").toLowerCase().trim(), show = on ? qS.show : "all";
    var ORD = { open: 0, locked: 1, done: 2 };
    var groups = (qS.tr === "all" || !on ? QTR : [qS.tr]).map(function (tr) {
      var all = QUESTS.filter(function (x) { return x.tr === tr; });
      var list = all.filter(function (x) { return (show === "all" || st[x.id] === show) && (!q || qName(x).toLowerCase().indexOf(q) > -1 || x.n.toLowerCase().indexOf(q) > -1); });
      if (!on) list = list.slice(0, 4);
      if (!list.length) return "";
      list.sort(function (a, b) { return ORD[st[a.id]] - ORD[st[b.id]]; });
      var dn = all.filter(function (x) { return st[x.id] === "done"; }).length;
      var rows = list.map(function (x) {
        var s = st[x.id], open = on && !!qOpen[x.id];
        var pill = '<span class="bps ' + (s === "done" ? "ok" : s === "open" ? "own" : "lk") + '">' + esc(t(s === "done" ? "Finished" : s === "open" ? "Open" : "Locked")) + "</span>";
        return '<tr class="bpr qr' + (s === "done" ? " own" : "") + (open ? " open" : "") + '" data-qrow="' + x.id + '"><td class="qcs">' + pill + '</td><td class="qcn"><b>' + esc(qName(x)) + "</b>" + (s === "locked" ? '<small class="dim">' + esc(t("after")) + " " + esc(x.pre.map(function (k) { return QIDX[k] ? qName(QIDX[k]) : k; }).join(", ")) + "</small>" : "") + '</td><td class="qcm">' + qMaps(x) + qMapBtn(x) + '</td><td class="qcr"><span class="qlab">' + esc(t("Rewards")) + '</span><div class="qis">' + qItems(x.r) + "</div></td>" +
          '<td class="qcq">' + (x.req.length ? '<span class="qlab">' + esc(t("Hand in")) + '</span><div class="qis">' + qItems(x.req, "need") + "</div>" : '<span class="dim">–</span>') + '</td><td class="bcx"><span class="bpchev" aria-hidden="true"></span></td></tr>' +
          (open ? '<tr class="bpdr"><td colspan="6">' + qDetail(x, s) + "</td></tr>" : "");
      }).join("");
      return '<section class="bpgrp"><header class="bpgh"><h3>' + esc(tr) + "</h3>" + (on ? '<span class="dim">' + dn + " / " + all.length + " " + esc(t("finished")) + "</span>" : "") + '</header><div class="bptw"><table class="bpt qt"><colgroup><col class="qcs"><col class="qcn"><col class="qcm"><col class="qcr"><col class="qcq"><col class="bcx"></colgroup><thead><tr><th>' + esc(t("Status")) + "</th><th>" + esc(t("Quest")) + "</th><th>" + esc(t("Map")) + "</th><th>" + esc(t("Rewards")) + "</th><th>" + esc(t("Hand in")) + '</th><th class="bcx"></th></tr></thead><tbody>' + rows + "</tbody></table></div></section>";
    }).join("");
    el.className = on ? "" : "qoff";
    el.innerHTML = groups || '<p class="dim bpempty">' + esc(show === "open" ? t("No open quests here. Nice.") : t("No quest matches that search.")) + "</p>";
    var nq = $("#ndQuest"); if (nq) nq.classList.toggle("lock", !on);
  }
  setTimeout(function () { var nq = $("#ndQuest"); if (nq) nq.classList.toggle("lock", !qOn()); }, 0);
  document.addEventListener("click", function (e) {
    var v = $("#v-quests"); if (!v || !v.contains(e.target)) return;
    var b;
    if ((b = e.target.closest("[data-qshow]"))) { qS.show = b.dataset.qshow; saveQ(); renderQuests(); return; }
    if ((b = e.target.closest("[data-qtr]"))) { qS.tr = b.dataset.qtr; saveQ(); renderQuests(); return; }
    if ((b = e.target.closest("[data-qshop]"))) { var q = QIDX[b.dataset.qshop], m = {}; q.req.forEach(function (x) { m[x[0]] = x[1]; }); shopSet("q:" + q.id, t("Quest") + ": " + qName(q), m, [t("Hand in to") + " " + q.tr + "."]); return; }
    if ((b = e.target.closest("[data-qshopall]"))) {
      var m2 = {}, ns = [], oq = QUESTS.filter(function (x) { return qState(x) === "open" && x.req.length; });
      oq.forEach(function (x) { x.req.forEach(function (y) { m2[y[0]] = (m2[y[0]] || 0) + y[1]; }); ns.push(qName(x) + " (" + x.tr + "): " + x.req.map(function (y) { return y[1] + "× " + nm(y[0]); }).join(", ")); });
      if (!oq.length) { toast(t("None of your open quests need items handed in."), true); return; }
      shopSet("q:open", t("Open quests") + " (" + oq.length + ")", m2, ns); return;
    }
    if (e.target.closest("a, button, input, label, .bpdet")) return;
    if ((b = e.target.closest("[data-qrow]")) && qOn()) { var k = b.dataset.qrow; qOpen[k] = !qOpen[k]; renderQuests(); }
  });
  document.addEventListener("input", function (e) { if (e.target && e.target.id === "qQ") { qS.q = e.target.value; var c = document.activeElement === e.target; renderQuests(); if (c && $("#qQ")) { var i = $("#qQ"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } });

