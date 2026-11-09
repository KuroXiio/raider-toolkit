  /* ---------- Data check (admin-gated) ---------- */
  function sha256hex(s) {
    try {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      });
    } catch (e) { return Promise.resolve(""); }
  }
  var ADMIN_OK = !!ADMIN_HASH && store("rt-admin") === ADMIN_HASH;
  function adminUnlock(pw) {
    return sha256hex(pw || "").then(function (h) {
      if (h && ADMIN_HASH && h === ADMIN_HASH) { store("rt-admin", h); ADMIN_OK = true; return true; }
      return false;
    });
  }
  function dataIssues() {
    var refs = {};
    function ref(id, where) { if (!id || id === "coins" || id === "creds") return; (refs[id] = refs[id] || []).push(where); }
    STATIONS.forEach(function (s) { s.lv.forEach(function (l, i) { l.forEach(function (m) { ref(m.i, s.n + " " + (i + 1)); }); }); });
    ITEMS.forEach(function (i) { Object.keys(i.rp || {}).forEach(function (k) { ref(k, "recipe of " + i.n); }); Object.keys(i.rc || {}).forEach(function (k) { ref(k, "recycling of " + i.n); }); (i.ve || []).forEach(function (v) { Object.keys(v.c || {}).forEach(function (k) { ref(k, "price of " + i.n); }); }); });
    Object.keys(MODS).forEach(function (k) { Object.keys(MODS[k].rec || {}).forEach(function (x) { ref(x, "recipe of " + MODS[k].n); }); });
    WEAPONS.forEach(function (w) { if (w.wip) return; Object.keys(w.rec || {}).forEach(function (x) { ref(x, w.n + " craft"); }); (w.up || []).forEach(function (u, i) { Object.keys(u || {}).forEach(function (x) { ref(x, w.n + " tier " + (i + 1)); }); }); (w.rep || []).forEach(function (u) { Object.keys(u || {}).forEach(function (x) { ref(x, w.n + " repair"); }); }); });
    Object.keys(GUIDE).forEach(function (k) { ref(k, "where-to-find notes"); });
    var unknown = Object.keys(refs).filter(function (id) { return !IDX[id] && !MODS[id]; }).map(function (id) { return { id: id, where: refs[id] }; });
    var noData = ITEMS.filter(function (i) { return ORIG[i.id] ? (ORIG[i.id].v == null || ORIG[i.id].r == null) : (i.v == null || i.r == null); });
    var noIcon = ITEMS.filter(function (i) { return !ICONS[i.id]; });
    var wipW = WEAPONS.filter(function (w) { return w.wip; });
    var noPin = KEYS.filter(function (k) { return !k.pin && k.m !== "any"; });
    var conflicts = KEYS.filter(function (k) { return /disagree|KeenGamer|Dexerto/.test(k.door); }).map(function (k) { return { n: nm(k.id), t: k.door }; });
    WEAPONS.forEach(function (w) { if (w.amp && !w.amp.explicit) conflicts.push({ n: w.n + " amplification", t: "Module mark Mk. " + ROMAN[w.amp.mk] + " is worked out from rarity; no guide states it." }); });
    var evIss = [];
    if (EV) {
      var evAge = Math.floor((Date.now() - Date.parse(EV.rec)) / 864e5);
      if (evAge > 14) evIss.push({ n: "Recorded " + EV.rec, t: evAge + " days old. Compare a few hours with a live tracker and record a new run if they differ." });
      if (DATA_INFO.patch !== EV.patch) evIss.push({ n: "Patch changed", t: "Recorded on patch " + EV.patch + ", the site is now on patch " + DATA_INFO.patch + ". Rotations often change with patches." });
    }
    var wipMaps = MAP_ORDER.filter(function (k) { return mapWip(k).length; }).map(function (k) { return { n: MAPS[k].name, t: mapWip(k).join(", ") }; });
    return { unknown: unknown, noData: noData, noIcon: noIcon, wipW: wipW, noPin: noPin, conflicts: conflicts, wipMaps: wipMaps, evIss: evIss };
  }
  var RARS = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
  function renderDataCheck() {
    var d = dataIssues(), nf = Object.keys(FIX).length;
    var openND = d.noData.filter(function (i) { var f = FIX[i.id]; var o = ORIG[i.id] || { v: i.v, r: i.r }; return !(f && (o.v != null || f.v != null) && (o.r != null || f.r)); }).length;
    var tot = d.unknown.length + openND + d.noIcon.length + d.wipW.length + d.noPin.length + d.conflicts.length + d.wipMaps.length + d.evIss.length;
    var warn = openND + d.unknown.length + d.evIss.length > 0;
    ["#dbadgeF", "#dbadgeH"].forEach(function (s) { var b = $(s); if (b) { b.querySelector(".dbt").textContent = "Data: patch " + DATA_INFO.patch + " · updated " + DATA_INFO.checked; b.classList.toggle("warn", ADMIN_OK && warn); b.title = "When the data was last brought up to date"; } });
    if (!ADMIN_OK) {
      $("#dataCheck").innerHTML = '<h3>Data check</h3><p>' + esc(t("Admin-only tools for reviewing data gaps. Enter the password to open this panel.")) + '</p>' +
        '<div class="dcact"><input type="password" id="admPw" placeholder="' + esc(t("Admin password")) + '" autocomplete="off" aria-label="Admin password"><button type="button" class="btn orb" id="admGo">' + esc(t("Unlock")) + '</button></div><p class="dim" id="admMsg" style="font-size:.84rem;margin-top:8px"></p>';
      return;
    }
    function grp(title, n, body, hint) { return '<details class="dcg"' + (n && title.indexOf("Missing value") === 0 ? " open" : "") + "><summary>" + title + '<span class="n' + (n ? "" : " ok") + '">' + (n ? n + " to check" : "all good") + "</span></summary><div class=\"b\">" + (hint ? "<p>" + hint + "</p>" : "") + (body || '<p>Nothing found.</p>') + "</div></details>"; }
    function row(icon, name, sub, fx) { return '<div class="dcrow">' + icon + '<div class="nm">' + esc(name) + (sub ? "<small>" + esc(sub) + "</small>" : "") + '</div><div class="fx">' + (fx || "") + "</div></div>"; }
    var fixRows = d.noData.map(function (i) {
      var f = FIX[i.id] || {}, cur = ORIG[i.id] || { v: i.v, r: i.r };
      return row(thumb(i.id), i.n, (i.t || "") + (cur.v == null ? " · no value" : "") + (cur.r == null ? " · no rarity" : ""),
        (f.v != null || f.r ? '<span class="fixed">fixed ✓</span>' : "") + '<input type="number" min="0" placeholder="Value" value="' + (f.v != null ? f.v : (cur.v != null ? cur.v : "")) + '" data-fixv="' + i.id + '" aria-label="Value of ' + esc(i.n) + '">' +
        '<select data-fixr="' + i.id + '" aria-label="Rarity of ' + esc(i.n) + '"><option value="">Rarity…</option>' + RARS.map(function (r) { return "<option" + ((f.r || cur.r) === r ? " selected" : "") + ">" + r + "</option>"; }).join("") + "</select>");
    }).join("");
    $("#dataCheck").innerHTML = '<h3>Data check</h3><button type="button" class="btn orb" id="admLock" style="float:right">' + esc(t("Lock admin tools")) + '</button><p>The site checks its own data every time it loads. Game data is from the community data set of ' + DATA_INFO.baseDate + ", with corrections up to patch " + DATA_INFO.patch + " (" + DATA_INFO.patchDate + "); last rebuilt " + DATA_INFO.checked + (DATA_INFO.auto ? " (the site rebuilds itself every day)" : "") + ". Anything below is missing, estimated or disputed. You can fill in missing values here: fixes apply on this device straight away, and “Copy my fixes” gives you a short text to send so they can be added for everyone.</p>" +
      '<div class="dcsum"><span' + (openND ? "" : ' class="ok"') + "><b>" + openND + "</b>missing value or rarity</span><span" + (d.unknown.length ? "" : ' class="ok"') + "><b>" + d.unknown.length + "</b>unknown item references</span><span><b>" + d.noIcon.length + "</b>no icon</span><span><b>" + d.wipW.length + "</b>WIP weapons</span><span><b>" + d.noPin.length + "</b>keys without pin</span><span><b>" + d.conflicts.length + "</b>disputed or estimated</span>" + (nf ? '<span class="ok"><b>' + nf + "</b>your fixes active</span>" : "") + "</div>" +
      grp("Missing value or rarity", openND, fixRows, "Mostly items added in update 2.x. Enter what the game shows on the item card.") +
      grp("Unknown item references", d.unknown.length, d.unknown.map(function (u) { return row('<span class="th"><i></i></span>', pretty(u.id), "Used in: " + u.where.slice(0, 3).join(", ") + (u.where.length > 3 ? " +" + (u.where.length - 3) + " more" : "")); }).join(""), "An id is used in a recipe, cost or note but the item itself is not in the data. The name shown is a best guess from the id.") +
      grp("Weapons not in the calculator", d.wipW.length, d.wipW.map(function (w) { return row('<span class="th"><i></i></span>', w.n, "Recipe, upgrade costs and slots not published"); }).join("")) +
      grp("Map event schedule", d.evIss.length, d.evIss.map(function (x) { return row('<span class="th"><i></i></span>', x.n, x.t); }).join(""), "The map conditions on the Maps page are estimated from a rotation recorded by hand. It is flagged here when it gets old or the patch changes.") +
      grp("Maps with missing parts", d.wipMaps.length, d.wipMaps.map(function (m) { return row('<span class="th"><i></i></span>', m.n, m.t); }).join("")) +
      grp("Keys without a map pin", d.noPin.length, d.noPin.map(function (k) { return row(thumb(k.id), nm(k.id), MAPS[k.m] ? MAPS[k.m].name : ""); }).join("")) +
      grp("Disputed or estimated", d.conflicts.length, d.conflicts.map(function (c) { return row('<span class="th"><i></i></span>', c.n, c.t); }).join(""), "Sources disagree, or the value is worked out rather than stated.") +
      grp("Items without an icon", d.noIcon.length, d.noIcon.map(function (i) { return row(thumb(i.id), i.n, i.t); }).join(""), "These show a plain placeholder until artwork is available.") +
      '<div class="dcact"><button type="button" class="btn orb" id="fixCopy"' + (nf ? "" : " disabled") + '>Copy my fixes</button><button type="button" class="btn orb" id="fixReset"' + (nf ? "" : " disabled") + '>Undo my fixes</button><span class="dim" id="fixMsg" style="font-size:.84rem"></span></div><div id="fixOut"></div>';
  }
  function saveFix(id, key, val) {
    FIX[id] = FIX[id] || {};
    if (val === "" || val == null) delete FIX[id][key]; else FIX[id][key] = key === "v" ? Math.max(0, parseInt(val, 10) || 0) : val;
    if (!Object.keys(FIX[id]).length) delete FIX[id];
    store("rt-fix", FIX);
    var it = IDX[id];
    if (it) { var o = ORIG[id] || { v: it.v, r: it.r }; it.v = o.v; it.r = o.r; delete it.mine; }
    applyFixes(); renderDataCheck(); renderItems(false);
  }
  $("#dataCheck").addEventListener("change", function (e) {
    var v = e.target.closest("[data-fixv]"); if (v) { saveFix(v.dataset.fixv, "v", v.value); return; }
    var r = e.target.closest("[data-fixr]"); if (r) saveFix(r.dataset.fixr, "r", r.value);
  });
  $("#dataCheck").addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.id === "admPw") { e.preventDefault(); $("#admGo").click(); } });
  $("#dataCheck").addEventListener("click", function (e) {
    if (e.target.closest("#admGo")) {
      var pw = $("#admPw").value, msg = $("#admMsg");
      adminUnlock(pw).then(function (ok) { if (ok) renderDataCheck(); else msg.textContent = t("Incorrect password."); });
      return;
    }
    if (e.target.closest("#admLock")) { ADMIN_OK = false; store("rt-admin", ""); renderDataCheck(); return; }
    if (e.target.closest("#fixReset")) { Object.keys(FIX).forEach(function (id) { var it = IDX[id], o = ORIG[id]; if (it && o) { it.v = o.v; it.r = o.r; delete it.mine; } }); FIX = {}; store("rt-fix", FIX); renderDataCheck(); renderItems(false); return; }
    if (e.target.closest("#fixCopy")) {
      var lines = Object.keys(FIX).map(function (id) { var f = FIX[id]; return "- " + nm(id) + " (" + id + "): " + [f.v != null ? "value " + f.v : "", f.r ? "rarity " + f.r : ""].filter(Boolean).join(", "); });
      var txt = "Raider Toolkit data fixes (patch " + DATA_INFO.patch + ")\n" + lines.join("\n");
      var msg = $("#fixMsg");
      var show = function () { $("#fixOut").innerHTML = '<div class="dcact"><textarea readonly>' + esc(txt) + "</textarea></div>"; var ta = $("#fixOut textarea"); ta.focus(); ta.select(); };
      try { navigator.clipboard.writeText(txt).then(function () { msg.textContent = "Copied. Paste it in a message to have the fixes added for everyone."; show(); }, show); } catch (er) { show(); }
    }
  });

