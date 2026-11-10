  /* ---------- sync with the desktop app (and other browsers): off until you turn it on with a sync code ----------
     The code stays in your browser. The sync service only gets a SHA-256 hash of it, used as the storage key
     (worker/sync.js). Synced: the shopping list, the route you send to the app, and the app's followed quests and keys. */
  var SYNC_API = /*SYNCAPI*/"";
  var SYNC_ABC = "0123456789ABCDEFGHJKMNPQRSTVWXYZ", syncBusy = false, syncApplying = false, syncT = null;
  function syncSt() { return store("rt-sync"); }
  function syncSave(s) { if (s) store("rt-sync", s); else { try { localStorage.removeItem("rt-sync"); } catch (e) {} } }
  function syncClean(text) {
    var c = String(text || "").toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^RTS/, "").replace(/O/g, "0").replace(/[IL]/g, "1");
    return c.length === 20 && c.split("").every(function (x) { return SYNC_ABC.indexOf(x) > -1; }) ? c : "";
  }
  function syncPretty(c) { return "RTS-" + c.match(/.{4}/g).join("-"); }
  function syncHash(c) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode("raidkits-sync:" + c)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join("");
    });
  }
  /* the list changed here: send it in a moment (called from saveShop) */
  function syncTouch(part) {
    var s = syncSt(); if (!s || syncApplying) return;
    s.t[part] = Date.now(); syncSave(s);
    clearTimeout(syncT); syncT = setTimeout(syncRun, 2500);
  }
  function syncLocal(p, s) { return p === "shop" ? { g: shop.g, have: shop.have } : p === "route" ? s.route || null : s.follow || null; }
  function syncApply(p, v, s) {
    if (p === "shop") {
      syncApplying = true;
      try { shop.g = (v && Array.isArray(v.g)) ? v.g : []; shop.have = (v && v.have) || {}; saveShop(); rerenderShopViews(); } finally { syncApplying = false; }
    } else s[p] = v;
  }
  function syncRun(force) {
    var s = syncSt(); if (!s || !s.id || !SYNC_API || syncBusy) return Promise.resolve();
    syncBusy = true;
    var url = SYNC_API + "/s/" + s.id;
    return fetch(url, { cache: "no-store" }).then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (remote) {
        s = syncSt(); if (!s) return;
        var push = false;
        ["shop", "route", "follow"].forEach(function (p) {
          var rt = remote ? +remote.t[p] || 0 : 0, lt = +s.t[p] || 0;
          if (remote && rt > lt) { syncApply(p, remote[p], s); s.t[p] = rt; }
          else if (lt > rt || (!remote && lt)) push = true;
        });
        if (!push && !force) { s.at = Date.now(); s.err = ""; syncSave(s); return; }
        var doc = { v: 1, t: s.t }; ["shop", "route", "follow"].forEach(function (p) { doc[p] = syncLocal(p, s); });
        return fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(doc) })
          .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); s.at = Date.now(); s.err = ""; syncSave(s); });
      })
      .catch(function () { var s2 = syncSt(); if (s2) { s2.err = t("Couldn't reach the sync service. It tries again by itself."); syncSave(s2); } })
      .then(function () { syncBusy = false; if ($("#syncBox") && !$("#syncBox").hidden) syncRender(); });
  }
  function syncCreate() {
    var b = new Uint8Array(20), c = ""; crypto.getRandomValues(b); for (var i = 0; i < 20; i++) c += SYNC_ABC[b[i] & 31];
    return syncHash(c).then(function (id) { var now = Date.now(); syncSave({ code: c, id: id, t: { shop: now, route: 0, follow: 0 } }); return syncRun(true); });
  }
  function syncConnect(text) {
    var c = syncClean(text);
    if (!c) return Promise.reject(new Error(t("That isn't a sync code. It looks like RTS-XXXX-XXXX-XXXX-XXXX-XXXX.")));
    return syncHash(c).then(function (id) {
      return fetch(SYNC_API + "/s/" + id, { cache: "no-store" }).then(function (r) {
        if (r.status === 404) throw new Error(t("Nothing is synced with that code yet. Check it, or create a new one."));
        if (!r.ok) throw new Error(t("Couldn't reach the sync service. Try again in a moment."));
        syncSave({ code: c, id: id, t: { shop: 0, route: 0, follow: 0 } }); return syncRun();
      });
    });
  }
  /* a route from the route planner: synced to the app when sync is on (otherwise the planner copies a link instead) */
  function syncSendRoute(r) { var s = syncSt(); if (!s) return false; s.route = r; s.t.route = Date.now(); syncSave(s); syncRun(); return true; }

  var syncUi = { show: false, msg: "", ok: false, wipe: false };
  function syncRender() {
    var box = $("#syncBox"), s = syncSt(); if (!box) return;
    var h = '<div class="panel shout sync"><div><b>' + esc(t("Sync with the desktop app")) + "</b><small>";
    if (!s) {
      h += esc(t("Keep this list the same here, in the Raider Toolkit Companion app and in other browsers. Routes you send with Send to app arrive in the app by themselves. Off until you turn it on.")) + "</small></div>" +
        '<div class="shinb"><button type="button" class="btn go orb sm" data-sync="new">' + esc(t("Create a code")) + "</button></div>" +
        '<div class="syncin"><input type="text" id="syncCode" placeholder="RTS-XXXX-XXXX-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false" aria-label="' + esc(t("Sync code from the app or another browser")) + '"><button type="button" class="btn orb sm" data-sync="join">' + esc(t("Connect")) + "</button></div>";
    } else {
      h += (s.err ? esc(s.err) : s.at ? esc(t("Synced")) + " " + esc(new Date(s.at).toLocaleTimeString()) + ". " + esc(t("Paste the code in the app under Settings → Sync. Anyone with it can see and change your synced list, so keep it to yourself.")) : esc(t("Syncing…"))) + "</small></div>" +
        '<span class="synccode">' + esc(syncUi.show ? syncPretty(s.code) : "RTS-••••-••••-••••-••••-" + s.code.slice(16)) + "</span>" +
        '<div class="shinb"><button type="button" class="x" data-sync="show">' + esc(t(syncUi.show ? "Hide" : "Show")) + '</button><button type="button" class="x" data-sync="copy">' + esc(t("Copy code")) + '</button><button type="button" class="x" data-sync="now">' + esc(t("Sync now")) + '</button><button type="button" class="x" data-sync="off">' + esc(t("Stop syncing here")) + '</button><button type="button" class="x" data-sync="wipe">' + esc(t(syncUi.wipe ? "Sure? Press again" : "Delete synced data")) + "</button></div>";
    }
    if (syncUi.msg) h += '<p class="' + (syncUi.ok ? "ok" : "err") + '" role="status" style="flex-basis:100%;margin:0">' + esc(syncUi.msg) + "</p>";
    h += '<p class="dim" style="flex-basis:100%;margin:0;font-size:.8rem">' + esc(t("The sync service gets a scrambled form of your code, never the code itself, and no name or account. A synced list is deleted after 180 days without changes.")) + ' <a href="#privacy">' + esc(t("Privacy policy")) + "</a></p></div>";
    box.innerHTML = h;
  }
  if ($("#shopSync")) $("#shopSync").addEventListener("click", function () { var b = $("#syncBox"); b.hidden = !b.hidden; this.setAttribute("aria-expanded", String(!b.hidden)); syncUi.msg = ""; if (!b.hidden) syncRender(); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-sync]"); if (!b) return;
    var a = b.dataset.sync, s = syncSt(); syncUi.msg = "";
    if (a !== "wipe") syncUi.wipe = false;
    if (a === "new" || a === "join") {
      b.disabled = true;
      (a === "new" ? syncCreate() : syncConnect(($("#syncCode") || {}).value)).then(function () {
        syncUi.ok = true; syncUi.show = a === "new"; syncUi.msg = a === "new" ? t("Sync is on. Now paste the code in the app: Settings → Sync.") : t("Connected. This list now comes from the synced copy."); syncRender();
      }, function (er) { syncUi.ok = false; syncUi.msg = er.message; syncRender(); });
      return;
    }
    if (!s) return;
    if (a === "show") syncUi.show = !syncUi.show;
    if (a === "copy") { copyText(syncPretty(s.code), function () {}); syncUi.ok = true; syncUi.msg = t("Code copied."); }
    if (a === "now") { syncRun(true); return; }
    if (a === "off") { syncSave(null); syncUi.ok = true; syncUi.msg = t("Sync is off in this browser. Your list stays here."); syncUi.show = false; }
    if (a === "wipe") {
      if (!syncUi.wipe) { syncUi.wipe = true; syncRender(); return; }
      syncUi.wipe = false;
      fetch(SYNC_API + "/s/" + s.id, { method: "DELETE" }).then(function (r) { if (!r.ok) throw 0; syncSave(null); syncUi.ok = true; syncUi.msg = t("The synced copy is deleted and sync is off."); syncRender(); },
        function () { syncUi.ok = false; syncUi.msg = t("Couldn't reach the sync service. Try again in a moment."); syncRender(); });
      return;
    }
    syncRender();
  });
  // check for changes from the app when the page opens, when you come back to the tab, and every minute while it is open
  if (syncSt()) syncRun();
  document.addEventListener("visibilitychange", function () { if (!document.hidden && syncSt()) syncRun(); });
  setInterval(function () { if (!document.hidden && syncSt()) syncRun(); }, 60000);
