/* The panel: your list, map conditions, search and settings. Opened with the keybind, the tray icon or by clicking the strip. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); }, esc = RT.esc;
  var tab = "list", view = $("view"), state = { q: "", sel: null, addQ: "", importOpen: false, importErr: "", capture: "", hkErr: "", doc: null, agree: false, drag: null };
  var ICON = {
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"></path></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
  };

  /* ---------- the condition banner (the map shown on the strip) ---------- */
  function banner() {
    var s = RT.settings(), c = RT.data() ? RT.condition(s.map, s.region) : null, now = Date.now();
    if (!c) { $("cond").innerHTML = '<span class="dot"></span><span class="grow"><small>' + esc(RT.mapName(s.map)) + "</small><strong>" + (RT.data() ? "No data for this map" : "Loading data…") + "</strong></span>"; return; }
    $("cond").innerHTML = '<span class="dot' + (c.cur ? " on" : "") + '"></span><span class="grow"><small>' + esc(RT.mapName(s.map)) + " · now</small><strong>" + esc(c.cur || "No condition") + "</strong></span>" +
      '<span class="t">' + (c.cur ? "<b>" + RT.clock(c.ends - now) + "</b>" : "") + "<small>" + (c.next ? "then " + esc(c.next) : "") + "</small></span>";
  }

  /* ---------- List ---------- */
  function catOf(it) {
    if (!it) return "Other";
    var f = String(it.f || "").split(/\s*,\s*/)[0];
    return f || (/ARC/.test(it.t || "") ? "ARC" : "Other");
  }
  function listView() {
    var l = RT.list(), ids = l.order.filter(function (id) { return l.items[id] && RT.item(id); }), p = RT.progress();
    var h = "";
    if (ids.length) {
      h += '<div class="row" style="min-height:auto;padding-top:10px"><span class="nm">' + p.done + " of " + p.total + " done" + (l.from ? ' <span class="dim">· ' + esc(l.from) + "</span>" : "") + "</span></div>";
      h += '<div class="bar"><i style="width:' + (p.total ? Math.round(p.done / p.total * 100) : 0) + '%"></i></div>';
    } else {
      h += '<p class="note" style="margin:12px 0 4px">Your list is empty. Paste a <b>Share list</b> link from raidkits.com, or add items below.</p>';
    }
    h += '<div style="display:flex;gap:8px;margin:10px 0 2px"><button type="button" class="btn' + (ids.length ? "" : " go") + '" data-act="import">Import from raidkits.com</button>' + (ids.length ? '<button type="button" class="btn" data-act="clear">Clear</button>' : "") + "</div>";
    if (state.importOpen) {
      h += '<div class="box"><label for="imp" class="note">On raidkits.com press <b>Share list</b>, copy the link and paste it here.</label><input type="text" id="imp" placeholder="https://raidkits.com/#list?share=…" autocomplete="off">' +
        '<div style="display:flex;gap:8px"><button type="button" class="btn go" data-act="imp-add">Add to my list</button><button type="button" class="btn" data-act="imp-rep">Replace my list</button></div>' +
        (state.importErr ? '<div class="err" role="alert">' + esc(state.importErr) + "</div>" : "") + "</div>";
    }
    // grouped by where you find them; finished ones at the bottom
    var groups = {}, order = [], done = [];
    ids.forEach(function (id) {
      var x = l.items[id]; if (x.have >= x.need) { done.push(id); return; }
      var c = catOf(RT.item(id)); if (!groups[c]) { groups[c] = []; order.push(c); } groups[c].push(id);
    });
    order.sort(function (a, b) { return groups[b].length - groups[a].length; });
    function row(id) {
      var x = l.items[id], it = RT.item(id), fin = x.have >= x.need;
      return '<div class="row' + (fin ? " done" : "") + '">' + RT.icon(id) + '<span class="nm" title="' + esc(it.n) + '">' + esc(it.n) + "</span>" +
        '<span class="qty"><button type="button" data-have="' + esc(id) + '" data-d="-1" aria-label="One less ' + esc(it.n) + '">−</button><span>' + x.have + " / " + x.need + '</span><button type="button" data-have="' + esc(id) + '" data-d="1" aria-label="One more ' + esc(it.n) + '">+</button></span>' +
        '<button type="button" class="ibtn" data-del="' + esc(id) + '" aria-label="Remove ' + esc(it.n) + '">' + ICON.x + "</button></div>";
    }
    order.forEach(function (c) { h += '<div class="h">' + esc(c) + "</div>" + groups[c].map(row).join(""); });
    if (done.length) h += '<div class="h">Done</div>' + done.map(row).join("");
    h += '<div class="h">Add an item</div><input type="search" id="addq" placeholder="Search items: Metal Parts, Toaster…" autocomplete="off" value="' + esc(state.addQ) + '"><div class="res" id="addres"></div>';
    return h;
  }
  function addResults() {
    var box = $("addres"); if (!box) return;
    var r = RT.search(state.addQ, 8).filter(function (x) { return x.kind === "item"; });
    box.innerHTML = r.map(function (x) { return '<button type="button" data-add="' + esc(x.x.id) + '">' + RT.icon(x.x.id) + "<span>" + esc(x.x.n) + '</span><span class="kind">+ add</span></button>'; }).join("") ||
      (state.addQ ? '<p class="note">No item by that name.</p>' : "");
  }

  /* ---------- Maps ---------- */
  function mapsView() {
    var s = RT.settings(), now = Date.now(), h = '<div class="h">Region</div><select id="region" aria-label="Server region">' +
      RT.REGIONS.map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === s.region ? " selected" : "") + ">" + r[1] + "</option>"; }).join("") + "</select>";
    h += '<div class="h">Now and next</div>';
    RT.MAP_ORDER.forEach(function (k) {
      var c = RT.condition(k, s.region, now); if (!c) return;
      h += '<div class="card' + (c.cur ? " on" : "") + '"><div class="top"><span class="dot' + (c.cur ? " on" : "") + '"></span><b>' + esc(RT.mapName(k)) + "</b>" +
        '<button type="button" class="star" data-map="' + k + '" aria-pressed="' + (s.map === k) + '" aria-label="Show ' + esc(RT.mapName(k)) + ' on the strip" title="Show on the strip">' + ICON.star + "</button></div>" +
        (c.cur ? '<div>' + esc(c.cur) + ' · ends in <span class="mono" style="color:var(--cyan)">' + RT.clock(c.ends - now) + "</span></div>" : '<div class="dim">No condition right now</div>') +
        (c.next ? '<div class="note">Next: ' + esc(c.next) + " at " + RT.localTime(c.at) + ' <span class="mono">(' + RT.clock(c.at - now) + ")</span></div>" : "") + "</div>";
    });
    h += '<p class="note">Worked out from the recorded rotation, like on raidkits.com. Usually right, but check the in-game map screen before you count on it.</p>';
    return h;
  }

  /* ---------- Search ---------- */
  function searchView() {
    if (state.sel) return detail(state.sel);
    return '<div style="padding-top:10px"><input type="search" id="q" placeholder="Search items, keys and quests…" autocomplete="off" value="' + esc(state.q) + '" aria-label="Search"></div><div class="res" id="qres"></div>';
  }
  function searchResults() {
    var box = $("qres"); if (!box) return;
    var r = RT.search(state.q, 30), K = { item: "", key: "Key", quest: "Quest" };
    box.innerHTML = r.map(function (x) {
      var sub = x.kind === "item" ? (x.x.r || "") + (x.x.v ? " · " + RT.fmt(x.x.v) : "") : x.kind === "key" ? "Key · " + (x.x.m || "") : "Quest · " + (x.x.tr || "");
      return '<button type="button" data-sel="' + x.kind + ":" + esc(x.x.id) + '">' + (x.kind === "quest" ? '<span class="icon" aria-hidden="true"></span>' : RT.icon(x.x.id)) + "<span>" + esc(x.x.n) + '</span><span class="kind">' + esc(sub) + "</span></button>";
    }).join("") || (state.q ? '<p class="note">Nothing matches that. Try a shorter name.</p>' : '<p class="note">Type to search every item, key and quest.</p>');
  }
  function kv(rows) { return '<dl class="kv">' + rows.filter(function (r) { return r[1]; }).map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>"; }
  function detail(sel) {
    var k = sel.split(":")[0], id = sel.slice(k.length + 1), D = RT.data(), h = '<button type="button" class="back" data-act="back">‹ Back to results</button><div class="detail">';
    var join = function (a) { return a ? a.map(function (x) { return x[1] + "× " + esc(x[0]); }).join(", ") : ""; };
    if (k === "item") {
      var it = RT.item(id); if (!it) return h + "</div>";
      h += '<div class="row">' + RT.icon(id) + "<h2>" + esc(it.n) + "</h2></div>";
      h += kv([["Value", RT.fmt(it.v)], ["Rarity", esc(it.r)], ["Type", esc(it.t)], ["Loot area", esc(it.f || "")], ["Recycles into", join(it.rc)],
        ["Crafted at", it.cb ? esc(it.cb) + (it.rp ? " from " + join(it.rp) : "") : ""], ["Needed for", it.ws ? it.ws.map(function (x) { return esc(x[0]) + " (" + x[1] + "×)"; }).join(", ") : ""],
        ["Quests", it.qs ? esc(it.qs.join(", ")) : ""], ["Where to find it", it.g ? esc(it.g) + (it.gm && it.gm.length ? '<br><span class="dim">' + esc(it.gm.join(", ")) + "</span>" : "") : ""]]);
      h += '<div style="display:flex;gap:8px;margin-top:14px"><button type="button" class="btn go" data-add="' + esc(id) + '">Add to my list</button><button type="button" class="btn" data-url="' + esc(RT.SITE + "#items?q=" + encodeURIComponent(it.n)) + '">Open on raidkits.com</button></div>';
    } else if (k === "key") {
      var key = (D.keys || []).filter(function (x) { return x.id === id; })[0]; if (!key) return h + "</div>";
      h += '<div class="row">' + RT.icon(id) + "<h2>" + esc(key.n) + "</h2></div>" + kv([["Map", esc(key.m)], ["Opens", esc(key.door)], ["How to get it", esc(key.get || "")], ["Inside", esc(key.loot || "")]]);
    } else {
      var q = (D.quests || []).filter(function (x) { return x.id === id; })[0]; if (!q) return h + "</div>";
      h += "<h2>" + esc(q.n) + "</h2>" + kv([["Trader", esc(q.tr)], ["Maps", esc((q.m || []).join(", "))], ["Objectives", (q.o || []).map(esc).join("<br>")], ["Hand in", join(q.g)], ["Rewards", join(q.r)]]);
    }
    return h + "</div>";
  }

  /* ---------- Settings ---------- */
  var SPOTS = [["tl", "Top left"], ["tc", "Top centre"], ["tr", "Top right"], ["ml", "Left"], ["", ""], ["mr", "Right"], ["bl", "Bottom left"], ["bc", "Bottom centre"], ["br", "Bottom right"]];
  var SPOT_POS = { tl: { x: 0.012, y: 0.1 }, tc: { x: 0, y: 0.1 }, tr: { x: 0.012, y: 0.1 }, ml: { x: 0.012, y: 0 }, mr: { x: 0.012, y: 0 }, bl: { x: 0.012, y: 0.24 }, bc: { x: 0, y: 0.16 }, br: { x: 0.012, y: 0.24 } };
  var LEGAL = [["EULA.txt", "Licence agreement and terms of use"], ["PRIVACY.txt", "Privacy policy"], ["SAFETY.txt", "What the app does and doesn't do"], ["THIRD-PARTY-NOTICES.txt", "Third-party notices"], ["LICENSE.txt", "Source code licence (MIT)"]];
  function hkRow(key, label) {
    var s = RT.settings(), v = s[key];
    return '<div class="row" style="flex-wrap:wrap"><span class="nm" style="white-space:normal">' + esc(label) + "<br>" +
      (state.capture === key ? '<span class="dim">Press the keys you want…</span>' : v ? '<span class="kbd">' + esc(v) + "</span>" : '<span class="dim">Off</span>') + "</span>" +
      (state.capture === key ? '<button type="button" class="btn" data-act="hk-cancel">Cancel</button>'
        : '<button type="button" class="btn" data-hk="' + key + '">Change</button>' + (v ? '<button type="button" class="btn" data-hkoff="' + key + '">Turn off</button>' : "")) + "</div>";
  }
  function settingsView() {
    if (state.doc) return '<button type="button" class="back" data-act="doc-back">‹ Back to settings</button><pre class="doc" id="doc">Loading…</pre>';
    var s = RT.settings(), D = RT.data(), err = state.hkErr || JSON.parse(localStorage.getItem("rtc-hotkey-err") || '""');
    var h = '<div class="h">Overlay</div>';
    h += '<label class="chk"><input type="checkbox" data-set="overlay"' + (s.overlay ? " checked" : "") + "> Show the overlay in game</label>";
    h += '<div class="seg2" role="group" aria-label="Overlay style"><button type="button" data-style="stack" aria-pressed="' + (s.style !== "line") + '">Stacked</button><button type="button" data-style="line" aria-pressed="' + (s.style === "line") + '">One line</button></div>';
    h += '<div class="note" style="margin-top:10px">What it shows, in this order. Drag the handle to move a part; the overlay updates as you go.</div><ul class="arr" id="arr">' +
      s.order.map(function (k, i) {
        return '<li data-k="' + k + '"><span class="grip" title="Drag to move" aria-hidden="true"><i></i></span><label class="chk"><input type="checkbox" data-part="' + k + '"' + (s.parts[k] ? " checked" : "") + "> " + esc(RT.SECTIONS[k]) + "</label>" +
          '<button type="button" class="mv" data-mv="' + k + '" data-d="-1" aria-label="Move ' + esc(RT.SECTIONS[k]) + ' up"' + (i ? "" : " disabled") + '>↑</button><button type="button" class="mv" data-mv="' + k + '" data-d="1" aria-label="Move ' + esc(RT.SECTIONS[k]) + ' down"' + (i < s.order.length - 1 ? "" : " disabled") + ">↓</button></li>";
      }).join("") + "</ul>";
    h += '<label for="size" class="note">Size <b id="sizev">' + Math.round(s.size * 100) + '%</b> <span class="dim">(also follows your screen height)</span></label><input type="range" id="size" min="0.7" max="1.6" step="0.05" value="' + s.size + '">';
    h += '<label for="bg" class="note">Opacity <b id="bgv">' + Math.round(s.bg * 100) + '%</b></label><input type="range" id="bg" min="0.3" max="1" step="0.05" value="' + s.bg + '">';
    h += '<div class="note" style="margin-top:8px">Where it sits</div><div class="spots">' + SPOTS.map(function (x) {
      return x[0] ? '<button type="button" data-spot="' + x[0] + '" aria-pressed="' + (s.pos.a === x[0]) + '" aria-label="' + x[1] + '" title="' + x[1] + '"><i></i></button>' : "<span></span>";
    }).join("") + '</div><p class="note">Or drag it while this panel is open. Its spot is kept as a share of the screen, so it stays put at any resolution or screen shape. Use the game in Borderless or Windowed mode so the overlay can show on top.</p>';
    h += '<div class="h">Panel</div><label for="pbg" class="note">Opacity <b id="pbgv">' + Math.round(s.panelBg * 100) + '%</b></label><input type="range" id="pbg" min="0.6" max="1" step="0.05" value="' + s.panelBg + '">';
    h += '<div class="h">Keybinds</div>' + hkRow("hotkey", "Open or close this panel") + hkRow("hotkeyOverlay", "Show or hide the overlay");
    if (err) h += '<p class="err" role="alert">Couldn\'t use ' + esc(err) + ". Another program may already use it; pick a different one.</p>";
    h += '<p class="note">Use Ctrl, Alt or Shift with a key, or an F key. They use the same standard Windows shortcut feature as Discord and Steam. The tray icon (bottom right of the taskbar) also opens the panel, shows or hides the overlay, and quits.</p>';
    h += '<div class="h">Data</div><p class="note">' + (D ? "From raidkits.com · patch " + esc(D.patch) + " · updated " + esc(D.built) : "Not loaded yet.") + '</p><button type="button" class="btn" data-act="refresh">Update now</button>';
    h += '<div class="h">About</div><p class="note">Raider Toolkit Companion is an unofficial fan app, not affiliated with or endorsed by Embark Studios. ARC Raiders and its names and art belong to Embark Studios AB.</p>' +
      '<p class="note">It is an ordinary window. It never reads, changes or connects to the game: no game files, memory, screen capture, injected code or simulated input. Everything it shows comes from raidkits.com and what you type in. Embark decides which programs are allowed with their game, so use it at your own risk.</p>';
    h += '<div class="h">Legal</div><div class="res">' + LEGAL.map(function (x) { return '<button type="button" data-doc="' + x[0] + '"><span>' + esc(x[1]) + '</span><span class="kind">' + esc(x[0]) + "</span></button>"; }).join("") + "</div>";
    var acc = RT.acceptedAt();
    if (acc) h += '<p class="note">You accepted these on ' + esc(new Date(acc).toLocaleDateString()) + ".</p>";
    h += '<p class="note">The same files are in the app\'s install folder, under legal. <button type="button" class="link" data-url="' + RT.SITE + '">raidkits.com</button> · <button type="button" class="link" data-url="https://discord.gg/NE3ughZTxn">Discord</button> · version 0.1.0</p>';
    return h;
  }

  /* ---------- first start: read and accept the documents ---------- */
  function agreementView() {
    if (state.doc) return '<button type="button" class="back" data-act="doc-back">‹ Back</button><pre class="doc" id="doc">Loading…</pre>';
    return '<div class="gate"><h1>Before you start</h1>' +
      '<p class="note">Raider Toolkit Companion is a free, unofficial fan app for ARC Raiders, not affiliated with Embark Studios. It is an ordinary window that never reads, changes or connects to the game. Please read these first:</p>' +
      '<div class="res">' + LEGAL.slice(0, 3).map(function (x) { return '<button type="button" data-doc="' + x[0] + '"><span>' + esc(x[1]) + '</span><span class="kind">Read ›</span></button>'; }).join("") + "</div>" +
      '<label class="chk agree"><input type="checkbox" id="agree"' + (state.agree ? " checked" : "") + "> <span>I have read and accept the <b>Licence agreement and terms of use</b>, and I have read the <b>Privacy policy</b>.</span></label>" +
      '<div style="display:flex;gap:8px;margin-top:6px"><button type="button" class="btn go" data-act="accept"' + (state.agree ? "" : " disabled") + '>Accept and start</button><button type="button" class="btn" data-act="decline">Decline and quit</button></div>' +
      '<p class="note">You can read them again any time in Settings → Legal, and in the app\'s install folder (the legal folder).</p></div>';
  }

  /* ---------- drawing and events ---------- */
  function render(keepFocus) {
    var f = keepFocus && document.activeElement && document.activeElement.id, pos = f && document.activeElement.selectionStart;
    var top = view.scrollTop, ok = RT.accepted();
    document.body.classList.toggle("gate", !ok);
    document.documentElement.style.setProperty("--pbg", RT.settings().panelBg);
    if (!ok) { view.innerHTML = agreementView(); if (f && $(f)) $(f).focus(); return; }
    banner();
    Array.prototype.forEach.call(document.querySelectorAll("nav [data-tab]"), function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === tab)); });
    view.innerHTML = !RT.data() ? '<p class="note" style="margin-top:14px">Loading data from raidkits.com… If this takes long, check your internet connection.</p>'
      : tab === "list" ? listView() : tab === "maps" ? mapsView() : tab === "search" ? searchView() : settingsView();
    if (tab === "list") addResults();
    if (tab === "search" && !state.sel) searchResults();
    view.scrollTop = top;
    if (f && $(f)) { $(f).focus(); try { $(f).setSelectionRange(pos, pos); } catch (e) {} }
  }

  document.querySelector("nav").addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]"); if (!b) return;
    tab = b.dataset.tab; state.capture = ""; state.doc = null; view.scrollTop = 0; render();
    if (tab === "search" && !state.sel && $("q")) $("q").focus();
  });
  $("hide").addEventListener("click", function () { RT.invoke("toggle_panel"); });   // hides it, and tells the overlay it can't be moved any more

  view.addEventListener("click", function (e) {
    var t = e.target.closest("button"); if (!t) return;
    var d = t.dataset;
    if (d.have) { var l = RT.list(), x = l.items[d.have]; if (x) RT.setHave(d.have, x.have + (+d.d)); render(); return; }
    if (d.del) { RT.removeItem(d.del); render(); return; }
    if (d.add) { RT.addItem(d.add, 1); if (tab === "search") { t.textContent = "Added ✓"; } else { state.addQ = ""; render(); } return; }
    if (d.map) { RT.setSetting("map", d.map); render(); return; }
    if (d.sel) { state.sel = d.sel; render(); view.scrollTop = 0; return; }
    if (d.url) { RT.openUrl(d.url); return; }
    if (d.mv) { var o = RT.settings().order, i = o.indexOf(d.mv), j = i + (+d.d); if (j >= 0 && j < o.length) { o.splice(j, 0, o.splice(i, 1)[0]); RT.setSetting("order", o); render(); var nb = view.querySelector('[data-mv="' + d.mv + '"][data-d="' + d.d + '"]'); if (nb && !nb.disabled) nb.focus(); } return; }
    if (d.style) { RT.setSetting("style", d.style); render(); return; }
    if (d.spot) { var sp = SPOT_POS[d.spot]; RT.setSetting("pos", { a: d.spot, x: sp.x, y: sp.y }); render(); return; }
    if (d.hk) { state.capture = d.hk; state.hkErr = ""; render(); return; }
    if (d.hkoff) { setHotkey(d.hkoff, ""); return; }
    if (d.doc) { state.doc = d.doc; render(); view.scrollTop = 0; fetch("legal/" + d.doc).then(function (r) { return r.text(); }).then(function (t) { var el = $("doc"); if (el) el.textContent = t; }, function () { var el = $("doc"); if (el) el.textContent = "Couldn't open this file. It is also in the app's install folder, under legal."; }); return; }
    switch (d.act) {
      case "doc-back": state.doc = null; render(); break;
      case "accept": if (state.agree) { RT.accept(); state.doc = null; tab = "list"; render(); } break;
      case "decline": RT.invoke("quit_app"); break;
      case "import": state.importOpen = !state.importOpen; state.importErr = ""; render(); if ($("imp")) $("imp").focus(); break;
      case "imp-add": case "imp-rep":
        RT.importShare($("imp").value, d.act === "imp-rep").then(function (n) { state.importOpen = false; state.importErr = ""; render(); },
          function (er) { state.importErr = er.message; render(); });
        break;
      case "clear": RT.saveList({ v: 1, items: {}, order: [], from: "" }); render(); break;
      case "back": state.sel = null; render(); if ($("q")) $("q").focus(); break;
      case "hk-cancel": state.capture = ""; render(); break;
      case "refresh": t.disabled = true; t.textContent = "Updating…"; RT.load(true).then(function () { render(); }, function () { t.textContent = "Couldn't reach raidkits.com"; }); break;
    }
  });
  view.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "addq") { state.addQ = t.value; addResults(); }
    if (t.id === "q") { state.q = t.value; searchResults(); }
    if (t.id === "size") { RT.setSetting("size", +t.value); $("sizev").textContent = Math.round(t.value * 100) + "%"; }
    if (t.id === "pbg") { RT.setSetting("panelBg", +t.value); $("pbgv").textContent = Math.round(t.value * 100) + "%"; document.documentElement.style.setProperty("--pbg", +t.value); }
    if (t.id === "bg") { RT.setSetting("bg", +t.value); $("bgv").textContent = Math.round(t.value * 100) + "%"; }
  });
  view.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "region") { RT.setSetting("region", t.value); render(); }
    if (t.id === "agree") { state.agree = t.checked; render(); return; }
    if (t.dataset.set === "overlay") { RT.setSetting("overlay", t.checked); RT.invoke("show_overlay", { show: t.checked }); }
    if (t.dataset.part) { var s = RT.settings(); s.parts[t.dataset.part] = t.checked; RT.setSetting("parts", s.parts); }
  });

  // keybind capture: modifiers + one key, written the way Windows hotkeys are registered (e.g. Ctrl+Shift+Space)
  function keyName(e) {
    var c = e.code;
    if (/^Key[A-Z]$/.test(c)) return c.slice(3);
    if (/^Digit[0-9]$/.test(c)) return c.slice(5);
    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(c)) return c;
    return { Space: "Space", Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Backslash: "\\", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/",
      Insert: "Insert", Delete: "Delete", Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown" }[c] || "";
  }
  function setHotkey(key, accel) {
    var s = RT.settings(), next = { hotkey: s.hotkey, hotkeyOverlay: s.hotkeyOverlay }; next[key] = accel;
    if (accel && next.hotkey === next.hotkeyOverlay) { state.hkErr = accel + " (it is already your other keybind)"; state.capture = ""; render(); return; }
    RT.invoke("set_hotkeys", { panel: next.hotkey || "", overlay: next.hotkeyOverlay || "" }).then(function (failed) {
      failed = failed || [];
      if (failed.indexOf(accel) > -1) { state.hkErr = accel; RT.invoke("set_hotkeys", { panel: s.hotkey || "", overlay: s.hotkeyOverlay || "" }); }
      else { RT.setSetting(key, accel); state.hkErr = ""; localStorage.removeItem("rtc-hotkey-err"); }
      state.capture = ""; render();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (!state.capture) { if (e.key === "Escape" && (state.sel || state.doc)) { state.sel = null; state.doc = null; render(); } return; }
    e.preventDefault();
    if (e.key === "Escape") { state.capture = ""; render(); return; }
    var k = keyName(e); if (!k) return;
    var mods = (e.ctrlKey ? "Ctrl+" : "") + (e.altKey ? "Alt+" : "") + (e.shiftKey ? "Shift+" : "");
    if (!mods && !/^F\d+$/.test(k)) { state.hkErr = k + " on its own (add Ctrl, Alt or Shift, or use an F key)"; render(); return; }
    setHotkey(state.capture, mods + k);
  });

  /* drag to arrange: hold the handle and move the row up or down */
  view.addEventListener("pointerdown", function (e) {
    var g = e.target.closest(".grip"); if (!g) return;
    e.preventDefault();
    state.drag = g.closest("li"); state.drag.classList.add("dragging"); g.setPointerCapture(e.pointerId);
  });
  view.addEventListener("pointermove", function (e) {
    if (!state.drag) return;
    var list = $("arr"), rows = Array.prototype.slice.call(list.children);
    var over = rows.filter(function (r) { var b = r.getBoundingClientRect(); return e.clientY >= b.top && e.clientY <= b.bottom; })[0];
    if (!over || over === state.drag) return;
    var b = over.getBoundingClientRect(), after = e.clientY > b.top + b.height / 2;
    list.insertBefore(state.drag, after ? over.nextSibling : over);
  });
  function dragEnd() {
    if (!state.drag) return;
    state.drag.classList.remove("dragging"); state.drag = null;
    RT.setSetting("order", Array.prototype.map.call($("arr").children, function (r) { return r.dataset.k; }));
    render();
  }
  view.addEventListener("pointerup", dragEnd);
  view.addEventListener("pointercancel", dragEnd);

  window.addEventListener("storage", function () {
    if (state.drag) return; if (!document.activeElement || !/^(q|addq|imp)$/.test(document.activeElement.id)) render(); else banner(); });
  render();
  setInterval(function () { if (tab === "maps") render(true); else banner(); }, 1000);
  RT.load().then(function () { render(); }, function () { render(); });
})();
