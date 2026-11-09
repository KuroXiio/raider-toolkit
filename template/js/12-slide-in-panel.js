  /* ---------- slide-in panel: item details and the shopping list, from any page ---------- */
  var drwMode = "", drwItem = "", NMIDX = null;
  function itemIdByName(n) {
    if (!NMIDX) { NMIDX = {}; ITEMS.forEach(function (i) { NMIDX[i.n.toLowerCase()] = i.id; }); }
    return NMIDX[String(n || "").toLowerCase()] || "";
  }
  function drwEl() {
    var d = $("#drw"); if (d) return d;
    d = document.createElement("div"); d.id = "drw"; d.className = "drw"; d.hidden = true;
    d.innerHTML = '<div class="drwb" data-drwx></div><aside class="drwp" role="dialog" aria-modal="true" aria-labelledby="drwT"><div class="drwh"><b id="drwT"></b><button type="button" class="mlx" data-drwx aria-label="' + esc(t("Close")) + '">×</button></div><div class="drwc" id="drwC"></div></aside>';
    document.body.appendChild(d); return d;
  }
  function drwOpen(mode, id) {
    var d = drwEl(); drwMode = mode; drwItem = id || ""; hideTT(); renderDrw();
    d.hidden = false; requestAnimationFrame(function () { d.classList.add("on"); });
    document.documentElement.classList.add("drwon");
    var x = d.querySelector(".drwh [data-drwx]"); if (x) x.focus({ preventScroll: true });
  }
  function drwClose() {
    var d = $("#drw"); if (!d || d.hidden) return; d.classList.remove("on"); drwMode = "";
    document.documentElement.classList.remove("drwon");
    setTimeout(function () { if (!drwMode) d.hidden = true; }, 200);
  }
  function drwMissing() {
    var ids = []; shop.g.forEach(function (g) { Object.keys(g.items).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); });
    return ids;
  }
  function renderDrw() {
    var c = $("#drwC"), tt2 = $("#drwT"); if (!c) return;
    if (drwMode === "item") {
      var it = IDX[drwItem]; if (!it) { drwClose(); return; }
      tt2.textContent = t("Item");
      c.innerHTML = card(it) + '<div class="drwf"><button type="button" class="chip orb" data-drwfind="' + esc(it.n) + '">' + esc(t("Open in Item finder")) + "</button></div>";
      return;
    }
    if (drwMode !== "list") return;
    tt2.textContent = t("Shopping list");
    var ids = drwMissing(), todo = ids.filter(function (id) { return needTotal(id) > haveOf(id); }), done = ids.length - todo.length;
    if (!ids.length) { c.innerHTML = '<p class="dim drwe">' + esc(t("Your list is empty. Press + Shopping list anywhere to add things.")) + "</p>"; return; }
    c.innerHTML = '<div class="drwsum"><b>' + todo.length + "</b> " + esc(t(todo.length === 1 ? "item to find" : "items to find")) + (done ? ' <span class="dim">· ' + done + " " + esc(t("done")) + "</span>" : "") + "</div>" +
      '<div class="drwact"><button type="button" class="btn go orb" data-drwplan>' + esc(t("Plan a route")) + '</button><button type="button" class="btn orb" data-drwshare>' + esc(t("Share list")) + '</button><a class="btn orb" href="#list">' + esc(t("Full list")) + '</a></div><div class="drwshare" id="drwShare" hidden></div>' +
      drwListHtml(todo, ids.filter(function (id) { return todo.indexOf(id) < 0; }));
  }
  /* the cart, grouped by where you find things: the loot area that covers most of what is left goes first */
  var drwDoneOpen = false;
  function drwCats(id) { var f = (IDX[id] || {}).f; return f ? String(f).split(/\s*,\s*/).filter(Boolean) : []; }
  function drwGroups(ids) {
    var out = [], left = ids.filter(function (id) { return drwCats(id).length; });
    while (left.length) {
      var cnt = {}; left.forEach(function (id) { drwCats(id).forEach(function (c) { cnt[c] = (cnt[c] || 0) + 1; }); });
      var best = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || LOOT_CATS.indexOf(a) - LOOT_CATS.indexOf(b); })[0];
      var g = left.filter(function (id) { return drwCats(id).indexOf(best) > -1; });
      out.push({ k: best, ids: g }); left = left.filter(function (id) { return g.indexOf(id) < 0; });
    }
    var rest = ids.filter(function (id) { return !drwCats(id).length; });
    var arc = rest.filter(function (id) { var sp = (IDX[id] || {}).sp; return sp && (sp.t || []).some(function (x) { return MKT[x] && MKT[x][0] === "arc"; }); });
    var craft = rest.filter(function (id) { return arc.indexOf(id) < 0 && IDX[id] && (IDX[id].rp || IDX[id].ve); });
    var other = rest.filter(function (id) { return arc.indexOf(id) < 0 && craft.indexOf(id) < 0; });
    if (arc.length) { var ag = out.filter(function (g) { return g.k === "ARC"; })[0]; if (ag) ag.ids = ag.ids.concat(arc); else out.push({ k: "ARC", ids: arc }); }
    if (craft.length) out.push({ k: "Craft or buy", ids: craft });
    if (other.length) out.push({ k: "Other", ids: other });
    return out;
  }
  function drwRow(id, cat) {
    var nd = needTotal(id), hv = Math.min(haveOf(id), nd), ok = hv >= nd;
    var also = cat ? drwCats(id).filter(function (c) { return c !== cat; }).map(function (c) { return t(c); }) : [];
    return '<div class="dwr' + (ok ? " ok" : "") + '">' + thumb(id) + '<span class="dwnm"><button type="button" class="dwn" data-find="' + esc(nm(id)) + '">' + esc(nm(id)) + "</button>" + (also.length ? '<small class="dwt">' + esc(also.join(" · ")) + "</small>" : "") + "</span>" +
      '<span class="dwq"><button type="button" data-drwhv="' + id + '" data-d="-1" aria-label="−1">−</button><b>' + hv + "/" + nd + '</b><button type="button" data-drwhv="' + id + '" data-d="1" aria-label="+1">+</button></span></div>';
  }
  function drwListHtml(todo, done) {
    var h = "";
    if (todo.length < 6) h = '<div class="drwl">' + todo.map(function (id) { return drwRow(id, ""); }).join("") + "</div>";
    else h = drwGroups(todo).map(function (g) {
      return '<div class="dwg"><span>' + esc(t(g.k)) + "</span><em>" + g.ids.length + '</em></div><div class="drwl">' + g.ids.map(function (id) { return drwRow(id, g.k); }).join("") + "</div>";
    }).join("");
    if (done.length) h += '<details class="dwdone"' + (drwDoneOpen || !todo.length ? " open" : "") + '><summary><span>' + esc(t("Done")) + "</span><em>" + done.length + '</em></summary><div class="drwl">' + done.map(function (id) { return drwRow(id, ""); }).join("") + "</div></details>";
    return h;
  }
  document.addEventListener("toggle", function (e) { if (e.target && e.target.classList && e.target.classList.contains("dwdone")) drwDoneOpen = e.target.open; }, true);
  function cartSync() {
    var b = $("#cartbtn");
    if (!b) { b = document.createElement("button"); b.type = "button"; b.id = "cartbtn"; b.className = "cartbtn"; b.setAttribute("data-drwlist", ""); b.setAttribute("aria-label", t("Shopping list")); b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg><b id="cartn"></b>'; document.body.appendChild(b); }
    var n = shopCount(); $("#cartn").textContent = n || "";
    b.hidden = !n || /^#list/.test(location.hash);
  }
  window.addEventListener("hashchange", function () { cartSync(); drwClose(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drwMode) drwClose(); });
  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    var l = e.target.closest("[data-drwlist]"); if (l) { e.preventDefault(); var ts = $("#toast"); if (ts) ts.classList.remove("on"); drwOpen("list"); return; }
    if (!drwMode || !e.target.closest("#drw")) return;
    if (e.target.closest("[data-drwx]")) { drwClose(); return; }
    var h = e.target.closest("[data-drwhv]"); if (h) { var id = h.dataset.drwhv; shop.have[id] = Math.max(0, Math.min(needTotal(id), haveOf(id) + +h.dataset.d)); saveShop(); rerenderShopViews(); return; }
    if (e.target.closest("[data-drwplan]")) { drwClose(); planFromList(); return; }
    if (e.target.closest("[data-drwshare]")) {
      if (!shop.g.length) return;
      shareCode(function (c) {
        var url = location.origin + location.pathname + "#list?share=" + c, box = $("#drwShare");
        if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) navigator.share({ title: "Raider Toolkit shopping list", url: url }).catch(function () {});
        if (box) { box.hidden = false; box.innerHTML = '<b>' + esc(t("Share link")) + '</b><input type="text" readonly value="' + esc(url) + '" aria-label="' + esc(t("Share link")) + '"><button type="button" class="btn orb" data-drwcopy>' + esc(t("Copy")) + "</button>"; var inp = box.querySelector("input"); inp.focus(); inp.select(); }
      });
      return;
    }
    var cp = e.target.closest("[data-drwcopy]"); if (cp) { var inp2 = $("#drwShare input"); if (inp2) { inp2.select(); copyText(inp2.value, function () { cp.textContent = t("Copied"); }); } return; }
    var fi = e.target.closest("[data-drwfind]"); if (fi) { drwClose(); findItem(fi.dataset.drwfind); return; }
    if (e.target.closest("[data-mshow], [data-kshow], [data-map], [data-mapsel], a[href^='#']")) drwClose();
  });
