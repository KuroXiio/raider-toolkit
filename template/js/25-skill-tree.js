  /* ---------- Skill tree planner (the 2.0 tree) ----------
     Each point is one entry in sk.o, in the order it was spent, so the pick order and the share link come for free.
     Rules: the second skill of a path needs a point in the first; the choice (pick 1 of 2) needs 10 points in the
     start and early skills of its branch plus a point at the end of an early path; the late paths need the choice;
     the end choice (2 of 3) needs a point at the end of a late path, 30 points for the first pick and 40 for the second. */
  var SKD = DB.skills || null, SKIDS = [], SKB = {}, SKP = {};
  var SKA = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (SKD) SKD.br.forEach(function (b) {
    b.ids = []; b.e2 = b.early.map(function (p) { return p[1]; }); b.l2 = b.late.map(function (p) { return p[1]; });
    b.low = [b.start].concat(b.early[0], b.early[1]);
    function add(id, kind, x, y, path) { SKIDS.push(id); b.ids.push(id); SKB[id] = b; SKP[id] = { k: kind, x: x, y: y, p: path }; }
    add(b.start, "start", 50, 92);
    b.early.forEach(function (p, i) { var x = i ? 72 : 28; add(p[0], "e1", x, 79, i); add(p[1], "e2", x, 66, i); });
    b.choice.forEach(function (id, i) { add(id, "ch", 50, 53, i); });
    b.late.forEach(function (p, i) { var x = [16, 50, 84][i]; add(p[0], "l1", x, 40, i); add(p[1], "l2", x, 27, i); });
    b.end.forEach(function (id, i) { add(id, "end", 50, 10, i); });
    b.fill = b.ids.reduce(function (n, id) { return n + SKD.s[id].m; }, 0) - 2;   // one of the two choices, two of the three end skills
  });
  var SKG = {
    shield: "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z",
    lungs: "M12 4v7M12 11c-1.4-1.8-3-2.6-4.8-2.6C5.3 8.4 4 10.6 4 13.6v3.2c0 1.8 1.7 2.8 3.4 1.9L12 16M12 11c1.4-1.8 3-2.6 4.8-2.6 1.9 0 3.2 2.2 3.2 5.2v3.2c0 1.8-1.7 2.8-3.4 1.9L12 16",
    vault: "M3 20h18M7 20v-5h10v5M4 12c3-7 13-7 16 0M17 9l3 3-4 1",
    pack: "M7 8h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM9 8V6a3 3 0 0 1 6 0v2M9 14h6",
    heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM12 9.5v5M9.5 12h5",
    crawl: "M3 19h18M4 15c2.5-3 5-3 7.5 0s5 3 8.5 0M15 8a2 2 0 1 0 0 .1",
    pry: "M6 19L18 7M18 7l-3.5-1M18 7l1 3.5M6 19H3.5v-2.5",
    fist: "M7 12V8a1.5 1.5 0 0 1 3 0v3M10 11V6.5a1.5 1.5 0 0 1 3 0V11M13 11V7.5a1.5 1.5 0 0 1 3 0V12M16 12v-1.5a1.5 1.5 0 0 1 3 0V14c0 4-3 7-7 7s-6-2.6-6-6v-2a1.5 1.5 0 0 1 3 0v1",
    climb: "M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8",
    roll: "M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5",
    bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
    speed: "M4 6l6 6-6 6M12 6l6 6-6 6",
    eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    quiet: "M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6",
    fall: "M12 3v12M7 10l5 5 5-5M5 20h14",
    craft: "M14.5 5.5a4 4 0 0 0 4.9 4.9L10 19.8a2.1 2.1 0 0 1-3-3l9.4-9.4a4 4 0 0 1-1.9-1.9z",
    split: "M12 21v-6M12 15l-6-6M12 15l6-6M6 9V4M18 9V4M4 6l2-2 2 2M16 6l2-2 2 2",
    star: "M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16.4l-5.1 2.9 1.1-5.8-4.3-4 5.8-.7z",
    mine: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2"
  };
  var sk = store("rt-skills") || {}, skSel = "", skPrev = null, skMsg = "", skPop = "", skBuildsOpen = true;
  if (!Array.isArray(sk.o)) sk.o = [];
  sk.p = Math.max(1, Math.min(SKD ? SKD.pts.max : 91, parseInt(sk.p, 10) || (SKD ? SKD.pts.levels : 76)));
  if (!sk.br) sk.br = "cond";
  function skSave() { store("rt-skills", { o: sk.o, p: sk.p, br: sk.br }); }
  function skName(id) { return SKD.s[id] ? SKD.s[id].n : id; }
  function skCount(o) { var c = {}; o.forEach(function (id) { c[id] = (c[id] || 0) + 1; }); return c; }
  function skSum(c, ids) { return ids.reduce(function (n, id) { return n + (c[id] || 0); }, 0); }
  function skTotal(c) { return Object.keys(c).reduce(function (n, id) { return n + c[id]; }, 0); }
  function skOr(ids) { var n = ids.map(skName); return n.length > 1 ? n.slice(0, -1).join(", ") + " " + t("or") + " " + n[n.length - 1] : n[0]; }
  /* is this node's allocation allowed, given everything else in c? "" when it is, otherwise the reason */
  function skWhy(c, id) {
    var P = SKP[id], b = SKB[id], have = function (x) { return (c[x] || 0) > 0; };
    if ((c[id] || 0) > SKD.s[id].m) return t("Already maxed.");
    if (P.k === "e1" && !have(b.start)) return t("Needs a point in") + " " + skName(b.start) + ".";
    if (P.k === "e2" && !have(b.early[P.p][0])) return t("Needs a point in") + " " + skName(b.early[P.p][0]) + ".";
    if (P.k === "ch") {
      var other = b.choice[1 - P.p];
      if (have(other)) return t("You picked") + " " + skName(other) + ". " + t("Only one of the two.");
      var low = skSum(c, b.low);
      if (low < SKD.gate.choice) return t("Needs") + " " + SKD.gate.choice + " " + t("points in") + " " + t(b.n) + " (" + low + ").";
      if (!b.e2.some(have)) return t("Needs a point in") + " " + skOr(b.e2) + ".";
    }
    if (P.k === "l1" && !b.choice.some(have)) return t("Needs") + " " + skOr(b.choice) + ".";
    if (P.k === "l2" && !have(b.late[P.p][0])) return t("Needs a point in") + " " + skOr([b.late[P.p][0]]) + ".";
    if (P.k === "end") {
      var picks = b.end.filter(have).length, nonEnd = skSum(c, b.ids) - picks;
      if (picks > 2) return t("You can take two of the three.");
      if (!b.l2.some(have)) return t("Needs a point in") + " " + skOr(b.l2) + ".";
      if (picks <= 1 && nonEnd < SKD.gate.end[0]) return t("Needs") + " " + SKD.gate.end[0] + " " + t("points in") + " " + t(b.n) + " (" + skSum(c, b.ids) + ").";
      if (picks === 2 && nonEnd + 1 < SKD.gate.end[1]) return t("The second pick needs") + " " + SKD.gate.end[1] + " " + t("points in") + " " + t(b.n) + " (" + (skSum(c, b.ids) - 1) + ").";
    }
    return "";
  }
  function skBroken(c) { for (var id in c) if (c[id] > 0 && skWhy(c, id)) return id; return ""; }
  /* put the points in an order the game allows, keeping yours wherever it already works */
  function skRepair(o, cap) {
    var out = [], c = {}, pend = o.filter(function (id) { return SKD.s[id]; }), go = true; cap = cap || sk.p;
    while (go && pend.length) {
      go = false;
      for (var i = 0; i < pend.length; i++) {
        var id = pend[i]; c[id] = (c[id] || 0) + 1;
        if (!skWhy(c, id) && out.length < cap) { out.push(id); pend.splice(i, 1); go = true; break; }
        c[id]--;
      }
    }
    return out;
  }
  function skAddWhy(id) {
    var c = skCount(sk.o); if ((c[id] || 0) >= SKD.s[id].m) return t("Already maxed.");
    if (sk.o.length >= sk.p) return t("No points left. Raise your points at the top.");
    c[id] = (c[id] || 0) + 1; return skWhy(c, id);
  }
  function skAdd(id) { var w = skAddWhy(id); skSel = SKP[id].k === "ch" || SKP[id].k === "end" ? "" : id; if (w) { skMsg = w; renderSkills(); return; } sk.o.push(id); skMsg = ""; skSave(); renderSkills(); }
  function skRemove(id) {
    skSel = SKP[id].k === "ch" || SKP[id].k === "end" ? "" : id; var i = sk.o.lastIndexOf(id); if (i < 0) { skMsg = ""; renderSkills(); return; }
    var o = sk.o.slice(); o.splice(i, 1);
    var bad = skBroken(skCount(o));
    if (bad) { skMsg = skName(bad) + " " + t("needs this point. Take points out of it first."); renderSkills(); return; }
    sk.o = skRepair(o); skMsg = ""; skSave(); renderSkills();
  }
  function skCode() { return sk.o.map(function (id) { return SKA[SKIDS.indexOf(id)]; }).join(""); }
  function skLink() { return location.origin + location.pathname + "#skills?b=" + skCode() + (sk.p !== SKD.pts.levels ? "&p=" + sk.p : ""); }
  function skRead(full) {
    var m = /[?&]b=([0-9A-Za-z]*)/.exec(full); if (!m || !SKD) return;
    var pm = /[?&]p=(\d+)/.exec(full), o = m[1].split("").map(function (ch) { return SKIDS[SKA.indexOf(ch)]; }).filter(Boolean);
    skPrev = { o: sk.o.slice(), p: sk.p, why: "share" };
    if (pm) sk.p = Math.max(1, Math.min(SKD.pts.max, +pm[1]));
    sk.o = skRepair(o); skSel = ""; skMsg = ""; skSave();
    try { history.replaceState(null, "", location.pathname + location.search + "#skills"); } catch (e) {}
  }
  function skGlyph(g) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (SKG[g] || SKG.bolt) + '"/></svg>'; }
  function skIcon(id) {
    var src = ICONS["sk_" + id];
    return src ? '<img alt="" src="' + src + '" decoding="async" data-skg="' + (SKD.s[id].g || "bolt") + '">' : skGlyph(SKD.s[id].g);
  }
  function skFixImgs(root) {
    Array.prototype.forEach.call(root.querySelectorAll("img[data-skg]"), function (im) {
      function swap() { var w = document.createElement("span"); w.innerHTML = skGlyph(im.dataset.skg); if (im.parentNode) im.parentNode.replaceChild(w.firstChild, im); }
      if (im.complete && !im.naturalWidth) swap(); else im.addEventListener("error", swap);
    });
  }
  /* likes on the recommended builds, kept by the site's relay; your own likes are remembered in this browser */
  var skVotes = null, skMine = store("rt-skvotes") || {}, skVotesAt = 0;
  function skVotesLoad() {
    if (!ARC_PROXY || Date.now() - skVotesAt < 300000) return;
    skVotesAt = Date.now();
    fetch(ARC_PROXY.replace(/\/+$/, "") + "/votes").then(function (r) { return r.json(); }).then(function (d) { if (d && d.votes) { skVotes = d.votes; if ($("#v-skills").classList.contains("on")) renderSkills(); } }).catch(function () {});
  }
  function skVote(id) {
    if (!ARC_PROXY) { toast(t("Likes work on raidkits.com."), true); return; }
    var v = skMine[id] ? -1 : 1;
    if (v > 0) skMine[id] = 1; else delete skMine[id];
    store("rt-skvotes", skMine);
    skVotes = skVotes || {}; skVotes[id] = Math.max(0, (skVotes[id] || 0) + v); renderSkills();
    fetch(ARC_PROXY.replace(/\/+$/, "") + "/vote", { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify({ id: id, v: v }) })
      .then(function (r) { return r.json(); }).then(function (d) { if (d && typeof d.n === "number") { skVotes[id] = d.n; renderSkills(); } }).catch(function () {});
  }
  function skPlan(bd) {
    var left = {}, out = [], stages = [];
    Object.keys(bd.a).forEach(function (k) { left[k] = bd.a[k]; });
    function stage(label, seq, src) {
      seq = seq.filter(function (id) { if (!left[id]) return false; left[id]--; return true; });
      if (!seq.length) return;
      var before = out.length, next = skRepair(out.concat(seq), 999);
      seq.forEach(function (id) { left[id]++; });
      next.slice(before).forEach(function (id) { left[id]--; });
      out = next; if (out.length > before) stages.push({ n: label, from: before + 1, to: out.length, src: !!src });
    }
    function expand(a) { var o = []; SKD.br.forEach(function (b) { [b.start].concat(b.early[0], b.early[1], b.choice, b.late[0], b.late[1], b.late[2], b.end).forEach(function (id) { for (var i = 0; i < (a[id] || 0); i++) o.push(id); }); }); return o; }
    if (bd.stages) bd.stages.forEach(function (st) { stage(st.n, expand(st.a), true); });
    var seed = bd.seed && SKD.builds.filter(function (x) { return x.id === bd.seed; })[0];
    if (seed) stage(t("The guide's starting points"), expand(seed.a), true);
    var byPts = SKD.br.slice().sort(function (x, y) { return skSum(left, y.ids) - skSum(left, x.ids); });
    function per(fn) { var o = []; byPts.forEach(function (b) { fn(b).forEach(function (id) { for (var i = 0; i < (left[id] || 0); i++) o.push(id); }); }); return o; }
    stage(t("Each branch up to its middle choice"), per(function (b) { return [b.start].concat(b.early[0], b.early[1], b.choice); }));
    // late paths take turns across the branches, so no branch waits until the very end; a branch's first end pick follows its last path
    var queues = byPts.map(function (b) {
      var q = b.late.map(function (pth) { var o = []; pth.forEach(function (id) { for (var i = 0; i < (left[id] || 0); i++) o.push(id); }); return o; }).filter(function (o) { return o.length; });
      var e1 = b.end.filter(function (x) { return left[x]; })[0]; if (e1) q.push([e1]);
      return q;
    }), rr = [];
    while (queues.some(function (q) { return q.length; })) queues.forEach(function (q) { if (q.length) rr = rr.concat(q.shift()); });
    stage(t("Late skills and the first end pick"), rr);
    stage(t("Second end picks and the rest"), expand(left));
    return { o: out, stages: stages };
  }
  /* step-by-step view of a build: the tree shows the first k points */
  var skGuide = null, skGuideT = 0;
  function skGuideOpen(bd, own) {
    skGuideStop();
    var plan = own ? { o: sk.o.slice(), stages: [{ n: t("Your order"), from: 1, to: sk.o.length }] } : skPlan(bd);
    skGuide = { n: own ? t("Your build") : bd.n, by: own ? "" : bd.by, url: own ? "" : bd.url, bd: own ? null : bd, o: plan.o, stages: plan.stages, k: own ? sk.o.length : Math.min(1, plan.o.length), own: !!own };
    skPop = ""; skSel = ""; skMsg = ""; renderSkills();
    var r = $("#skRoot"); if (r) window.scrollTo({ top: r.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth" });
  }
  window.addEventListener("hashchange", function () { if (!/^#skills/.test(location.hash)) skGuideStop(); });
  function skGuideStop() { if (skGuideT) { clearInterval(skGuideT); skGuideT = 0; } }
  function skGuideGo(k) {
    if (!skGuide) return;
    skGuide.k = Math.max(0, Math.min(skGuide.o.length, k));
    var id = skGuide.o[skGuide.k - 1]; if (id) sk.br = SKB[id].k;
    renderSkills();
  }
  function skLoadBuild(bd) {
    var total = Object.keys(bd.a).reduce(function (n, k) { return n + bd.a[k]; }, 0);
    skPrev = { o: sk.o.slice(), p: sk.p, why: "build", n: bd.n };
    if (total > sk.p) sk.p = Math.min(SKD.pts.max, total);
    skGuideStop(); skGuide = null;
    sk.o = skRepair(skPlan(bd).o); skSel = ""; skMsg = ""; skPop = ""; skSave(); renderSkills();
    var r = $("#skRoot"); if (r) window.scrollTo({ top: r.getBoundingClientRect().top + window.pageYOffset - 90, behavior: "smooth" });
  }
  function skText() {
    var c = skCount(sk.o), lines = [t("Skill build") + " · " + sk.o.length + " " + t("points")];
    SKD.br.forEach(function (b) {
      var got = b.ids.filter(function (id) { return c[id]; }); if (!got.length) return;
      lines.push(t(b.n) + " " + skSum(c, b.ids) + ": " + got.map(function (id) { return skName(id) + " " + c[id] + "/" + SKD.s[id].m; }).join(", "));
    });
    lines.push(skLink()); return lines.join("\n");
  }
  function skGuideBar(G, c, cur) {
    var st = G.stages.filter(function (x) { return G.k >= x.from && G.k <= x.to; })[0] || G.stages[0], S = cur ? SKD.s[cur] : null, bc = cur ? SKB[cur].c : "#5ff2ea";
    var split = SKD.br.map(function (b) { return '<span style="--bc:' + b.c + '">' + esc(t(b.n)) + " <b>" + skSum(c, b.ids) + "</b></span>"; }).join("");
    return '<div class="skguide panel" style="--bc:' + bc + '"><div class="skgh"><div><small>' + esc(t("Step by step")) + (G.by ? ' · <a href="' + esc(G.url) + '" target="_blank" rel="noopener">' + esc(G.by) + " ↗</a>" : "") + "</small><b>" + esc(G.n) + '</b></div><button type="button" class="mlx" data-skgexit aria-label="' + esc(t("Close")) + '">×</button></div>' +
      '<div class="skgnow">' + (cur ? '<span class="skn s-max' + (SKP[cur].k === "ch" || SKP[cur].k === "end" ? " skd" : "") + '"><span class="ski">' + skIcon(cur) + "</span></span>" : "") + '<div><small>' + (st ? esc(t("Stage")) + " " + (G.stages.indexOf(st) + 1) + "/" + G.stages.length + " · " + esc(st.n) : "") + "</small><b>" + (cur ? esc(t("Point")) + " " + G.k + ": " + esc(skName(cur)) + " → " + (c[cur] || 0) + "/" + S.m : esc(t("Press play or step forward to start."))) + "</b>" + (S ? "<p>" + esc(S.d) + "</p>" : "") + "</div></div>" +
      '<div class="skgctl"><button type="button" class="btn orb sm" data-skgstep="-1" aria-label="' + esc(t("Back")) + '">◀</button><button type="button" class="btn go orb sm" data-skgplay>' + esc(skGuideT ? t("Pause") : t("Play")) + '</button><button type="button" class="btn orb sm" data-skgstep="1" aria-label="' + esc(t("Next")) + '">▶</button>' +
      '<input type="range" id="skgK" min="0" max="' + G.o.length + '" value="' + G.k + '" aria-label="' + esc(t("Point")) + '"><span class="skgk">' + G.k + "/" + G.o.length + "</span></div>" +
      '<div class="skgsplit">' + split + "</div>" +
      (G.own ? "" : '<div class="skgacts"><button type="button" class="btn go orb sm" data-skguse>' + esc(t("Use this build")) + "</button></div>") + "</div>";
  }
  function renderSkills() {
    var root = $("#skRoot"); if (!root) return;
    if (!SKD) { root.innerHTML = '<p class="dim">' + esc(t("The skill tree could not be loaded.")) + "</p>"; return; }
    var G = skGuide, O = G ? G.o.slice(0, G.k) : sk.o, cur = G && G.k ? G.o[G.k - 1] : "";
    var c = skCount(O), left = sk.p - sk.o.length, lvl = typeof arcOn === "function" && arcOn() && arcLvlOk() ? arc.pl : null;
    var h = G ? skGuideBar(G, c, cur) : '<div class="sktop panel"><div class="skpts"><b>' + sk.o.length + '</b><span>/ <input id="skP" type="number" min="1" max="' + SKD.pts.max + '" value="' + sk.p + '" aria-label="' + esc(t("Skill points you have")) + '"> ' + esc(t("points")) + "</span>" +
      '<small>' + esc(left > 0 ? left + " " + t("left to spend") : left === 0 ? t("All points spent") : "") + "</small></div>" +
      '<p class="sknote">' + esc(t("You get one point per level: 76 at level 75, and up to 91 with Expedition bonus points.")) +
      (lvl ? ' <button type="button" class="pplink" data-sklvl="' + (lvl + 1) + '">' + esc(t("Use my level")) + " (" + lvl + " → " + (lvl + 1) + ")</button>" : "") + "</p>" +
      '<div class="skacts">' + (SKD.builds && SKD.builds.length ? '<button type="button" class="btn orb sm" data-skgobuilds>' + esc(t("Recommended builds")) + "</button>" : "") + '<button type="button" class="btn orb sm" data-skundo' + (sk.o.length || skPrev ? "" : " disabled") + ">" + esc(t("Undo")) + '</button><button type="button" class="btn orb sm" data-skreset' + (sk.o.length ? "" : " disabled") + ">" + esc(t("Reset")) + '</button><button type="button" class="btn orb sm" data-sktext' + (sk.o.length ? "" : " disabled") + ">" + esc(t("Copy as text")) + '</button><button type="button" class="btn go orb sm" data-skshare' + (sk.o.length ? "" : " disabled") + ">" + esc(t("Share build")) + "</button></div>" +
      '<div class="skshare" id="skShare" hidden></div></div>';
    if (!G && skPrev && (skPrev.why === "share" || skPrev.why === "build")) h += '<div class="skbanner"><span>' + esc(skPrev.why === "build" ? t("Loaded") + ": " + skPrev.n + ". " + t("It replaced yours in this browser.") : t("You're looking at a shared build. It replaced yours in this browser.")) + '</span><button type="button" class="pplink" data-skback>' + esc(t("Bring mine back")) + "</button></div>";
    h += '<div class="sktabs" role="tablist">' + SKD.br.map(function (b) { return '<button type="button" role="tab" data-skbr="' + b.k + '" aria-selected="' + (sk.br === b.k) + '" style="--bc:' + b.c + '">' + esc(t(b.n)) + " <em>" + skSum(c, b.ids) + "</em></button>"; }).join("") + "</div>";
    h += '<div class="skbrs">' + SKD.br.map(function (b) {
      var pts = skSum(c, b.ids), low = skSum(c, b.low), has = function (x) { return (c[x] || 0) > 0; };
      var ends = O.filter(function (x, i) { return b.end.indexOf(x) > -1 && O.indexOf(x) === i; }), picked = b.choice.filter(has)[0] || "";
      var nonEnd = pts - ends.length, chOk = low >= SKD.gate.choice && b.e2.some(has), lateOk = b.l2.some(has);
      function node(id) {
        var P = SKP[id], n = c[id] || 0, m = SKD.s[id].m, why = G ? "" : n < m ? skAddWhy(id) : "", st = n >= m ? "max" : n ? "on" : G || why ? "lock" : "open";
        var tb = SKD.s[id].d + (SKD.s[id].v ? "\n" + SKD.s[id].v : "") + (why && n < m ? "\n" + t("Locked") + ": " + why : "");
        return '<button type="button" class="skn k-' + P.k + " s-" + st + (skSel === id ? " sel" : "") + (cur === id ? " hl" : "") + '" data-skn="' + id + '" style="left:' + P.x + "%;top:" + P.y + '%" data-tt="' + esc(skName(id)) + '" data-ts="' + esc(n + "/" + m + " · " + t(b.n)) + '" data-tb="' + esc(tb) + '" aria-label="' + esc(skName(id) + ", " + n + "/" + m) + '"><span class="ski">' + skIcon(id) + "</span>" + (m > 1 ? '<span class="skr">' + n + "/" + m + "</span>" : "") + "</button>";
      }
      function diamond(key, x, y, id, open, label, sub) {
        var st = id ? "max" : open && !G ? "open" : "lock";
        return '<button type="button" class="skn skd s-' + st + (skPop === key ? " sel" : "") + (id && cur === id ? " hl" : "") + '" data-skd="' + key + '" style="left:' + x + "%;top:" + y + '%" data-tt="' + esc(id ? skName(id) : label) + '" data-ts="' + esc(sub) + '" data-tb="' + esc(id ? SKD.s[id].d : t("Click to see the options.")) + '" aria-label="' + esc(label + (id ? ": " + skName(id) : "")) + '"><span class="ski">' + (id ? skIcon(id) : skGlyph(key.indexOf("end") === 0 ? "star" : "split")) + "</span></button>";
      }
      var regular = b.ids.filter(function (id) { var k = SKP[id].k; return k !== "ch" && k !== "end"; }).map(node).join("");
      var dCh = diamond("ch:" + b.k, 50, 53, picked, chOk, t("Pick one of two"), t("Needs") + " " + SKD.gate.choice + " " + t("points in") + " " + t(b.n));
      var dE1 = diamond("end0:" + b.k, 32, 10, ends[0] || "", lateOk && nonEnd >= SKD.gate.end[0], t("End skill") + " 1", t("Needs") + " " + SKD.gate.end[0] + " " + t("points in") + " " + t(b.n));
      var dE2 = diamond("end1:" + b.k, 68, 10, ends[1] || "", lateOk && !!ends[0] && nonEnd + 1 >= SKD.gate.end[1], t("End skill") + " 2", t("Needs") + " " + SKD.gate.end[1] + " " + t("points in") + " " + t(b.n));
      function L(a, z, on) { return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + z[0] + '" y2="' + z[1] + '" class="' + (on ? "on" : "") + '" vector-effect="non-scaling-stroke"/>'; }
      function at(id) { return [SKP[id].x, SKP[id].y]; }
      var CH = [50, 53], E1 = [32, 10], E2 = [68, 10], ln = "";
      b.early.forEach(function (p) { ln += L(at(b.start), at(p[0]), has(p[0])) + L(at(p[0]), at(p[1]), has(p[1])) + L(at(p[1]), CH, has(p[1]) && !!picked); });
      b.late.forEach(function (p, i) { ln += L(CH, at(p[0]), has(p[0])) + L(at(p[0]), at(p[1]), has(p[1])); if (i !== 2) ln += L(at(p[1]), E1, has(p[1]) && !!ends[0]); if (i !== 0) ln += L(at(p[1]), E2, has(p[1]) && !!ends[1]); });
      var gates = '<span class="skg' + (low >= SKD.gate.choice ? " ok" : "") + '" style="left:50%;top:61.5%">' + SKD.gate.choice + '</span>' +
        '<span class="skg' + (nonEnd >= SKD.gate.end[0] ? " ok" : "") + '" style="left:32%;top:18.5%">' + SKD.gate.end[0] + '</span><span class="skg' + (nonEnd + Math.min(1, ends.length) >= SKD.gate.end[1] ? " ok" : "") + '" style="left:68%;top:18.5%">' + SKD.gate.end[1] + "</span>";
      var marks = [SKD.gate.choice].concat(SKD.gate.end).map(function (g) { return '<i style="left:' + (g / b.fill * 100) + '%"' + (pts >= g ? ' class="ok"' : "") + "></i>"; }).join("");
      // the panel a diamond opens, like the game's: the options, what they do and what they need
      var pop = "";
      if (skPop && skPop.split(":")[1] === b.k) {
        var isCh = skPop.indexOf("ch") === 0, opts = isCh ? b.choice : b.end;
        var head = isCh ? t("Pick one of two") + " · " + t("needs") + " " + SKD.gate.choice + " " + t("points in") + " " + t(b.n) + " (" + low + ")"
          : t("Pick two of three") + " · " + t("the first at") + " " + SKD.gate.end[0] + ", " + t("the second at") + " " + SKD.gate.end[1] + " (" + pts + ")";
        pop = '<div class="skpop" style="top:' + (isCh ? 60 : 17) + '%" role="dialog" aria-label="' + esc(head) + '"><div class="skph"><b>' + esc(head) + '</b><button type="button" class="mlx" data-skpopx aria-label="' + esc(t("Close")) + '">×</button></div>' + opts.map(function (id) {
          var n = c[id] || 0, why = n ? "" : skAddWhy(id);
          return '<div class="skpo' + (n ? " on" : why ? " lock" : "") + '"><span class="skn k-end s-' + (n ? "max" : why ? "lock" : "open") + '"><span class="ski">' + skIcon(id) + '</span></span><div><b>' + esc(skName(id)) + "</b><p>" + esc(SKD.s[id].d) + "</p>" + (SKD.s[id].v ? '<p class="dim">' + esc(SKD.s[id].v) + "</p>" : "") + (why ? '<p class="skwarn">' + esc(why) + "</p>" : "") + "</div>" +
            (n ? '<button type="button" class="btn orb sm" data-skminus="' + id + '">' + esc(t("Remove")) + "</button>" : '<button type="button" class="btn go orb sm" data-skplus="' + id + '"' + (why ? " disabled" : "") + ">" + esc(t("Pick")) + "</button>") + "</div>";
        }).join("") + "</div>";
      }
      return '<section class="skbr' + (sk.br === b.k ? " cur" : "") + '" data-br="' + b.k + '" style="--bc:' + b.c + '"><header><h3>' + esc(t(b.n)) + "</h3><b>" + pts + '<small>/' + b.fill + "</small></b></header>" +
        '<div class="skbar"><span style="width:' + Math.min(100, pts / b.fill * 100) + '%"></span>' + marks + "</div>" +
        '<div class="sktree"><svg class="sklines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + ln + "</svg>" + gates + regular + dCh + dE1 + dE2 + pop + "</div></section>";
    }).join("") + "</div>";
    // the skill you clicked last, with − and +
    if (G) h += "";
    else if (skSel && SKD.s[skSel]) {
      var S = SKD.s[skSel], n = c[skSel] || 0, b2 = SKB[skSel], why2 = n < S.m ? skAddWhy(skSel) : "";
      h += '<div class="skinfo panel" style="--bc:' + b2.c + '"><span class="skn k-' + SKP[skSel].k + ' s-' + (n >= S.m ? "max" : n ? "on" : "open") + '"><span class="ski">' + skIcon(skSel) + "</span></span><div><b>" + esc(skName(skSel)) + '</b><small>' + esc(t(b2.n)) + " · " + n + "/" + S.m + "</small><p>" + esc(S.d) + "</p>" + (S.v ? '<p class="dim">' + esc(S.v) + "</p>" : "") +
        (skMsg ? '<p class="skwarn">' + esc(skMsg) + "</p>" : why2 && n < S.m ? '<p class="skwarn">' + esc(why2) + "</p>" : "") + "</div>" +
        '<span class="dwq"><button type="button" data-skminus="' + skSel + '" aria-label="−1"' + (n ? "" : " disabled") + '>−</button><b>' + n + "/" + S.m + '</b><button type="button" data-skplus="' + skSel + '" aria-label="+1"' + (why2 || n >= S.m ? " disabled" : "") + ">+</button></span></div>";
    } else h += '<p class="skhint dim">' + esc(t("Click a skill to add a point. Right-click it, or use − below the tree, to take one back.")) + "</p>";
    if (!G && SKD.builds && SKD.builds.length) {
      skVotesLoad();
      var vt = function (bd) { return (skVotes && skVotes[bd.id]) || 0; }, top = 0;
      SKD.builds.forEach(function (bd) { top = Math.max(top, vt(bd)); });
      var list = SKD.builds.map(function (bd, i) { return { bd: bd, i: i }; }).sort(function (x, y) { return vt(y.bd) - vt(x.bd) || x.i - y.i; });
      h += '<details class="skbuilds panel"' + (skBuildsOpen ? " open" : "") + '><summary>' + esc(t("Recommended builds")) + " <em>" + SKD.builds.length + " · " + esc(t("from 2.x guides")) + '</em></summary><div class="skbl">' + list.map(function (x) {
        var bd = x.bd, i = x.i, n = vt(bd), isTop = top > 0 && n === top, mine = !!skMine[bd.id];
        var tot = 0, split = SKD.br.map(function (b) { var n2 = b.ids.reduce(function (m, id) { return m + (bd.a[id] || 0); }, 0); tot += n2; return { b: b, n: n2 }; });
        var picks = SKD.br.map(function (b) { return b.choice.concat(b.end).filter(function (id) { return bd.a[id]; }); }).reduce(function (x2, y2) { return x2.concat(y2); }, []);
        return '<article class="skbd' + (isTop ? " top" : "") + '"><header><div><b>' + esc(bd.n) + "</b>" + (isTop ? '<span class="sktop1">★ ' + esc(t("Most liked")) + "</span>" : "") + '<small>' + tot + " " + esc(t("points")) + '</small></div><button type="button" class="skvote' + (mine ? " on" : "") + '" data-skvote="' + esc(bd.id) + '" aria-pressed="' + mine + '" aria-label="' + esc(t(mine ? "Remove your like" : "Like this build")) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg><b>' + (skVotes ? n : "") + "</b></button></header>" +
          '<div class="skbsp">' + split.map(function (y) { return y.n ? '<span style="flex:' + y.n + ";--bc:" + y.b.c + '" title="' + esc(t(y.b.n)) + '">' + y.n + "</span>" : ""; }).join("") + "</div>" +
          '<p>' + esc(bd.note) + '</p><div class="skbic">' + picks.map(function (id) { return '<span class="ski" title="' + esc(skName(id)) + '" style="--bc:' + SKB[id].c + '">' + skIcon(id) + "</span>"; }).join("") + "</div>" +
          '<footer><div class="skbmeta"><span class="skbt">' + bd.tags.map(function (y) { return "<i>" + esc(t(y)) + "</i>"; }).join("") + '</span><a href="' + esc(bd.url) + '" target="_blank" rel="noopener">' + esc(bd.by) + ' ↗</a></div><div class="skbbtn"><button type="button" class="btn orb sm" data-skbuild="' + i + '">' + esc(t("Load")) + '</button><button type="button" class="btn go orb sm" data-skstep="' + i + '">' + esc(t("Step by step")) + "</button></div></footer></article>";
      }).join("") + '</div><p class="dim">' + esc(t("Loaded builds use an order the game allows, not necessarily the author's. Your own build comes back with Bring mine back.")) + "</p></details>";
    }
    // pick order: the order the points are spent, runs of the same skill grouped, split into stages when stepping
    if (O.length || G) {
      var L = G ? G.o : sk.o, runs = [], cc = {};
      L.forEach(function (id, i) { cc[id] = (cc[id] || 0) + 1; var r = runs[runs.length - 1]; if (r && r.id === id) { r.to = i + 1; r.n = cc[id]; } else runs.push({ id: id, from: i + 1, to: i + 1, n: cc[id] }); });
      var stg = G ? G.stages : [], li = function (r) {
        var on = G && G.k >= r.from && G.k <= r.to, done = G && G.k > r.to, todo = G && G.k < r.from;
        return '<li style="--bc:' + SKB[r.id].c + '" class="' + (on ? "now" : done ? "done" : todo ? "todo" : "") + '"' + (G ? ' data-skgto="' + r.to + '" tabindex="0"' : "") + '><span class="skon">' + (r.from === r.to ? r.from : r.from + "–" + r.to) + '</span><span class="ski' + (SKP[r.id].k === "ch" || SKP[r.id].k === "end" ? " dia" : "") + '">' + skIcon(r.id) + "</span><b>" + esc(skName(r.id)) + "</b><small>" + r.n + "/" + SKD.s[r.id].m + "</small></li>";
      };
      var body = stg.length > 1 ? stg.map(function (st, i) { return '<h5><span>' + (i + 1) + "</span>" + esc(st.n) + " <em>" + st.from + "–" + st.to + (st.src ? " · " + esc(t("from the guide")) : "") + "</em></h5><ol>" + runs.filter(function (r) { return r.from >= st.from && r.from <= st.to; }).map(li).join("") + "</ol>"; }).join("") : "<ol>" + runs.map(li).join("") + "</ol>";
      h += '<details class="skord panel" open><summary>' + esc(t(G ? "Step by step" : "Pick order")) + " <em>" + L.length + " " + esc(t("points")) + "</em>" + (!G && sk.o.length ? '<button type="button" class="pplink skordgo" data-skstepown>' + esc(t("Step through")) + "</button>" : "") + "</summary>" + body +
        "<p class=\"dim\">" + esc(G && !G.own ? t("The order follows the guide where it gives one; the rest is a suggested order the game allows.") : t("Point 1 is your first skill point. Spend them in this order as you level up.")) + "</p></details>";
    }
    root.innerHTML = h;
    skFixImgs(root);
    // keep an open panel on screen: the outer columns would push it past the edge
    var pop = root.querySelector(".skpop");
    if (pop) { var r = pop.getBoundingClientRect(), dx = 0, W = document.documentElement.clientWidth; if (r.right > W - 12) dx = W - 12 - r.right; if (r.left + dx < 12) dx = 12 - r.left; if (dx) pop.style.transform = "translateX(calc(-50% + " + Math.round(dx) + "px))"; }
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest("#skRoot")) return;
    var vb = e.target.closest("[data-skvote]"); if (vb) { skVote(vb.dataset.skvote); return; }
    var sp = e.target.closest("[data-skstep]"); if (sp) { var b0 = SKD.builds[+sp.dataset.skstep]; if (b0) skGuideOpen(b0); return; }
    if (e.target.closest("[data-skstepown]")) { e.preventDefault(); skGuideOpen(null, true); return; }
    if (skGuide) {
      if (e.target.closest("[data-skgexit]")) { skGuideStop(); skGuide = null; renderSkills(); return; }
      var gs = e.target.closest("[data-skgstep]"); if (gs) { skGuideStop(); skGuideGo(skGuide.k + +gs.dataset.skgstep); return; }
      var gt = e.target.closest("[data-skgto]"); if (gt) { skGuideStop(); skGuideGo(+gt.dataset.skgto); return; }
      if (e.target.closest("[data-skgplay]")) {
        if (skGuideT) { skGuideStop(); renderSkills(); return; }
        if (skGuide.k >= skGuide.o.length) skGuide.k = 0;
        skGuideT = setInterval(function () { if (!skGuide || skGuide.k >= skGuide.o.length || !document.getElementById("skRoot") || !$("#v-skills").classList.contains("on")) { skGuideStop(); renderSkills(); return; } skGuideGo(skGuide.k + 1); }, 650);
        skGuideGo(skGuide.k + 1); return;
      }
      if (e.target.closest("[data-skguse]")) { var gb = skGuide.bd; skGuideStop(); skGuide = null; if (gb) skLoadBuild(gb); return; }
      if (e.target.closest("[data-skn],[data-skd]")) return;   // nothing to edit while stepping
    }
    var dd = e.target.closest("[data-skd]"); if (dd) { hideTT(); skPop = skPop === dd.dataset.skd ? "" : dd.dataset.skd; skSel = ""; skMsg = ""; renderSkills(); return; }
    if (e.target.closest("[data-skpopx]")) { skPop = ""; renderSkills(); return; }
    if (e.target.closest("[data-skgobuilds]")) { skBuildsOpen = true; var bx = $(".skbuilds"); if (bx) { bx.open = true; window.scrollTo({ top: bx.getBoundingClientRect().top + window.pageYOffset - 90, behavior: "smooth" }); } return; }
    var bl = e.target.closest("[data-skbuild]"); if (bl) { var bd = SKD.builds[+bl.dataset.skbuild]; if (bd) skLoadBuild(bd); return; }
    var n = e.target.closest("[data-skn]"); if (n && !n.closest(".skpo")) { hideTT(); skPop = ""; if (e.shiftKey) skRemove(n.dataset.skn); else skAdd(n.dataset.skn); return; }
    var p = e.target.closest("[data-skplus]"); if (p) { skAdd(p.dataset.skplus); return; }
    var m = e.target.closest("[data-skminus]"); if (m) { skRemove(m.dataset.skminus); return; }
    var tb = e.target.closest("[data-skbr]"); if (tb) { sk.br = tb.dataset.skbr; skSave(); renderSkills(); return; }
    if (e.target.closest("[data-skundo]")) {
      if (sk.o.length) { skSel = sk.o[sk.o.length - 1]; skRemove(skSel); }
      else if (skPrev) { sk.o = skPrev.o; sk.p = skPrev.p; skPrev = null; skSave(); renderSkills(); }
      return;
    }
    if (e.target.closest("[data-skreset]")) { skPrev = { o: sk.o.slice(), p: sk.p, why: "reset" }; sk.o = []; skSel = ""; skMsg = ""; skSave(); renderSkills(); toast(t("Skill tree reset. Press Undo to bring it back."), true); return; }
    if (e.target.closest("[data-skback]")) { if (skPrev) { sk.o = skPrev.o; sk.p = skPrev.p; skPrev = null; skSave(); renderSkills(); } return; }
    var lv = e.target.closest("[data-sklvl]"); if (lv) { sk.p = Math.min(SKD.pts.max, +lv.dataset.sklvl); sk.o = skRepair(sk.o); skSave(); renderSkills(); return; }
    if (e.target.closest("[data-sktext]")) { var txt = skText(); if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast(t("Build copied as text."), true); }, function () {}); return; }
    if (e.target.closest("[data-skshare]")) {
      var url = skLink(), box = $("#skShare");
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast(t("Link copied."), true); }, function () {});
      if (box) { box.hidden = false; box.innerHTML = '<b>' + esc(t("Share link")) + '</b><input type="text" readonly value="' + esc(url) + '" aria-label="' + esc(t("Share link")) + '">'; var inp = box.querySelector("input"); if (inp) inp.select(); }
      return;
    }
  });
  document.addEventListener("contextmenu", function (e) {
    if (skGuide && e.target.closest && e.target.closest("#skRoot .sktree")) { e.preventDefault(); return; }
    var n = e.target.closest && e.target.closest("#skRoot [data-skn]"); if (n) { e.preventDefault(); hideTT(); skRemove(n.dataset.skn); return; }
    var d = e.target.closest && e.target.closest("#skRoot [data-skd]"); if (!d) return;
    e.preventDefault(); hideTT();
    var parts = d.dataset.skd.split(":"), b = SKD.br.filter(function (x) { return x.k === parts[1]; })[0]; if (!b) return;
    var c = skCount(sk.o), ends = sk.o.filter(function (x, i) { return b.end.indexOf(x) > -1 && sk.o.indexOf(x) === i; });
    var id = parts[0] === "ch" ? b.choice.filter(function (x) { return c[x]; })[0] : ends[parts[0] === "end0" ? 0 : 1];
    if (id) skRemove(id);
  });
  document.addEventListener("toggle", function (e) { if (e.target && e.target.classList && e.target.classList.contains("skbuilds")) skBuildsOpen = e.target.open; }, true);
  document.addEventListener("input", function (e) { if (skGuide && e.target && e.target.id === "skgK") { skGuideStop(); skGuideGo(+e.target.value); var k = $("#skgK"); if (k) k.focus(); } });
  document.addEventListener("keydown", function (e) {
    if (!skGuide || !$("#v-skills").classList.contains("on") || /input|textarea|select/i.test((e.target && e.target.tagName) || "") && e.target.id !== "skgK") return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); skGuideStop(); skGuideGo(skGuide.k + (e.key === "ArrowRight" ? 1 : -1)); var k = $("#skgK"); if (k && e.target.id === "skgK") k.focus(); }
    if (e.key === "Escape") { skGuideStop(); skGuide = null; renderSkills(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "skP") { sk.p = Math.max(1, Math.min(SKD.pts.max, parseInt(e.target.value, 10) || SKD.pts.levels)); sk.o = skRepair(sk.o); skSave(); renderSkills(); }
  });
