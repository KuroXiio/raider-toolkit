  /* ---------- Workshop ---------- */
  var ws = store("rt-ws4") || (function () { var o = store("rt-ws3") || {}; return { cur: o.cur, have: o.have, collapsed: o.collapsed }; })();
  if (!ws.cur) ws.cur = {}; if (!ws.goal) ws.goal = {}; if (!ws.have) ws.have = {};
  STATIONS.forEach(function (s) {
    if (ws.cur[s.id] == null) ws.cur[s.id] = 0;
    if (ws.goal[s.id] == null) ws.goal[s.id] = s.id === "scrappy" ? 0 : s.max;
  });
  function saveWs() { store("rt-ws4", ws); }
  function sname(s) { return s.n; }

  function seg(sid, kind, max, val) {
    var out = "";
    for (var n = 0; n <= max; n++) out += '<button type="button" class="orb" data-k="' + kind + '" data-s="' + sid + '" data-n="' + n + '" aria-pressed="' + (val === n) + '" aria-label="' + esc(kind === "cur" ? "Current level " : "Goal level ") + n + '">' + n + "</button>";
    return '<div class="seg" role="group">' + out + "</div>";
  }
  function wsF() { if (!ws.f) ws.f = { st: {} }; if (!ws.f.st) ws.f.st = {}; return ws.f; }
  function wsIn(s) { var f = wsF(); return f.mode === "max" || !!f.st[s.id]; }
  function wsGoal(s) {
    var f = wsF(), c = ws.cur[s.id];
    if (!f.mode) return c;
    if (f.mode === "max") return s.max;
    return f.st[s.id] ? Math.max(ws.goal[s.id], c) : c;
  }
  function wsReady() { var f = wsF(); return !!(f.mode && (f.mode === "max" || f.p) && f.l && !f.edit); }
  function renderTop() {
    var el = $("#wsTop"), f = wsF(), h = "", n = 2;
    function out(html) { el.innerHTML = '<div class="panel wsflow">' + html + '</div><div class="arcbar" data-arcbar hidden></div>'; renderArc(); }
    if (!f.mode || f.edit === "m") {
      out(h + stepOpen(1, "What do you want to plan?", '<div class="wch"><button type="button" class="wopt' + (f.mode === "max" ? " on" : "") + '" data-wsm="max"><b>Everything to max</b><small>Every station up to its highest level</small></button><button type="button" class="wopt' + (f.mode === "pick" ? " on" : "") + '" data-wsm="pick"><b>Choose stations</b><small>Only the stations and levels you pick</small></button></div>'));
      renderList(); return;
    }
    h += stepDone("What to plan", f.mode === "max" ? "Everything to max level" : "Chosen stations", "m");
    if (f.mode === "pick") {
      var picked = STATIONS.filter(function (s) { return f.st[s.id]; });
      if (!f.p || f.edit === "p") {
        out(h + stepOpen(2, "Which stations?", '<div class="wch">' + STATIONS.map(function (s) { return '<button type="button" class="wopt' + (f.st[s.id] ? " on" : "") + '" data-wst="' + s.id + '" aria-pressed="' + !!f.st[s.id] + '"><b>' + esc(sname(s)) + "</b><small>" + (f.st[s.id] ? "Selected" : "Max level " + s.max) + "</small></button>"; }).join("") +
          '</div><div class="wsnext"><button type="button" class="btn go orb sm" data-wsnext="p"' + (picked.length ? "" : " disabled") + ">Next</button><span>" + picked.length + " selected</span></div>"));
        renderList(); return;
      }
      h += stepDone("Stations", picked.map(function (s) { return esc(sname(s)); }).join(", "), "p");
      n = 3;
    }
    var rows = STATIONS.filter(wsIn);
    if (!f.l || f.edit === "l") {
      out(h + stepOpen(n, f.mode === "max" ? "Where are your stations now?" : "Set your levels", '<p class="wshint">' + (f.mode === "max" ? "Pick the level each station is at now. Level 0 means it is not built yet. Everything from there up to max goes on your list." : "Pick where each station is now and the level you want. Everything in between goes on your list.") + "</p>" +
        '<div class="srow srow-h"><span class="l">Station</span><span class="l">Level now</span><span class="l">' + (f.mode === "pick" ? "Level you want" : "Goal") + "</span></div>" +
        rows.map(function (s) {
          return '<div class="srow"><div class="nm">' + esc(sname(s)) + '</div><div class="grp"><span class="l mlab">Now</span>' + seg(s.id, "cur", s.max, ws.cur[s.id]) + '</div><div class="grp"><span class="l mlab">Goal</span>' + (f.mode === "pick" ? seg(s.id, "goal", s.max, wsGoal(s)) : '<span class="wsmax">Level ' + s.max + " (max)</span>") + "</div></div>";
        }).join("") +
        (arcOn() && arc.lv ? '<p class="wshint"><span class="arctag" style="margin:0">Levels synced from ARCTracker</span> Change them if you like.</p>' : "") + '<div class="wsnext"><button type="button" class="btn go orb" data-wsnext="l">Show materials</button><button type="button" class="btn orb sm" id="rstLv">Start over</button></div>'));
      renderList(); return;
    }
    var chips = rows.map(function (s) { var c = ws.cur[s.id], g = wsGoal(s); return g > c ? '<button type="button" class="mchip" data-jump="' + s.id + '" title="Jump to ' + esc(sname(s)) + '">' + esc(sname(s)) + " <b>" + c + " → " + g + "</b></button>" : '<span class="mchip off">' + esc(sname(s)) + " <b>" + c + " · done</b></span>"; }).join("");
    out(h + stepDone("Levels" + (arcOn() && arc.lv ? '<span class="arctag">synced from ARCTracker</span>' : ""), '<span class="wschips">' + chips + "</span>", "l"));
    renderList();
  }
  function outpostWarn() {
    var out = [];
    STATIONS.forEach(function (s) {
      if (!s.req) return;
      var c = ws.cur[s.id], g = wsGoal(s);
      for (var l = c; l < g; l++) {
        var m = s.req[l] && /Outpost level (\d)/.exec(s.req[l]);
        if (!m) continue;
        var need = +m[1], oc = ws.cur.outpost, og = wsGoal(STATIONS.filter(function (x) { return x.id === "outpost"; })[0] || { id: "outpost", max: oc });
        if (og < need) out.push(s.n + " level " + (l + 1) + " needs Outpost level " + need + ", but your Outpost goal is level " + og + ".");
      }
    });
    return out;
  }
  function compute() {
    var need = {}, use = {}, groups = [];
    STATIONS.forEach(function (s) {
      var c = ws.cur[s.id], g = wsGoal(s);
      var tiers = [];
      for (var l = c; l < g; l++) {
        var mats = s.lv[l];
        if (!mats.length) continue;
        tiers.push({ level: l + 1, mats: mats });
        mats.forEach(function (m) { need[m.i] = (need[m.i] || 0) + m.q; (use[m.i] = use[m.i] || []).push(s.n.replace(" Station", "") + " L" + (l + 1) + " ×" + m.q); });
      }
      if (g > c) groups.push({ s: s, c: c, g: g, tiers: tiers });
    });
    return { need: need, use: use, groups: groups };
  }
  function renderList() {
    if (!wsReady()) { $("#wsList").innerHTML = ""; return; }
    var d = compute(), need = d.need;
    var left = d.groups.map(function (gp) {
      var s = gp.s;
      var rows = gp.tiers.map(function (t) {
        var shown = t.mats.filter(function (m) { return !ws.hide || (ws.have[m.i] || 0) < need[m.i]; });
        if (!shown.length) return '<div class="tier-h">Level ' + t.level + '</div><div class="covered">✓ Your stash covers this level</div>';
        return '<div class="tier-h">Level ' + t.level + (s.req && s.req[t.level - 1] ? ' <span class="chipst">Requires ' + esc(s.req[t.level - 1]) + "</span>" : "") + "</div>" + shown.map(function (m) {
          var it = IDX[m.i], have = ws.have[m.i] || 0, ok = have >= need[m.i];
          return '<div class="mrow" style="--rc:' + rcol(it && it.r) + '">' + thumb(m.i) + '<div><button type="button" class="nm" data-find="' + esc(nm(m.i)) + '">' + esc(nm(m.i)) + "</button><small>" + esc((it && it.f) || (it && it.t) || "") + "</small></div>" +
            '<div class="q">×' + m.q + '</div><span class="st-pill' + (ok ? " ok" : "") + '">' + (ok ? "Stash covers it" : "Stash " + have + "/" + need[m.i]) + "</span></div>";
        }).join("");
      }).join("");
      var unl = "";
      for (var l = gp.c; l < gp.g; l++) if (s.un[l] && s.un[l].length) unl += "<p><b>Level " + (l + 1) + ":</b> " + esc(s.un[l].join(", ")) + "</p>";
      return '<section class="panel grp-p" id="g-' + s.id + '"><div class="grp-h"><h3>' + esc(s.n) + '</h3><span class="rng">LEVEL ' + (gp.c) + " → " + gp.g + "</span></div>" + (rows || '<div class="tier-h">No materials needed for these levels.</div>') +
        (unl ? '<details class="unl-d"><summary>Items you can craft or buy after this upgrade</summary>' + unl + "</details>" : "") + "</section>";
    }).join("");
    var warns = outpostWarn();
    if (warns.length) left = '<div class="panel note-p">' + warns.map(esc).join("<br>") + "</div>" + left;
    var names = Object.keys(need).sort(function (a, b) { return need[b] - need[a] || nm(a).localeCompare(nm(b)); });
    var tot = 0, miss = 0;
    names.forEach(function (k) { tot += need[k]; miss += Math.max(0, need[k] - (ws.have[k] || 0)); });
    var right = '<aside class="panel full"><div class="full-h"><h3>Full list</h3><span class="l" id="fsum"></span><div class="fact"><label class="chk"><input type="checkbox" id="hideDone"' + (ws.hide ? " checked" : "") + '>Hide what my stash covers</label><button type="button" class="addl" id="addWs">+ Add to shopping list</button><button type="button" class="btn orb sm" id="copyList">Copy as text</button></div></div><div id="copyBox"></div><div class="fhead"><span></span><span>Material</span><span>In stash</span><span>Missing</span></div><div class="full-b">' +
      (names.length ? names.filter(function (k) { return !ws.hide || (ws.have[k] || 0) < need[k]; }).map(function (k) {
        var have = ws.have[k] || 0, m = Math.max(0, need[k] - have);
        return '<div class="frow" data-id="' + esc(k) + '" style="--rc:' + rcol(IDX[k] && IDX[k].r) + '">' + thumb(k) + '<div class="nm">' + esc(nm(k)) + "<span>×" + need[k] + "</span><small>" + esc(d.use[k].join(" · ")) + '</small></div><input type="number" min="0" inputmode="numeric" value="' + have + '" data-have="' + esc(k) + '" aria-label="' + esc(nm(k)) + ' in stash"><div class="m ' + (m ? "pos" : "zero") + '">' + (m ? m : "✓") + "</div></div>";
      }).join("") : '<div class="frow"><span></span><div class="dim">Nothing to collect. Every goal is already reached.</div></div>') + "</div></aside>";
    $("#wsList").innerHTML = '<div class="groups">' + (left || '<div class="panel" style="padding:28px;color:var(--dim)">No upgrades planned. Change your levels to set a goal above where a station is now.</div>') + "</div>" + right;
    renderMath();
    updateSummary();
  }
  function renderMath() {
    var rows = "";
    STATIONS.forEach(function (s) {
      var run = {};
      s.lv.forEach(function (mats, i) {
        var line = mats.map(function (m) { run[m.i] = (run[m.i] || 0) + m.q; return m.q + " " + nm(m.i); }).join(", ");
        var cum = Object.keys(run).sort().map(function (k) { return run[k] + " " + nm(k); }).join(", ");
        var sum = 0; Object.keys(run).forEach(function (k) { sum += run[k]; });
        rows += "<tr><td class=\"n\">" + esc(s.n) + " " + (i + 1) + "</td><td>" + (line ? esc(line) : "No cost (starting level)") + "</td><td>" + (cum ? esc(cum) + " <span class=\"dim\">(" + sum + " items)</span>" : "-") + "</td></tr>";
      });
    });
    $("#mathBody").innerHTML = "<p>Planning to level N adds up every tier from your current level +1 to N, so the table shows each tier on its own and the running total from level 1. Levels 1 to 3 of the six Workshop benches match the game data set and two independent guides. A one-off extra medkit on Refiner 3 appears only in a launch-week list, so it is not counted. Gunsmith IV, Outpost and Research Station costs agree across the October 2026 guides used.</p><table><thead><tr><th>Tier</th><th>This tier</th><th>Running total</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }
  function updateSummary() {
    var need = compute().need, tot = 0, miss = 0, n = 0;
    Object.keys(need).forEach(function (k) { n++; tot += need[k]; miss += Math.max(0, need[k] - (ws.have[k] || 0)); });
    var el = $("#fsum"); if (el) el.textContent = n + " materials · " + fmt(tot) + " items · " + fmt(miss) + " still to collect";
  }
  $("#wsTop").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.jump) { var gEl = document.getElementById("g-" + b.dataset.jump); if (gEl) gEl.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    var f = wsF();
    if (b.dataset.wstep) { f.edit = b.dataset.wstep; saveWs(); renderTop(); return; }
    if (b.dataset.wsm) { f.mode = b.dataset.wsm; f.edit = null; saveWs(); renderTop(); return; }
    if (b.dataset.wst) { f.st[b.dataset.wst] = !f.st[b.dataset.wst]; saveWs(); renderTop(); return; }
    if (b.dataset.wsnext) {
      f[b.dataset.wsnext] = 1; f.edit = null; saveWs(); renderTop();
      if (b.dataset.wsnext === "l") wScrollTo($("#wsList"));
      return;
    }
    if (b.dataset.k) {
      var sid = b.dataset.s, n = +b.dataset.n;
      if (b.dataset.k === "cur") { ws.cur[sid] = n; if (ws.goal[sid] < n) ws.goal[sid] = n; } else { ws.goal[sid] = Math.max(n, ws.cur[sid]); }
      saveWs(); renderTop(); return;
    }
    if (b.id === "doneLv") { ws.collapsed = true; saveWs(); renderTop(); }
    else if (b.id === "editLv") { ws.collapsed = false; saveWs(); renderTop(); }
    else if (b.id === "maxLv") { STATIONS.forEach(function (s) { ws.goal[s.id] = s.max; }); saveWs(); renderTop(); renderList(); }
    else if (b.id === "rstLv") { STATIONS.forEach(function (s) { ws.cur[s.id] = 0; ws.goal[s.id] = s.max; }); ws.f = { st: {} }; saveWs(); renderTop(); }
  });
  function shoppingText() {
    var need = compute().need, lines = [];
    Object.keys(need).sort(function (a, b) { return need[b] - need[a] || nm(a).localeCompare(nm(b)); }).forEach(function (k) {
      var m = need[k] - (ws.have[k] || 0); if (m > 0) lines.push("- " + m + "x " + nm(k));
    });
    var plan = STATIONS.filter(function (s) { return wsGoal(s) > ws.cur[s.id]; }).map(function (s) { return s.n + " " + ws.cur[s.id] + "->" + wsGoal(s); });
    return "ARC Raiders shopping list (Raider Toolkit)\n" + (plan.length ? "Plan: " + plan.join(", ") + "\n" : "") + (lines.length ? lines.join("\n") : "Nothing left to collect.");
  }
  function copyText(txt, btn) {
    function done() { var o = btn.textContent; btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = o; }, 1800); }
    function manual() {
      var box = $("#copyBox"); box.innerHTML = '<div class="copybox"><p class="dim" style="margin:0 0 6px;font-size:.82rem">Copying is blocked here. Select the text below and copy it.</p><textarea readonly></textarea></div>';
      var ta = box.querySelector("textarea"); ta.value = txt; ta.focus(); ta.select();
    }
    function legacy() {
      try { var ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); var ok = document.execCommand("copy"); document.body.removeChild(ta); if (ok) done(); else manual(); } catch (e) { manual(); }
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, legacy); else legacy(); } catch (e) { legacy(); }
  }
  $("#wsList").addEventListener("click", function (e) {
    var b = e.target.closest("#copyList"); if (b) copyText(shoppingText(), b);
    if (e.target.closest("#addWs")) {
      var need = compute().need, items = {};
      Object.keys(need).forEach(function (k) { var m = need[k] - (ws.have[k] || 0); if (m > 0) items[k] = m; });
      var plan = STATIONS.filter(function (s) { return wsGoal(s) > ws.cur[s.id]; }).length;
      shopSet("ws", "Workshop plan (" + plan + " station" + (plan === 1 ? "" : "s") + ", stash taken off)", items);
    }
  });
  $("#wsList").addEventListener("change", function (e) {
    if (e.target.id === "hideDone") { ws.hide = e.target.checked; saveWs(); renderList(); return; }
    if (ws.hide && e.target.closest("input[data-have]")) renderList();
  });
  $("#wsList").addEventListener("input", function (e) {
    var inp = e.target.closest("input[data-have]"); if (!inp) return;
    var id = inp.dataset.have, v = Math.max(0, parseInt(inp.value, 10) || 0);
    ws.have[id] = v; saveWs();
    var need = compute().need[id] || 0, m = Math.max(0, need - v), cell = inp.closest(".frow").querySelector(".m");
    cell.textContent = m ? m : "✓"; cell.className = "m " + (m ? "pos" : "zero");
    updateSummary();
    // update stash status pills on the left without touching inputs
    Array.prototype.forEach.call(document.querySelectorAll(".mrow"), function (row) {
      var btn = row.querySelector(".nm"); if (!btn) return;
      var key = null; Object.keys(compute().need).forEach(function (k) { if (nm(k) === btn.dataset.find) key = k; });
      if (!key) return;
      var n2 = compute().need[key], h2 = ws.have[key] || 0, pill = row.querySelector(".st-pill");
      pill.className = "st-pill" + (h2 >= n2 ? " ok" : ""); pill.textContent = h2 >= n2 ? "Stash covers it" : "Stash " + h2 + "/" + n2;
    });
  });

