  /* ---------- Keys ---------- */
  var KEYS = DB.keys || [], KIDX = {}; KEYS.forEach(function (k) { KIDX[k.id] = k; });
  var KMAP = { dam: "Dam Battlegrounds", space: "The Spaceport", buried: "Buried City", gate: "The Blue Gate", stella: "Stella Montis", riven: "Riven Tides", pendola: "Pendola Pass", any: "Any map" };
  var KORDER = ["dam", "buried", "space", "gate", "stella", "riven", "pendola", "any"];
  function keyPins(k) { return k.pin ? [k.pin].concat(k.xp || []) : []; }
  function keysOnImg(img) { return KEYS.filter(function (k) { return keyPins(k).some(function (p) { return p[0] === img; }); }); }
  function pinGroups(pins, img) {
    var gs = [];
    pins.forEach(function (k) {
      keyPins(k).filter(function (p) { return p[0] === img; }).forEach(function (p) {
        var g = gs.filter(function (x) { return Math.abs(x.x - p[1]) < 18 && Math.abs(x.y - p[2]) < 18; })[0];
        if (g) { if (g.ks.indexOf(k) < 0) g.ks.push(k); } else gs.push({ x: p[1], y: p[2], ks: [k] });
      });
    });
    return gs;
  }
  function pinHtml(g, d) {
    var k = g.ks[0], n = g.ks.length, it = IDX[k.id], c = n > 1 ? "#f2c94c" : rcol(it && it.r);
    var foc = g.ks.some(function (x) { return x.id === MV.focus; });
    return '<button type="button" class="kpin' + (foc ? " focus" : "") + '" data-kpin="' + g.ks.map(function (x) { return x.id; }).join(",") + '" style="left:' + (g.x / d.w * 100) + "%;top:" + (g.y / d.h * 100) + '%" aria-label="' + esc(n > 1 ? n + " keys: " + g.ks.map(function (x) { return nm(x.id); }).join(", ") : nm(k.id)) + '">' + (n > 1 ? '<span class="kcnt">' + n + "</span>" : "") +
      '<svg viewBox="0 0 30 38"><path d="M15 37C15 37 2 22 2 14a13 13 0 0 1 26 0c0 8-13 23-13 23z" fill="#0b0f26" stroke="' + c + '" stroke-width="2.5"/><circle cx="11.5" cy="13" r="4" fill="none" stroke="#f2c94c" stroke-width="2.4"/><path d="M15 14.5h8m-3 0v3.5m3-3.5v2.5" stroke="#f2c94c" stroke-width="2.4" fill="none"/></svg></button>';
  }
  var ktip = document.createElement("div"); ktip.id = "ktip"; ktip.hidden = true; document.body.appendChild(ktip);
  var ktipBtn = null;
  function showKTip(b) {
    var ids = b.dataset.kpin.split(","), k = KIDX[ids[0]]; if (!k) return; var it = IDX[k.id];
    ktipBtn = b; b.classList.add("on");
    if (ids.length > 1) {
      var ks = ids.map(function (x) { return KIDX[x]; }).filter(Boolean);
      ktip.innerHTML = '<div class="kh"><div><b>' + ks.length + ' keys in this building</b><small style="color:var(--dim)">Each one opens its own door</small></div></div><ul class="kl">' +
        ks.map(function (x) { return "<li" + (x.id === MV.focus ? ' class="on"' : "") + ">" + thumb(x.id) + "<div><b>" + esc(nm(x.id)) + "</b><span>" + esc(x.door) + "</span></div></li>"; }).join("") + '</ul><div class="kn">Open a key in the Keys tab for how to get it and what is inside.</div>';
    } else
    ktip.innerHTML = '<div class="kh">' + thumb(k.id) + "<div><b>" + esc(nm(k.id)) + '</b><small style="color:' + rcol(it && it.r) + '">' + esc((it && it.r) || "Rarity not published") + " key</small></div></div><dl><dt>Opens</dt><dd>" + esc(k.door) + "</dd><dt>Get it</dt><dd>" + esc(k.get) + "</dd>" + (k.loot ? "<dt>Inside</dt><dd>" + esc(k.loot) + "</dd>" : "") + '</dl><div class="kn">' + (k.pf ? "This pin marks where the code is found. Use it in the Gate Control Room." : (k.xp ? "This key opens several doors. Every pin with this key marks one of them" + (k.pin && k.pin[3] ? "." : " (by area, not the exact door).") : k.pin && k.pin[3] ? "The pin marks the door." : "The pin marks the building or area, not the exact door.")) + "</div>";
    ktip.hidden = false;
    var r = b.getBoundingClientRect(), w = ktip.offsetWidth, h = ktip.offsetHeight;
    var x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)), y = r.top - h - 8;
    if (y < 8) y = Math.min(innerHeight - h - 8, r.bottom + 8);
    ktip.style.left = x + "px"; ktip.style.top = y + "px";
  }
  function hideKTip() { ktip.hidden = true; if (ktipBtn) ktipBtn.classList.remove("on"); ktipBtn = null; }
  document.addEventListener("mouseover", function (e) { var b = e.target.closest && e.target.closest(".kpin"); if (b) showKTip(b); });
  document.addEventListener("mouseout", function (e) { if (e.target.closest && e.target.closest(".kpin")) hideKTip(); });
  document.addEventListener("focusin", function (e) { var b = e.target.closest && e.target.closest(".kpin"); if (b) showKTip(b); });
  document.addEventListener("focusout", function (e) { if (e.target.closest && e.target.closest(".kpin")) hideKTip(); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".kpin");
    if (b) { if (ktipBtn === b && !ktip.hidden && e.detail === 0) hideKTip(); else showKTip(b); return; }
    if (!ktip.hidden) hideKTip();
    var s = e.target.closest && e.target.closest("[data-kshow]"); if (s) showKeyOnMap(s.dataset.kshow);
    var f = e.target.closest && e.target.closest("[data-kfind]"); if (f) { kq = nm(f.dataset.kfind); kMap = "all"; $("#kq").value = kq; renderKeys(); go("keys"); }
  });
  window.addEventListener("scroll", hideKTip, { passive: true });
  function showKeyOnMap(id) {
    var k = KIDX[id]; if (!k) return;
    var mp = k.m === "any" ? curMap : k.m;
    if (k.pin && k.pin[0].indexOf("stella_") === 0) MV.layer = k.pin[0].slice(7);
    MV.focus = k.pin ? id : ""; MV.keys = true;
    curMap = mp; MV.z = 1; MV.x = 0; MV.y = 0; renderMapList(); renderMapDetail(); go("maps");
    setTimeout(function () {
      var box = $("#mview"); if (!box) return;
      var top = box.getBoundingClientRect().top + window.pageYOffset - Math.max(80, (innerHeight - box.offsetHeight) / 2);
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
      if (k.pin) {
        var d = MAPIMG[mapImgKey()], W = box.clientWidth, H = box.clientHeight;
        MV.z = 2.6; var s = Math.min(W / d.w, H / d.h) * MV.z;
        MV.x = W / 2 - k.pin[1] * s; MV.y = H / 2 - k.pin[2] * s; mvApply();
      }
      setTimeout(function () { MV.focus = ""; }, 100);
    }, 80);
  }
  var kMap = "all", kq = "";
  function renderKeyChips() {
    $("#kChips").innerHTML = ["all"].concat(KORDER).map(function (m) {
      var n = m === "all" ? KEYS.length : KEYS.filter(function (k) { return k.m === m; }).length;
      return '<button type="button" class="chip orb" data-kmap="' + m + '" aria-pressed="' + (kMap === m) + '">' + (m === "all" ? "All maps" : esc(KMAP[m])) + " (" + n + ")</button>";
    }).join("");
  }
  function renderKeys() {
    var q = kq.trim().toLowerCase();
    var arr = KEYS.filter(function (k) {
      if (kMap !== "all" && k.m !== kMap) return false;
      if (!q) return true;
      var hay = (nm(k.id) + " " + k.door + " " + KMAP[k.m]).toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
    });
    $("#kCount").textContent = arr.length + " of " + KEYS.length + " keys";
    $("#kList").innerHTML = arr.length ? arr.map(function (k) {
      var it = keyItem(k);
      return '<article class="panel imini kmini" style="--rc:' + rcol(it.r) + '">' + tile(it) +
        '<div class="info"><h3>' + esc(it.n) + '</h3><div class="row"><span class="pill">' + esc(KMAP[k.m]) + '</span><span class="pill r">' + esc(it.r || "Rarity not published") + "</span></div>" +
        '<p class="kdoor"><small>' + esc(t("Opens")) + "</small>" + esc(k.door) + "</p></div>" +
        '<span class="ihint" aria-hidden="true">' + esc(t("Details")) + '<svg viewBox="0 0 16 16"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9"/></svg></span>' +
        '<button type="button" class="iopen" data-kopen="' + k.id + '" aria-label="' + esc(it.n) + ": " + esc(t("details")) + '"></button>' +
        '<button type="button" class="addl iadd" data-add="' + k.id + '" title="' + esc(t("Add to shopping list")) + '" aria-label="' + esc(it.n) + ": " + esc(t("Add to shopping list")) + '">+</button></article>';
    }).join("") : '<div class="empty">No key matches that search.</div>';
  }
  function keyItem(k) { return IDX[k.id] || { id: k.id, n: nm(k.id), t: "Key", r: null, v: null }; }
  /* the details window for a key: the same window as items, with what it opens, how to get it and what is inside */
  function keyCard(k) {
    var it = keyItem(k), note = k.pf ? "The pin marks where the code is found. Use it in the Gate Control Room." : k.xp ? "This key opens several doors; each has its own pin on the map." : k.pin ? (k.pin[3] ? "The pin marks the door." : "The pin marks the building or area, not the exact door.") : k.m === "any" ? "" : "No map pin for this key yet.";
    return '<article class="panel item" style="--rc:' + rcol(it.r) + '"><div class="ihead">' + tile(it) +
      '<div class="info"><h3>' + esc(it.n) + '</h3><div class="row"><span class="pill">' + esc(KMAP[k.m]) + '</span><span class="pill r">' + esc(it.r || "Rarity not published") + "</span></div>" +
      (it.v != null ? '<div class="statline"><span><small>Value</small>' + fmt(it.v) + "</span></div>" : "") + "</div></div>" +
      '<div class="imore"><dl class="kv"><dt>' + esc(t("Opens")) + "</dt><dd>" + esc(k.door) + "</dd><dt>" + esc(t("Get it")) + "</dt><dd>" + esc(k.get) + "</dd>" + (k.loot ? "<dt>" + esc(t("Inside")) + "</dt><dd>" + esc(k.loot) + "</dd>" : "") + (note ? "<dt>" + esc(t("Map")) + "</dt><dd>" + esc(t(note)) + "</dd>" : "") + "</dl></div></article>";
  }
  function keyBar(k) {
    var n = needTotal(k.id), hasImg = !!MAPIMG[k.pin ? k.pin[0] : (k.m === "stella" ? "stella_u" : k.m)];
    return '<button type="button" class="btn go orb" data-add="' + k.id + '">' + esc(t("Add to shopping list")) + (n ? " <em>" + n + " " + esc(t("on list")) + "</em>" : "") + "</button>" +
      (k.pin ? '<button type="button" class="btn orb" data-kshow="' + k.id + '">' + esc(t("Show on map")) + "</button>" : hasImg && k.m !== "any" ? '<button type="button" class="btn orb" data-kshow="' + k.id + '">' + esc(t("Open map")) + "</button>" : "") +
      (IDX[k.id] ? '<button type="button" class="btn orb" data-kitem="' + k.id + '">' + esc(t("Item details")) + "</button>" : "");
  }
  $("#kList").addEventListener("click", function (e) { var b = e.target.closest("[data-kopen]"); if (b && KIDX[b.dataset.kopen]) dlgOpen(b.dataset.kopen, "key", keyCard(KIDX[b.dataset.kopen]), keyBar(KIDX[b.dataset.kopen]), b.closest(".imini")); });
  $("#kq").addEventListener("input", function () { kq = this.value; renderKeys(); });
  $("#kChips").addEventListener("click", function (e) { var b = e.target.closest("button[data-kmap]"); if (!b) return; kMap = b.dataset.kmap; renderKeyChips(); renderKeys(); });

