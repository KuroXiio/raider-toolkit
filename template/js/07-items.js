  /* ---------- Items ---------- */
  var typeSet = {}; ITEMS.forEach(function (i) { typeSet[i.t] = 1; });
  var TYPES = ["All types"].concat(Object.keys(typeSet).sort());
  $("#fType").innerHTML = TYPES.map(function (t) { return "<option>" + esc(t) + "</option>"; }).join("");
  var fRar = "All", fUse = "", shown = 24;
  function renderUseChips() {
    var need = compute().need, n = Object.keys(need).length;
    $("#useChips").innerHTML = [["", "Any use"], ["ws", "Used in the Workshop"], ["plan", "Needed for my plan (" + n + ")"]].map(function (c) {
      return '<button type="button" class="chip orb" data-use="' + c[0] + '" aria-pressed="' + (fUse === c[0]) + '">' + esc(c[1]) + "</button>";
    }).join("");
  }
  function renderRarChips() {
    $("#rarChips").innerHTML = ["All"].concat(RAR).map(function (r) {
      return '<button type="button" class="chip orb" data-r="' + r + '" aria-pressed="' + (fRar === r) + '">' + r + "</button>";
    }).join("");
  }
  function usedIn(id) {
    var out = [];
    STATIONS.forEach(function (s) { s.lv.forEach(function (l, i) { l.forEach(function (m) { if (m.i === id) out.push(s.n + " L" + (i + 1) + " ×" + m.q); }); }); });
    return out;
  }
  function costStr(c) {
    return Object.keys(c || {}).map(function (k) {
      var lab = k === "coins" ? "coins" : k === "creds" ? "creds" : nm(k);
      return fmt(c[k]) + " " + lab;
    }).join(" + ");
  }
  function list(arr) { return arr.map(esc).join(", "); }
  function card(i, bare) {   // bare: without its own buttons (the details window has them in a bar at the bottom)
    var g = GUIDE[i.id], used = usedIn(i.id);
    var kv = "";
    if (i.f) kv += "<dt>Loot category</dt><dd>" + esc(i.f) + "</dd>";
    if (i.ve) kv += "<dt>Vendors</dt><dd>" + i.ve.map(function (v) { return esc(v.tr || "Trader") + ": " + esc(costStr(v.c)) + (v.lim ? ", limit " + v.lim : "") + (v.lv ? ", trader level " + v.lv : ""); }).join("<br>") + "</dd>";
    if (i.rc) kv += "<dt>Recycles into</dt><dd>" + Object.keys(i.rc).map(function (k) { return i.rc[k] + " " + esc(nm(k)); }).join(", ") + "</dd>";
    if (i.cb) kv += "<dt>Crafted at</dt><dd>" + list(i.cb.map(function (b) { return (BENCH[b] || b) + (i.sl ? " L" + i.sl : ""); })) + (i.rp ? " from " + Object.keys(i.rp).map(function (k) { return i.rp[k] + " " + esc(nm(k)); }).join(", ") : "") + "</dd>";
    if (used.length) kv += "<dt>Workshop</dt><dd>" + list(used) + "</dd>";
    var pn = compute().need[i.id];
    if (pn) { var hv = ws.have[i.id] || 0; kv += '<dt>My plan</dt><dd><b style="color:' + (hv >= pn ? "var(--ok)" : "var(--warn)") + '">' + (hv >= pn ? "Covered: " + hv + " in stash, " + pn + " needed" : "Need " + pn + ", " + hv + " in stash, " + (pn - hv) + " to find") + "</b></dd>"; }
    if (i.bp) kv += "<dt>Note</dt><dd>Requires a blueprint</dd>";
    if (i.q) kv += "<dt>Note</dt><dd>Quest item</dd>";
    var spc = mkSpots(i.id), spm = MAP_ORDER.filter(function (k) { return mkMapCount(i.id, k); });
    if (spm.length) kv += '<dt>' + esc(t("On the map")) + '</dt><dd>' + esc(mkWhat(i.id)) + '<div class="mcs">' + spm.map(function (k) { return "<span>" + esc(MAPS[k].name) + " <b>" + fmt(mkMapCount(i.id, k)) + "</b></span>"; }).join("") + "</div>" + (bare ? "" : '<button type="button" class="chip orb" style="margin-top:8px" data-mshow="' + i.id + '">' + esc(t("Show on map")) + "</button>") + "</dd>";
    if (KIDX[i.id]) kv += '<dt>Key room</dt><dd>' + esc(KIDX[i.id].door) + (bare ? "" : ' <button type="button" class="chip orb" style="margin-top:6px" data-kshow="' + i.id + '">' + (KIDX[i.id].pin ? "Show on map" : "Open map") + "</button>") + "</dd>";
    if (i.nd && !i.mine) kv += "<dt>Data</dt><dd>Added in update 2.x. Value and rarity are not in the data set yet, so none is shown.</dd>";
    if (i.mine) kv += '<dt>Your fix</dt><dd>Value or rarity set by you on this device' + (i.myNote ? ": " + esc(i.myNote) : "") + '. <a href="#info" style="color:var(--mint)">Data check</a></dd>';
    var guide = g
      ? '<div class="guide"><b>Where to find it</b>' + esc(g.w) + '<div class="row" style="margin-top:8px">' + mapChips(g.m) + "</div></div>"
      : '<div class="guide"><b>Where to find it</b><span class="dim">No confirmed spawn spot in the guides used here.' + (i.f ? " The game data only lists the loot category above." : "") + "</span></div>";
    // the picture, name and numbers on top; the details underneath use the card's full width
    return '<article class="panel item" style="--rc:' + rcol(i.r) + '"><div class="ihead">' + tile(i) +
      '<div class="info"><h3>' + esc(i.n) + '</h3><div class="row"><span class="pill">' + esc(i.t) + '</span><span class="pill r">' + esc(i.r || "Rarity not published") + "</span></div>" +
      '<div class="statline"><span><small>Value</small>' + (i.v == null ? "Not published" : fmt(i.v)) + '</span>' + (i.w != null ? "<span><small>Weight</small>" + i.w + " kg</span>" : "") + (i.s ? "<span><small>Stack</small>" + i.s + "</span>" : "") + "</div>" +
      (i.d ? '<p class="dim">' + esc(i.d) + "</p>" : "") + '</div></div><div class="imore">' + (kv ? '<dl class="kv">' + kv + "</dl>" : "") + guide + (bare ? "" : '<div class="row" style="margin-top:10px"><button type="button" class="addl" data-add="' + i.id + '">+ Shopping list</button>' + (i.rp ? '<button type="button" class="addl mat" data-addm="' + i.id + '" title="Add the materials to craft one">+ Materials to craft</button>' : "") + "</div>") + "</div></article>";
  }
  /* in the list: a small card, all the same size. Click it for the details. */
  function mini(i) {
    return '<article class="panel imini" style="--rc:' + rcol(i.r) + '">' + tile(i) +
      '<div class="info"><h3>' + esc(i.n) + '</h3><div class="row"><span class="pill">' + esc(i.t) + '</span><span class="pill r">' + esc(i.r || "Rarity not published") + "</span></div>" +
      '<div class="statline"><span><small>Value</small>' + (i.v == null ? "–" : fmt(i.v)) + '</span>' + (i.w != null ? "<span><small>Weight</small>" + i.w + " kg</span>" : "") + (i.s ? "<span><small>Stack</small>" + i.s + "</span>" : "") + "</div></div>" +
      '<span class="ihint" aria-hidden="true">' + esc(t("Details")) + '<svg viewBox="0 0 16 16"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9"/></svg></span>' +
      '<button type="button" class="iopen" data-item="' + i.id + '" aria-label="' + esc(i.n) + ": " + esc(t("details")) + '"></button>' +
      '<button type="button" class="addl iadd" data-add="' + i.id + '" title="' + esc(t("Add to shopping list")) + '" aria-label="' + esc(i.n) + ": " + esc(t("Add to shopping list")) + '">+</button></article>';
  }
  var itemDlg = $("#itemDlg");
  /* the bar at the bottom of the details window: every action in one row */
  function itemBar(i) {
    var n = needTotal(i.id), onMap = MAP_ORDER.some(function (k) { return mkMapCount(i.id, k); }), key = KIDX[i.id];
    return '<button type="button" class="btn go orb" data-add="' + i.id + '">' + esc(t("Add to shopping list")) + (n ? ' <em>' + n + " " + esc(t("on list")) + "</em>" : "") + "</button>" +
      (i.rp ? '<button type="button" class="btn orb" data-addm="' + i.id + '" title="' + esc(t("Add the materials to craft one")) + '">' + esc(t("Add crafting materials")) + "</button>" : "") +
      (onMap ? '<button type="button" class="btn orb" data-mshow="' + i.id + '">' + esc(t("Show on map")) + "</button>" : key ? '<button type="button" class="btn orb" data-kshow="' + i.id + '">' + esc(t(key.pin ? "Show on map" : "Open map")) + "</button>" : "");
  }
  function itemOpen(id, from) {
    var i = ITEMS.filter(function (x) { return x.id === id; })[0]; if (!i || !itemDlg) return;
    dlgOpen(id, "item", card(i, true), itemBar(i), from);
  }
  function dlgOpen(id, kind, body, bar, from) {
    if (!itemDlg) return;
    var show = function () {
      $("#itemDlgBody").innerHTML = body;
      $("#itemDlgBar").innerHTML = bar; itemDlg.dataset.id = id; itemDlg.dataset.kind = kind;
      if (itemDlg.showModal) { if (!itemDlg.open) itemDlg.showModal(); } else itemDlg.setAttribute("open", "");
      itemDlg.scrollTop = 0;
    };
    // the picture you clicked grows into the one in the window, where the browser can do that
    var tile = from && from.querySelector(".tile"), calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!tile || calm || !document.startViewTransition || itemDlg.open) { show(); return; }
    tile.style.viewTransitionName = "itemtile";
    var vt = document.startViewTransition(function () { tile.style.viewTransitionName = ""; show(); var big = itemDlg.querySelector(".tile"); if (big) big.style.viewTransitionName = "itemtile"; });
    vt.finished.then(function () { var big = itemDlg.querySelector(".tile"); if (big) big.style.viewTransitionName = ""; }, function () {});
  }
  function itemClose() { if (itemDlg && itemDlg.open) itemDlg.close(); }
  if (itemDlg) {
    document.body.appendChild(itemDlg);   // so it also opens from pages other than Items
    $("#results").addEventListener("click", function (e) { var b = e.target.closest("[data-item]"); if (b) itemOpen(b.dataset.item, b.closest(".imini")); });
    // after adding, the bar shows the new count (the click itself is handled with every other "add" button)
    itemDlg.addEventListener("click", function (e) {
      var a = e.target.closest("[data-add], [data-addm]"); if (!a) return;
      setTimeout(function () { var id = itemDlg.dataset.id, i = ITEMS.filter(function (x) { return x.id === id; })[0]; if (!itemDlg.open) return; if (itemDlg.dataset.kind === "key") { if (!KIDX[id]) return; $("#itemDlgBar").innerHTML = keyBar(KIDX[id]); } else { if (!i) return; $("#itemDlgBar").innerHTML = itemBar(i); } var nb = $("#itemDlgBar").querySelector(a.dataset.add ? "[data-add]" : "[data-addm]"); if (nb) { nb.classList.add("did"); nb.focus(); } }, 0);
    });
    itemDlg.addEventListener("click", function (e) {
      if (e.target === itemDlg || e.target.closest("[data-dclose]")) { itemClose(); return; }     // the dark area around it, or the X
      var ki = e.target.closest("[data-kitem]"); if (ki) { itemOpen(ki.dataset.kitem); return; }
      if (e.target.closest("[data-mshow], [data-kshow], [data-map], a[href^='#']")) itemClose();   // going to the map or another page
    });
    window.addEventListener("hashchange", itemClose);
  }
  function filtered() {
    var q = $("#q").value.trim().toLowerCase(), t = $("#fType").value, sort = $("#fSort").value;
    var planNeed = fUse === "plan" ? compute().need : null;
    var out = ITEMS.filter(function (i) {
      if (fUse === "ws" && !usedIn(i.id).length) return false;
      if (planNeed && !planNeed[i.id]) return false;
      if (t !== "All types" && i.t !== t) return false;
      if (fRar !== "All" && i.r !== fRar) return false;
      if (!q) return true;
      var hay = (i.n + " " + i.t + " " + (i.r || "") + " " + (i.f || "")).toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
    });
    if (sort === "vd") out.sort(function (a, b) { return (b.v || 0) - (a.v || 0) || a.n.localeCompare(b.n); });
    else if (sort === "va") out.sort(function (a, b) { return (a.v || 0) - (b.v || 0) || a.n.localeCompare(b.n); });
    else if (sort === "az") out.sort(function (a, b) { return a.n.localeCompare(b.n); });
    else if (sort === "rar") out.sort(function (a, b) { return RAR.indexOf(b.r) - RAR.indexOf(a.r) || (b.v || 0) - (a.v || 0); });
    else if (q) out.sort(function (a, b) { return (b.n.toLowerCase().indexOf(q) === 0) - (a.n.toLowerCase().indexOf(q) === 0) || a.n.localeCompare(b.n); });
    return out;
  }
  function renderItems(reset) {
    if (reset) shown = 24;
    var list2 = filtered();
    $("#countLine").textContent = "Showing " + Math.min(shown, list2.length) + " of " + list2.length + " matching items (" + ITEMS.length + " total)";
    $("#results").innerHTML = list2.length ? list2.slice(0, shown).map(mini).join("") : '<div class="empty">No item matches that search. Try a shorter name.</div>';
    $("#moreBtn").hidden = list2.length <= shown;
  }
  $("#q").addEventListener("input", function () { renderItems(true); });
  $("#fType").addEventListener("change", function () { renderItems(true); });
  $("#fSort").addEventListener("change", function () { renderItems(true); });
  $("#rarChips").addEventListener("click", function (e) { var b = e.target.closest("button[data-r]"); if (!b) return; fRar = b.dataset.r; renderRarChips(); renderItems(true); });
  $("#useChips").addEventListener("click", function (e) { var b = e.target.closest("button[data-use]"); if (!b) return; fUse = b.dataset.use; renderUseChips(); renderItems(true); });
  $("#moreBtn").addEventListener("click", function () { shown += 24; renderItems(false); });
  function findItem(name) { $("#q").value = name; $("#fType").value = "All types"; fRar = "All"; renderRarChips(); renderItems(true); go("items"); }

