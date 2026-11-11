  /* ---------- Shopping list ---------- */
  var shop = store("rt-shop") || {};
  if (!shop.g) shop.g = []; if (!shop.have) shop.have = {}; if (!shop.fmt) shop.fmt = "plain";
  if (shop.got) { Object.keys(shop.got).forEach(function (k) { shop.have[k] = Math.max(shop.have[k] || 0, needTotal(k)); }); delete shop.got; }
  function saveShop() { store("rt-shop", shop); updateNb(); syncTouch("shop"); }
  function needTotal(id) { var n = 0; (shop.g || []).forEach(function (g) { n += g.items[id] || 0; }); return n; }
  function haveOf(id) { return Math.max(0, shop.have[id] || 0); }
  function shopCount() { var s = {}; shop.g.forEach(function (g) { Object.keys(g.items).forEach(function (k) { if (needTotal(k) > haveOf(k)) s[k] = 1; }); }); return Object.keys(s).length; }
  function updateNb() { var n = shopCount(); $("#nb").textContent = n ? n : ""; cartSync(); if (drwMode === "list") renderDrw(); }
  var toastT;
  function toast(msg, nolink) {
    var el = $("#toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.innerHTML = "<span>" + esc(msg) + "</span>" + (nolink ? "" : '<a href="#list" data-drwlist>View list →</a>'); el.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("on"); }, 3200);
  }
  function rerenderShopViews() { renderShop(); if (document.getElementById("v-list").classList.contains("on")) runSearch(); }
  function shopSet(key, label, items, notes) {
    var n = Object.keys(items).length; if (!n && !(notes && notes.length)) { toast("Nothing to add: your stash already covers it."); return; }
    var g = shop.g.filter(function (x) { return x.key === key; })[0];
    shop.g.forEach(function (x) { x.open = false; });
    if (g) { g.items = items; g.label = label; g.notes = notes || null; g.open = true; } else shop.g.push({ key: key, label: label, items: items, notes: notes || null, open: true });
    saveShop(); rerenderShopViews(); toast((g ? "Updated " : "Added ") + label + " (" + n + " item" + (n > 1 ? "s" : "") + ")");
  }
  function shopAddOne(id) {
    var g = shop.g.filter(function (x) { return x.key === "man"; })[0];
    if (!g) { g = { key: "man", label: "Added by hand", items: {} }; shop.g.push(g); }
    g.items[id] = (g.items[id] || 0) + 1; saveShop(); rerenderShopViews(); toast("Added " + nm(id) + " (×" + g.items[id] + ")");
  }
  function shopAddMats(id) {
    var it = IDX[id]; if (!it || !it.rp) return;
    var key = "mat:" + id, g = shop.g.filter(function (x) { return x.key === key; })[0];
    if (!g) { g = { key: key, n: 0, items: {} }; shop.g.push(g); }
    g.n = (g.n || 0) + 1; g.items = {}; Object.keys(it.rp).forEach(function (k) { g.items[k] = it.rp[k] * g.n; });
    g.label = "Materials to craft " + (g.n > 1 ? g.n + "× " : "") + it.n;
    saveShop(); rerenderShopViews(); toast("Added materials for " + (g.n > 1 ? g.n + "× " : "") + it.n);
  }
  /* what is still missing per group, after taking what you have off the first groups first */
  function remaining() {
    var pool = {}; Object.keys(shop.have).forEach(function (k) { pool[k] = haveOf(k); });
    return shop.g.map(function (g) {
      var r = {}; Object.keys(g.items).forEach(function (k) { var q = g.items[k], use = Math.min(pool[k] || 0, q); pool[k] = (pool[k] || 0) - use; r[k] = q - use; }); return r;
    });
  }
  var FMTS = [["plain", "Plain"], ["discord", "Discord"], ["steam", "Steam"]];
  function shopText() {
    var f = shop.fmt, comb = !!shop.comb, inclGot = !!shop.inclGot, out = [], rem = remaining();
    function line(id, need, left) {
      var done = left <= 0, txt = (inclGot ? need : left) + "x " + nm(id);
      if (done && !inclGot) return null;
      if (inclGot && !done && left < need) txt = need + "x " + nm(id) + " (" + left + " still to find)";
      if (f === "discord") return "- " + (done ? "~~" + txt + "~~" : txt);
      if (f === "steam") return "[*] " + (done ? "[strike]" + txt + "[/strike]" : txt);
      return "- " + txt + (done ? " (got)" : "");
    }
    function block(title, items, left, notes) {
      var ls = Object.keys(items).sort(function (a, b) { return items[b] - items[a] || nm(a).localeCompare(nm(b)); }).map(function (k) { return line(k, items[k], left[k]); }).filter(Boolean);
      ls = (notes || []).map(function (x) { return f === "steam" ? "[*] [i]" + x + "[/i]" : f === "discord" ? "- *" + x + "*" : "- " + x; }).concat(ls);
      if (!ls.length) return;
      if (f === "discord") out.push((title ? "**" + title + "**\n" : "") + ls.join("\n"));
      else if (f === "steam") out.push((title ? "[h2]" + title + "[/h2]\n" : "") + "[list]\n" + ls.join("\n") + "\n[/list]");
      else out.push((title ? title + "\n" : "") + ls.join("\n"));
    }
    if (comb) {
      var all = {}, al = {};
      shop.g.forEach(function (g, gi) { Object.keys(g.items).forEach(function (k) { all[k] = (all[k] || 0) + g.items[k]; al[k] = (al[k] || 0) + rem[gi][k]; }); });
      var nt = []; shop.g.forEach(function (g) { (g.notes || []).forEach(function (x) { nt.push(x); }); });
      block("", all, al, nt);
    } else shop.g.forEach(function (g, gi) { block(g.label, g.items, rem[gi], g.notes); });
    var head = f === "discord" ? "## ARC Raiders shopping list" : f === "steam" ? "[h1]ARC Raiders shopping list[/h1]" : "ARC Raiders shopping list";
    return out.length ? head + "\n\n" + out.join("\n\n") : "";
  }
  var HINTS = { plain: "Plain text, works anywhere.", discord: "Discord markdown: bold headings, bullet lists, crossed-out items you have.", steam: "Steam BBCode for guides, reviews and profile text. Steam's in-game notes may show the tags as plain text." };
  function renderShopExport() {
    $("#sfmt").innerHTML = FMTS.map(function (x) { return '<button type="button" class="orb" data-fmt="' + x[0] + '" aria-pressed="' + (shop.fmt === x[0]) + '">' + x[1] + "</button>"; }).join("");
    $("#sComb").checked = !!shop.comb; $("#sGot").checked = !!shop.inclGot;
    var txt = shopText(); $("#sOut").value = txt || (shop.g.length ? "You have everything on the list." : "Your list is empty."); $("#sHint").textContent = HINTS[shop.fmt];
    $("#sCopy").disabled = !txt;
  }
  function grpKind(g) { if (g.key.indexOf("sh:") === 0) return t("Shared") + " · " + grpKind({ key: g.key.slice(3) }); return g.key === "ws" ? "Workshop" : g.key === "man" ? "Your picks" : g.key.indexOf("w:") === 0 ? "Weapon" : g.key.indexOf("mat:") === 0 ? "Crafting materials" : g.key.indexOf("bp:") === 0 ? "Blueprints" : "List"; }
  function renderShop() {
    var el = $("#shopGroups"), rem = remaining();
    el.innerHTML = shop.g.length ? shop.g.map(function (g, gi) {
      var ks = Object.keys(g.items).sort(function (a, b) { return g.items[b] - g.items[a] || nm(a).localeCompare(nm(b)); });
      var stepper = g.key === "man" || g.key.indexOf("mat:") === 0;
      var cov = ks.filter(function (k) { return rem[gi][k] <= 0; }).length, open = g.open !== false, pct = ks.length ? Math.round(cov / ks.length * 100) : 100;
      var hd = '<div class="shead"><span></span><span></span><span>' + esc(t("Item")) + "</span><span>" + esc(t("Have")) + "</span><span>" + esc(t("Need")) + "</span></div>";
      return '<section class="panel sgrp' + (open ? " open" : "") + '"><div class="sgrp-h"><button type="button" class="sgt" data-tog="' + gi + '" aria-expanded="' + open + '"><i class="sgc" aria-hidden="true"></i><span><small>' + grpKind(g) + "</small><b>" + esc(g.label) + "</b></span>" +
        '<span class="sgp"><em>' + (ks.length ? cov + " / " + ks.length + " " + esc(t("covered")) : (g.notes || []).length + " " + esc(t("notes"))) + '</em><span class="sgb"><i style="width:' + pct + '%"></i></span></span></button><button type="button" class="x" data-rmg="' + gi + '">' + esc(t("Remove")) + "</button></div>" +
        (!open ? "" : (g.notes && g.notes.length ? '<details class="snd"><summary>' + esc(t("Notes")) + " <small>" + g.notes.length + '</small></summary><ul class="snotes">' + g.notes.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>" : "") +
        (ks.length ? '<div class="sitems' + (g.key === "man" ? " stp" : "") + '">' + hd + (ks.length > 1 ? hd.replace('class="shead"', 'class="shead s2"') : "") +
        ks.map(function (k) {
          var it = IDX[k], need = g.items[k], left = rem[gi][k], done = left <= 0, tot = needTotal(k);
          return '<div class="srow2' + (done ? " got" : "") + '" style="--rc:' + rcol(it && it.r) + '"><input type="checkbox" data-got="' + k + '"' + (done ? " checked" : "") + ' title="I have all of these" aria-label="I have all ' + esc(nm(k)) + '">' + thumb(k) + '<div class="nm">' + esc(nm(k)) + (done ? '<small class="ok">Covered</small>' : left < need ? "<small>" + left + " still to find</small>" : "") + "</div>" +
            '<input class="hv" type="number" min="0" inputmode="numeric" value="' + haveOf(k) + '" data-have="' + k + '" aria-label="How many ' + esc(nm(k)) + ' you have"' + (tot !== need ? ' title="Shared across all groups: you need ' + tot + ' in total"' : "") + ">" +
            '<div class="q">' + (stepper && g.key === "man" ? '<button type="button" data-q="-1" data-g="' + gi + '" data-k="' + k + '" aria-label="One less">−</button>' : "") + "×" + need + (stepper && g.key === "man" ? '<button type="button" data-q="1" data-g="' + gi + '" data-k="' + k + '" aria-label="One more">+</button>' : "") + "</div></div>";
        }).join("") + "</div>" : "")) + "</section>";
    }).join("") : '<div class="panel sempty"><b>Your shopping list is empty</b>Use the green “+ Shopping list” buttons in the Workshop, Weapons, Items and Keys tabs, or search for an item below.</div>';
    renderShopExport(); updateNb();
  }
  $("#shopGroups").addEventListener("click", function (e) {
    var r = e.target.closest("[data-rmg]"); if (r) { shop.g.splice(+r.dataset.rmg, 1); saveShop(); renderShop(); return; }
    var tg = e.target.closest("[data-tog]"); if (tg) { var gg = shop.g[+tg.dataset.tog]; gg.open = gg.open === false; saveShop(); renderShop(); return; }
    var q = e.target.closest("[data-q]");
    if (q) { var g = shop.g[+q.dataset.g], k = q.dataset.k; g.items[k] = (g.items[k] || 0) + (+q.dataset.q); if (g.items[k] <= 0) delete g.items[k]; if (!Object.keys(g.items).length) shop.g.splice(+q.dataset.g, 1); saveShop(); renderShop(); }
  });
  $("#shopGroups").addEventListener("change", function (e) {
    var c = e.target.closest("[data-got]");
    if (c) { var k = c.dataset.got; shop.have[k] = c.checked ? Math.max(haveOf(k), needTotal(k)) : 0; saveShop(); renderShop(); return; }
    var h = e.target.closest("[data-have]");
    if (h) { shop.have[h.dataset.have] = Math.max(0, parseInt(h.value, 10) || 0); saveShop(); renderShop(); }
  });
  $("#sfmt").addEventListener("click", function (e) { var b = e.target.closest("[data-fmt]"); if (!b) return; shop.fmt = b.dataset.fmt; saveShop(); renderShopExport(); });
  $("#sComb").addEventListener("change", function () { shop.comb = this.checked; saveShop(); renderShopExport(); });
  $("#sGot").addEventListener("change", function () { shop.inclGot = this.checked; saveShop(); renderShopExport(); });
  function b64u(bytes) { var s = ""; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function shareCode(cb) {
    var js = JSON.stringify({ v: 1, g: shop.g.map(function (g) { var o = { k: g.key, l: g.label, i: g.items }; if (g.notes && g.notes.length) o.n = g.notes; return o; }) });
    var raw = new TextEncoder().encode(js);
    if (window.CompressionStream) new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer().then(function (b) { cb("z" + b64u(new Uint8Array(b))); }, function () { cb("j" + b64u(raw)); });
    else cb("j" + b64u(raw));
  }
  var shareGot = null;
  function shareRead(code) {
    try { history.replaceState(null, "", location.pathname + location.search + "#list"); } catch (e) {}
    function done(txt) {
      try { var d = JSON.parse(txt); if (!d || !Array.isArray(d.g)) throw 0;
        shareGot = d.g.filter(function (g) { return g && g.i && typeof g.i === "object"; }).slice(0, 40).map(function (g) {
          var it = {}; Object.keys(g.i).forEach(function (k) { var q = parseInt(g.i[k], 10); if (IDX[k] && q > 0) it[k] = Math.min(q, 99999); });
          return { key: String(g.k || "shared").slice(0, 60), label: String(g.l || "Shared list").slice(0, 120), items: it, notes: Array.isArray(g.n) ? g.n.slice(0, 80).map(function (x) { return String(x).slice(0, 300); }) : null };
        }).filter(function (g) { return Object.keys(g.items).length || (g.notes && g.notes.length); });
        renderShareIn();
      } catch (e) { shareGot = null; toast(t("That share link is broken or incomplete."), true); }
    }
    try {
      var bytes = unb64u(code.slice(1));
      if (code[0] === "z" && window.DecompressionStream) new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text().then(done, function () { done(""); });
      else if (code[0] === "j") done(new TextDecoder().decode(bytes));
      else toast(t("This browser can't open share links. Try a newer one."), true);
    } catch (e) { done(""); }
  }
  function renderShareIn() {
    var el = $("#shareIn"); if (!el) return;
    if (!shareGot || !shareGot.length) { el.hidden = true; el.innerHTML = ""; return; }
    var n = 0; shareGot.forEach(function (g) { n += Object.keys(g.items).length; });
    el.hidden = false;
    el.innerHTML = '<div class="panel shin"><div><b>' + esc(t("Someone shared a shopping list with you")) + "</b><small>" + shareGot.length + " " + esc(t(shareGot.length === 1 ? "group" : "groups")) + " · " + n + " " + esc(t("items")) + ": " + esc(shareGot.map(function (g) { return g.label; }).join(", ")) + "</small></div>" +
      '<div class="shinb"><button type="button" class="btn go orb sm" data-share="add">' + esc(t("Add to my list")) + '</button><button type="button" class="btn orb sm" data-share="replace">' + esc(t("Replace my list")) + '</button><button type="button" class="x" data-share="no">' + esc(t("Dismiss")) + "</button></div></div>";
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-share]"); if (!b || !shareGot) return;
    var a = b.dataset.share;
    if (a === "add") shareGot.forEach(function (g) { var k = "sh:" + g.key, ex = shop.g.filter(function (x) { return x.key === k; })[0]; if (ex) { ex.items = g.items; ex.notes = g.notes; ex.label = g.label; } else shop.g.push({ key: k, label: g.label, items: g.items, notes: g.notes, open: false }); });
    if (a === "replace") shop.g = shareGot.map(function (g) { return { key: g.key, label: g.label, items: g.items, notes: g.notes, open: false }; });
    if (a !== "no") { saveShop(); rerenderShopViews(); toast(a === "add" ? t("Added the shared list to yours.") : t("Your list now matches the shared one."), true); }
    shareGot = null; renderShareIn();
  });
  $("#shopRoute").addEventListener("click", planFromList);
  $("#shopShare").addEventListener("click", function () {
    if (!shop.g.length) { toast(t("Your list is empty, so there is nothing to share yet."), true); return; }
    shareCode(function (c) {
      var url = location.origin + location.pathname + "#list?share=" + c, out = $("#shareOut");
      out.hidden = false;
      out.innerHTML = '<div class="panel shout"><div><b>' + esc(t("Link copied")) + "</b><small>" + esc(t("Anyone who opens it can add your list to theirs. Your Have counts are not included.")) + '</small></div><input type="text" readonly value="' + esc(url) + '" aria-label="' + esc(t("Share link")) + '"><button type="button" class="x" data-shclose>' + esc(t("Close")) + "</button></div>";
      var inp = out.querySelector("input"); copyText(url, function () {}); inp.focus(); inp.select();
    });
  });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-shclose]")) { $("#shareOut").hidden = true; } });
  $("#shopClear").addEventListener("click", function () { if (!shop.g.length) return; shop.g = []; shop.have = {}; saveShop(); renderShop(); });
  $("#sCopy").addEventListener("click", function () {
    var btn = this, txt = shopText(); if (!txt) return;
    function done() { btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = t("Copy to clipboard"); }, 1800); }
    function legacy() { var ta = $("#sOut"); ta.focus(); ta.select(); try { if (document.execCommand("copy")) { done(); return; } } catch (er) {} btn.textContent = "Select the text and copy it"; }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, legacy); else legacy(); } catch (er) { legacy(); }
  });
  function runSearch() {
    var q = ($("#sq").value || "").trim().toLowerCase();
    if (q.length < 2) { $("#sres").innerHTML = ""; return; }
    $("#sres").innerHTML = ITEMS.filter(function (i) { return i.n.toLowerCase().indexOf(q) > -1; }).slice(0, 10).map(function (i) {
      var on = needTotal(i.id), hv = haveOf(i.id), mats = i.rp ? Object.keys(i.rp).map(function (k) { return i.rp[k] + " " + nm(k); }).join(", ") : "";
      var st = [];
      if (on) st.push("On list ×" + on); if (hv) st.push("You have " + hv);
      if (i.cb) st.push("Crafted at " + i.cb.map(function (b) { return BENCH[b] || b; }).join(" / ") + (i.sl ? " " + i.sl : ""));
      return '<div class="sr">' + thumb(i.id) + '<span class="nm">' + esc(i.n) + "<small>" + esc(st.join(" · ") || (i.t || "")) + (mats ? '<span class="mats">Needs: ' + esc(mats) + "</span>" : "") + '</small></span><span class="sact"><button type="button" class="addl" data-add="' + i.id + '">+ Item</button>' +
        (i.rp ? '<button type="button" class="addl mat" data-addm="' + i.id + '" title="Add the materials to craft one">+ Materials</button>' : "") + "</span></div>";
    }).join("") || '<span class="dim">No match.</span>';
  }
  $("#sq").addEventListener("input", runSearch);
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-add]"); if (a) shopAddOne(a.dataset.add);
    var m = e.target.closest && e.target.closest("[data-addm]"); if (m) shopAddMats(m.dataset.addm);
  });

