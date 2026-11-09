  /* ---------- ARCTracker connection (optional) ---------- */
  var HOUR = 3600000, ARC_MANUAL = 2;
  var arc = store("rt-arc") || {};
  function arcOn() { return !!(ARC_PROXY && arc.key); }
  var ARC_APP_URL = "https://arctracker.io/app#download";
  function arcNoData() { return arcOn() && !!arc.at && !arc.err && !arc.n && !arc.miss; }
  function arcSave() { store("rt-arc", { key: arc.key, qc: arc.qc, missN: arc.missN, pn: arc.pn, pl: arc.pl, xf: arc.xf, xc: arc.xc, xn: arc.xn, stash: arc.stash, bp: arc.bp, qd: arc.qd, ids: arc.ids, n: arc.n, nd: arc.nd, miss: arc.miss, lv: arc.lv, at: arc.at, last: arc.last, man: arc.man, err: arc.err }); }
  function arcBpMissing(id) { return arcOn() && !!arc.bp && !arc.bp[id] && !arc.bp[id + "_blueprint"]; }
  function questsFor(ids) {
    var out = [], seen = {};
    ids.forEach(function (id) { ((DB.qr || {})[id] || []).forEach(function (q) { if (!seen[q.id]) { seen[q.id] = 1; out.push(q); } }); });
    return out;
  }
  function questLine(ids, what) {
    var qs = questsFor(ids); if (!qs.length) return "";
    return '<div class="qline">' + esc(what) + " is a reward from " + qs.map(function (q) {
      var st = arcOn() && arc.qd ? (arc.qd[arcNorm(q.id)] || arc.qd[arcNorm(q.n)] ? ' <span class="qdone">done</span>' : ' <span class="qopen">not done yet</span>') : "";
      return "the quest <b>" + esc(q.n) + "</b>" + st;
    }).join(" and ") + ".</div>";
  }
  function bpMissBox(name, loc, qids) {
    return '<div class="bpmiss"><b>Blueprint not learned yet</b><span>The materials are left out until you have it.</span><span><em>Where to find it:</em> ' + esc(loc && loc[0] ? loc[0] : "No location is listed in the guides used here.") + "</span>" + questLine(qids, name + " blueprint") + "</div>";
  }
  function arcHas(id) { return arcOn() && arc.stash && (arc.stash[id] || 0) > 0; }
  function arcTier(w) { if (!arcOn() || !arc.at || arcNoData()) return -1; var t = 0; (w.tiers || []).forEach(function (id, i) { if (arcHas(id)) t = i + 1; }); return t; }
  function arcNorm(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
  var ARC_NAMES = null;
  function arcByName(n) { if (!ARC_NAMES) { ARC_NAMES = {}; ITEMS.forEach(function (i) { ARC_NAMES[arcNorm(i.n)] = i.id; }); } return ARC_NAMES[arcNorm(n)]; }
  /* ARCTracker does not publish its response shapes, so lists are found wherever they are: plain arrays, {data: [...]},
     groups like {weapons: [...], mods: [...]} or maps like {gunsmith: {level: 2}, outpost: 3} */
  function arcList(j, d) {
    d = d || 0;
    if (Array.isArray(j)) return j; if (!j || typeof j !== "object" || d > 4) return [];
    var c = [j.items, j.data, j.stash, j.modules, j.hideout, j.blueprints, j.quests, j.results, j.entries];
    for (var i = 0; i < c.length; i++) if (Array.isArray(c[i])) return c[i];
    if (j.data && typeof j.data === "object") { var x = arcList(j.data, d + 1); if (x.length) return x; }
    var out = [];
    Object.keys(j).forEach(function (k) {
      if (/^(meta|pagination|links|summary|counts?|total|stats)$/i.test(k)) return;
      var v = j[k];
      if (Array.isArray(v)) v.forEach(function (o) { if (o && typeof o === "object") { if (o._group == null) o._group = k; out.push(o); } else if (typeof o === "string") out.push({ id: o, _group: k }); });
      else if (v && typeof v === "object") {
        if (arcLevel(v) != null || v.quantity != null) { var o = { id: k }; Object.keys(v).forEach(function (q) { o[q] = v[q]; }); out.push(o); }
        else arcList(v, d + 1).forEach(function (o) { if (o._group == null) o._group = k; out.push(o); });
      } else if (typeof v === "number") out.push({ id: k, level: v, quantity: v });
    });
    return out;
  }
  /* finds a level for a key that matches re (outpost, research) anywhere in a response */
  function arcFindLevel(objs, re) {
    var found = null;
    function walk(o, d) {
      if (found != null || !o || typeof o !== "object" || d > 6) return;
      if (Array.isArray(o)) { o.forEach(function (x) { if (x && typeof x === "object" && found == null) { var nmx = arcNorm(x.id || x.module_id || x.moduleId || x.slug || x.name || x.type || ""); if (re.test(nmx)) { var L = arcLevel(x); if (L == null && Array.isArray(x.rooms)) L = x.rooms.length; if (L != null && !isNaN(L)) { found = L; return; } } walk(x, d + 1); } }); return; }
      Object.keys(o).forEach(function (k) {
        if (found != null) return;
        var v = o[k];
        if (re.test(k.toLowerCase()) && !/xp|progress|max|next|cost|slot|unlock|require/i.test(k)) {
          if (typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v))) { found = parseInt(v, 10); return; }
          if (Array.isArray(v) && /rooms?$/i.test(k)) { found = v.length; return; }
          if (v && typeof v === "object" && !Array.isArray(v)) { var L = arcLevel(v); if (L == null && Array.isArray(v.rooms)) L = v.rooms.length; if (L != null && !isNaN(L)) { found = L; return; } }
        }
        walk(v, d + 1);
      });
    }
    objs.forEach(function (o) { walk(o, 0); });
    return found;
  }
  /* the raider level: prefers fields that say raider, player or game over a site or account level */
  function arcProfileLevel(j) {
    var best = null;
    function walk(o, path, d) {
      if (!o || typeof o !== "object" || d > 6) return;
      Object.keys(o).forEach(function (k) {
        var v = o[k], p = path + "/" + k.toLowerCase();
        if (v && typeof v === "object") { walk(v, p, d + 1); return; }
        if (!/level|lvl/i.test(k) || /xp|exp|progress|next|max|min|trader|station|module|hideout|bench|quest|outpost|research|skill|tier|cap/i.test(k)) return;
        var n = parseInt(v, 10); if (isNaN(n) || n < 0 || n > 999) return;
        var sc = /raider|player|game|character|embark|season/.test(p) ? 2 : /account|site|tracker|member|community|badge|prestige|vip|profile_level/.test(p) ? 0 : 1;
        if (!best || sc > best.sc || (sc === best.sc && n > best.n)) best = { sc: sc, n: n };
      });
    }
    walk(j, "", 0);
    return best ? best.n : null;
  }
  var arcRaw = null;
  function arcReport() {
    function red(o, d, lim) {
      if (d > 7) return "…";
      if (Array.isArray(o)) { var a = o.slice(0, lim).map(function (x) { return red(x, d + 1, lim); }); if (o.length > lim) a.push("… " + o.length + " entries in total"); return a; }
      if (o && typeof o === "object") { var r = {}; Object.keys(o).forEach(function (k) { r[k] = /mail|token|key|secret|pass|auth|session|ip_?addr/i.test(k) ? "[hidden]" : red(o[k], d + 1, lim); }); return r; }
      if (typeof o === "string" && o.length > 80) return o.slice(0, 80) + "…";
      return o;
    }
    var names = ["stash", "hideout", "blueprints", "quests", "profile"], raw = {};
    names.forEach(function (n, i) { raw[n] = arcRaw ? red(arcRaw[i], 0, n === "hideout" || n === "profile" ? 40 : 3) : null; });
    var rep = { site: location.host, at: new Date().toISOString(), read: { items: arc.n, notRecognised: arc.miss, notRecognisedNames: arc.missN, stations: arc.lv, raiderLevel: arc.pl, xp: arc.xf != null ? { progress: arc.xf, inLevel: arc.xc, forLevel: arc.xn } : null, blueprints: arc.bp ? Object.keys(arc.bp).length : null, quests: arc.qd ? Object.keys(arc.qd).length : null, stationLevels: ws.cur }, raw: raw };
    return JSON.stringify(rep, null, 1).slice(0, 15000);
  }
  function copyText(txt, done) {
    function fb() { var ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); done(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fb); else fb();
  }
  function arcItemId(o) {
    var it = o.item || {}, c = [o.item_id, o.itemId, o.slug, o.id, it.id, it.item_id, it.slug];
    for (var i = 0; i < c.length; i++) { var k = arcNorm(c[i]); if (k && IDX[k]) return k; }
    return arcByName(o.name || it.name || o.item_name || o.itemName);
  }
  function arcQty(o) { var q = [o.quantity, o.qty, o.amount, o.count, o.stack, o.stackSize].filter(function (x) { return x != null; })[0]; return Math.max(0, parseInt(q == null ? 1 : q, 10) || 0); }
  var ARC_ST = { outpost: ["outpost", "shelter", "sheltered_retreat", "raider_outpost", "home_base", "outpost_rooms", "rooms"], research: ["research", "research_station", "research_bench", "research_lab"], weapon_bench: ["gunsmith", "weapon_bench", "weapons_bench"], equipment_bench: ["gear_bench", "equipment_bench"], med_station: ["medical_lab", "med_station", "medical_station", "med_lab"], utility_bench: ["utility_station", "utility_bench"], explosives_bench: ["explosives_station", "explosives_bench", "explosive_station"], refiner: ["refiner", "refinery"], scrappy: ["scrappy"] };
  function arcStation(o) {
    var c = [o.module_id, o.moduleId, o.hideout_id, o.hideoutId, o.station_id, o.stationId, o.slug, o.id, o.key, o.type, o.name, o.module && o.module.id, o.module && o.module.name];
    for (var i = 0; i < c.length; i++) {
      var k = arcNorm(c[i]); if (!k) continue;
      var s = STATIONS.filter(function (x) { return x.id === k || arcNorm(x.n) === k || arcNorm(sname(x)) === k || (ARC_ST[x.id] || []).indexOf(k) > -1; })[0];
      if (!s && /outpost/.test(k)) s = STATIONS.filter(function (x) { return x.id === "outpost"; })[0];
      if (!s && /research/.test(k)) s = STATIONS.filter(function (x) { return x.id === "research"; })[0];
      if (s) return s;
    }
    return null;
  }
  function arcLevel(o) { var l = [o.level, o.current_level, o.currentLevel, o.lvl, o.tier].filter(function (x) { return x != null; })[0]; return l == null ? null : parseInt(l, 10); }
  function arcGet(path) {
    return fetch(ARC_PROXY.replace(/\/+$/, "") + path, { headers: { Authorization: "Bearer " + arc.key } }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "ARCTracker did not accept this key. Check that it has stash and hideout read access." : r.status === 429 ? "ARCTracker is busy right now. It will try again at the next sync." : (j && (j.error || j.message)) || "ARCTracker returned an error (" + r.status + ").");
        return j;
      });
    });
  }
  function arcManual() { var now = Date.now(); arc.man = (arc.man || []).filter(function (t) { return now - t < HOUR; }); return arc.man; }
  function arcManualLeft() { return ARC_MANUAL - arcManual().length; }
  function arcManualWait() { var m = arcManual(); return m.length < ARC_MANUAL ? 0 : Math.min(HOUR, m[0] + HOUR - Date.now()) / 1000; }
  function arcAutoIn() { return arc.last ? Math.min(HOUR, arc.last + HOUR - Date.now()) / 1000 : 0; }
  var arcBusy = false;
  function arcSync(kind) {
    if (!arcOn() || arcBusy) return;
    if (kind === "manual") { if (arcManualLeft() <= 0) return; arc.man.push(Date.now()); }
    arcBusy = true; arc.last = Date.now(); arcSave(); renderArc();
    Promise.all([arcGet("/stash"), arcGet("/hideout").catch(function () { return null; }), arcGet("/blueprints").catch(function () { return null; }), arcGet("/quests").catch(function () { return null; }), arcGet("/profile").catch(function () { return null; })]).then(function (res) {
      arcRaw = res;
      var st = {}, miss = 0, lv = 0;
      var raw = arcList(res[0]), hl = res[1] ? arcList(res[1]) : [], nbp = res[2] ? arcList(res[2]).length : 0, nq = res[3] ? arcList(res[3]).length : 0;
      var missN = [];
      raw.forEach(function (o) { var id = arcItemId(o); if (!id) { miss++; var mn = o.name || o.itemName || o.item_name || o.itemId || o.item_id; if (mn && missN.indexOf(mn) < 0) missN.push(String(mn)); return; } st[id] = (st[id] || 0) + arcQty(o); });
      var nd = !raw.length;
      if (!nd) {
        (arc.ids || []).forEach(function (k) { if (!(k in st)) { ws.have[k] = 0; shop.have[k] = 0; } });
        Object.keys(st).forEach(function (k) { ws.have[k] = st[k]; shop.have[k] = st[k]; });
      }
      var stSeen = {};
      function setSt(s, L) { if (stSeen[s.id]) return; stSeen[s.id] = 1; ws.cur[s.id] = Math.max(0, Math.min(s.max, L)); if ((ws.goal[s.id] || 0) < ws.cur[s.id]) ws.goal[s.id] = ws.cur[s.id]; lv++; }
      (nd ? [] : hl).forEach(function (o) {
        var s = arcStation(o), L = arcLevel(o); if (s && L == null && Array.isArray(o.rooms)) L = o.rooms.length;
        if (!s || L == null || isNaN(L)) return; setSt(s, L);
      });
      if (!nd) [["outpost", /outpost/], ["research", /research/]].forEach(function (p) {
        var s = STATIONS.filter(function (x) { return x.id === p[0]; })[0]; if (!s || stSeen[s.id]) return;
        var L = arcFindLevel([res[1], res[4]], p[1]); if (L != null && !isNaN(L)) setSt(s, L);
      });
      if (res[2]) { var bp = {}; arcList(res[2]).forEach(function (o) {
        if (o.learned === false || o.unlocked === false || o.owned === false || o.is_learned === false || o.isLearned === false) return;
        if (/missing|unlearned|not_?learned|locked/i.test(String(o._group || "")) || /^(missing|locked|unlearned|not_?learned)$/i.test(String(o.status || o.state || ""))) return;
        var it = o.item || o.blueprint || {}, c = [o.item_id, o.itemId, o.blueprint_id, o.blueprintId, o.slug, o.id, it.id, it.item_id, it.slug];
        var k = ""; for (var i = 0; i < c.length; i++) { k = arcNorm(c[i]); if (k) break; }
        if (!k) k = arcByName(o.name || it.name) || ""; if (!k) return;
        bp[k] = 1; bp[k.replace(/_blueprint$/, "")] = 1;
        var tg = arcNorm(o.targetItemId || o.target_item_id || o.itemId || ""); if (tg) bp[tg] = 1;
      }); arc.bp = bp; } else arc.bp = null;
      if (res[3]) { var qd = {}, qc = 0; arcList(res[3]).forEach(function (o) {
        var done = o.completed === true || o.is_completed === true || o.done === true || /^(complete|completed|done|finished)$/i.test(String(o.status || o.state || ""));
        if (o.completed === false || o.is_completed === false || /incomplete|active|in_?progress|open|available/i.test(String(o._group || ""))) done = false;
        if (o.completed == null && o.is_completed == null && o.done == null && o.status == null && o.state == null) done = true;
        var q = o.quest || {}, k = arcNorm(o.quest_id || o.questId || o.slug || o.id || q.id || q.slug || o.name || q.name);
        if (k && done) { qc++; qd[k] = 1; qd[k.replace(/^\d+_/, "")] = 1; var qn = arcNorm(o.name || q.name); if (qn) qd[qn] = 1; }
      }); arc.qd = qd; arc.qc = qc; } else { arc.qd = null; arc.qc = 0; }
      if (res[4]) {
        var pf = res[4].data || res[4].profile || res[4].user || res[4];
        if (Array.isArray(pf)) pf = pf[0] || {};
        var pn = [pf.raider_name, pf.raiderName, pf.display_name, pf.displayName, pf.name, pf.username, pf.player_name, pf.playerName, pf.embark_id, pf.embarkId].filter(function (x) { return typeof x === "string" && x.trim(); })[0];
        var pl = arcProfileLevel(res[4]);
        arc.pn = pn ? String(pn).trim().slice(0, 32) : ""; arc.pl = pl != null ? parseInt(pl, 10) : null;
        var xp = arcProfileXp(res[4]); arc.xf = xp.f; arc.xc = xp.c; arc.xn = xp.n;
      }
      if (nd) { arc.bp = null; arc.qd = null; }
      arc.nd = nd; arc.stash = st; arc.ids = Object.keys(st); arc.n = arc.ids.length; arc.miss = miss; arc.missN = missN.slice(0, 20); arc.lv = lv; arc.at = Date.now(); arc.err = "";
      saveWs(); saveShop();
      if (nd) { if (kind !== "auto") toast("Linked, but ARCTracker has no game data yet. Install ARC Tracker Link to sync it."); }
      else if (kind !== "auto") toast("Synced " + arc.n + " items" + (lv ? " and " + lv + " station level" + (lv === 1 ? "" : "s") : "") + " from ARCTracker");
    }).catch(function (e) { arc.err = (e && e.message) || "Could not reach ARCTracker."; }).then(function () {
      arcBusy = false; arcSave();
      renderTop(); renderShop(); renderWeapon(); renderArc(); renderBp(); renderQuests();
    });
  }
  function arcAgo(t) { var m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; }
  function arcBox(full) {
    if (!ARC_PROXY) return "";
    if (arcOn()) {
      var wait = arcManualWait(), auto = arcAutoIn();
      var nd = arcNoData() && !arcBusy;
      return '<div class="arcin on' + (nd ? " warn" : "") + '"><span class="arcdot' + (arc.err ? " bad" : nd ? " warn" : "") + '"></span><div class="arct"><b>' + (nd ? "ARCTracker linked, no game data yet" : "ARCTracker linked") + '</b>' +
        (nd ? '<small class="arcnd">Your key works, but ARCTracker has no stash, stations, blueprints or quests for this account. ARCTracker gets these from its PC app, ARC Tracker Link: install it, link your ARC Raiders account and press Sync now there, then Refresh here. <a href="' + ARC_APP_URL + '" target="_blank" rel="noopener">Open the install guide</a></small>' : "") + '<small>' +
        (arcBusy ? "Syncing…" : nd ? "Checked " + arcAgo(arc.at) : arc.at ? arc.n + " items from your stash" + (arc.lv ? ", " + arc.lv + " station level" + (arc.lv === 1 ? "" : "s") : "") + " · synced " + arcAgo(arc.at) : "Not synced yet") +
        (arc.miss && !arcBusy ? " · " + arc.miss + " not recognised" : "") + (arc.at && !arcBusy && !arc.bp && !nd ? " · blueprints not shared (give the key blueprints read access)" : "") +
        (!arcBusy && auto > 0 ? " · next auto-sync in " + evClock(auto) : "") + "</small>" +
        (arc.err ? '<small class="arcerr">' + esc(arc.err) + "</small>" : "") + (full && arc.at ? '<button type="button" class="arcdiag" data-arc="diag">Something not filling in? Copy sync details</button>' : "") + "</div>" +
        '<button type="button" class="btn orb sm" data-arc="sync"' + (arcBusy || wait > 0 ? " disabled" : "") + ">" + (wait > 0 ? "Refresh in " + evClock(wait) : "Refresh (" + arcManualLeft() + " left)") + "</button>" +
        '<button type="button" class="wchg" data-arc="off">Unlink</button></div>';
    }
    if (full) return '<div class="arcin"><div class="arct"><b>Link ARCTracker</b><small>In ARCTracker, open <b>Settings → Developer Access</b> and create a personal key with <b>profile</b>, <b>stash</b>, <b>hideout</b>, <b>blueprints</b> and <b>quests</b> read access only. Paste it here. It stays in this browser and is only sent to ARCTracker.</small>' +
      '<div class="arcf"><input type="password" id="arcKey" placeholder="arc_u1_…" autocomplete="off" aria-label="ARCTracker personal API key"><button type="button" class="btn go orb sm" data-arc="go">Link</button></div>' +
      (arc.err ? '<small class="arcerr">' + esc(arc.err) + "</small>" : "") + '<small>Syncs once an hour while the site is open, plus up to ' + ARC_MANUAL + " manual refreshes per hour.</small></div></div>";
    return '<div class="arcin"><div class="arct"><b>Use your ARCTracker stash</b><small>Link ARCTracker and what you own, plus your station levels, fills in by itself.</small></div><button type="button" class="btn orb sm" data-arc="open">Link ARCTracker</button></div>';
  }
  function arcXpFrac() {
    if (arc.xf != null && !isNaN(arc.xf)) return Math.max(0, Math.min(1, arc.xf));
    return null;
  }
  /* ARCTracker can report level 1 before it has the real level. Level 1 with a filled stash
     (or any Outpost, which needs raider level 18) means the level is not known yet, so it is hidden. */
  function arcLvlOk() { if (arc.pl == null) return false; if (arc.pl > 1) return true; return !(arc.n > 20 || (ws.cur && ws.cur.research > 0)); }
  function arcRing() {
    var f = arcXpFrac(), C = 2 * Math.PI * 15.5, fill = f == null ? 0 : f * C;
    return '<span class="plvl"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="trk" cx="18" cy="18" r="15.5"/>' + (fill > 0 ? '<circle class="xpf" cx="18" cy="18" r="15.5" stroke-dasharray="' + fill.toFixed(2) + " " + C.toFixed(2) + '"/>' : "") + "</svg><b>" + arc.pl + "</b></span>";
  }
  function arcTipHtml(nd) {
    if (!arcOn() || !arc.at) return "";
    if (nd) return '<b>No game data found</b>Your key works, but ARCTracker has nothing from the game for this account yet. Install <b style="display:inline;color:inherit">ARC Tracker Link</b> on your PC, link your ARC Raiders account there and press Sync now. <a href="' + ARC_APP_URL + '" target="_blank" rel="noopener">Open the install guide</a><span class="tipx">Click for refresh and options</span>';
    var f = arcXpFrac(), auto = arcAutoIn(), li = [];
    if (arcLvlOk()) li.push("<li>Level " + arc.pl + (arc.xc != null && arc.xn ? ' <em>· ' + fmt(arc.xc) + " / " + fmt(arc.xn) + " XP</em>" : f != null ? ' <em>· ' + Math.round(f * 100) + "% to next level</em>" : "") + (f != null ? '<span class="xpbar"><i style="width:' + (f * 100).toFixed(1) + '%"></i></span>' : "") + "</li>");
    li.push("<li>" + arc.n + " items from your stash" + (arc.lv ? " · " + arc.lv + " station level" + (arc.lv === 1 ? "" : "s") : "") + "</li>");
    if (arc.pl != null && !arcLvlOk()) li.push("<li><em>ARCTracker has not shared your raider level yet</em></li>");
    if (arc.miss) li.push("<li><em>" + arc.miss + " stash item" + (arc.miss === 1 ? " is" : "s are") + " newer than the site's data" + (arc.missN && arc.missN.length ? ": " + esc(arc.missN.slice(0, 4).join(", ")) + (arc.miss > 4 ? "…" : "") : "") + "</em></li>");
    if (!arc.bp) li.push("<li><em>Blueprints not shared (give the key blueprints read access)</em></li>");
    li.push("<li>" + (arcBusy ? "Syncing…" : "Synced " + arcAgo(arc.at)) + (!arcBusy && auto > 0 ? ' <em>· next in ' + evClock(auto) + "</em>" : "") + "</li>");
    return "<b>" + (arc.err ? "ARCTracker sync failed" : "ARCTracker linked") + "</b>" + (arc.err ? "<div>" + esc(arc.err) + "</div>" : "") + "<ul>" + li.join("") + '</ul><span class="tipx">Click for refresh and options</span>';
  }
  /* XP from the profile: either a progress value, or XP in this level and XP needed for the next */
  function arcProfileXp(j) {
    var v = {};
    (function walk(o, d) {
      if (!o || typeof o !== "object" || d > 6) return;
      Object.keys(o).forEach(function (k) {
        var x = o[k], kk = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (x && typeof x === "object") { walk(x, d + 1); return; }
        var n = parseFloat(x); if (isNaN(n) || n < 0) return;
        if (/^(levelprogress|xpprogress|progress|progresspercent|levelpercent|xppercent|percenttonext|progresstonextlevel)$/.test(kk) && v.p == null) v.p = n;
        else if (/^(xp|exp|experience|currentxp|xpcurrent|currentexperience|levelxp|xpinlevel|xpintolevel|xpthislevel|currentlevelxp|xpcurrentlevel)$/.test(kk) && v.c == null) v.c = n;
        else if (/^(xptonext|xptonextlevel|xpremaining|remainingxp|xpleft|xpuntilnext)$/.test(kk) && v.rem == null) v.rem = n;
        else if (/^(nextlevelxp|xpnextlevel|xpneeded|neededxp|xprequired|requiredxp|xpfornextlevel|levelupxp|xpmax|maxxp|xpforlevel)$/.test(kk) && v.need == null) v.need = n;
        else if (/^(levelstartxp|xplevelstart|levelminxp|xpmin|minxp|currentlevelstartxp)$/.test(kk) && v.lo == null) v.lo = n;
        else if (/^(levelendxp|xplevelend|levelmaxxp|nextlevelstartxp|nextlevelthreshold)$/.test(kk) && v.hi == null) v.hi = n;
      });
    })(j, 0);
    var out = { f: null, c: null, n: null };
    if (v.p != null) out.f = v.p > 1 ? v.p / 100 : v.p;
    else if (v.c != null && v.lo != null && v.hi != null && v.hi > v.lo) { out.c = v.c - v.lo; out.n = v.hi - v.lo; out.f = out.c / out.n; }
    else if (v.c != null && v.rem != null && v.c + v.rem > 0) { out.c = v.c; out.n = v.c + v.rem; out.f = v.c / out.n; }
    else if (v.c != null && v.need > 0 && v.c <= v.need) { out.c = v.c; out.n = v.need; out.f = v.c / v.need; }
    if (out.f != null) out.f = Math.max(0, Math.min(1, out.f));
    return out;
  }
  function renderArc() {
    Array.prototype.forEach.call(document.querySelectorAll(".arc-only"), function (el) { el.hidden = !ARC_PROXY; });
    var zn = 0; Array.prototype.forEach.call(document.querySelectorAll(".zz > li"), function (li) { if (li.hidden) return; zn++; var z = li.querySelector(".zn"); if (z) z.textContent = (zn < 10 ? "0" : "") + zn; li.style.setProperty("--c", ["#ff2d2d", "#ffc400", "#22d65f", "#5ff2ea", "#2f3ee0", "#b98cff"][zn - 1] || "#5ff2ea"); });
    layoutZZ();
    var pill = $("#arcPill");
    if (pill) {
      pill.hidden = !ARC_PROXY;
      var pnd = arcNoData() && !arcBusy, wrap = $("#arcWrap");
      pill.className = "arcpill" + (arcOn() ? (arc.err ? " bad" : pnd ? " warn" : " on") : "");
      if (wrap) { wrap.classList.toggle("warn", pnd); wrap.classList.toggle("tip", arcOn() && !!arc.at); wrap.classList.toggle("popopen", !!($("#arcPop") && !$("#arcPop").hidden)); }
      var tip = $("#arcTip");
      if (tip) { var th = arcTipHtml(pnd); tip.className = "arctip" + (arc.err ? " bad" : pnd ? "" : " ok"); if (tip.firstChild.innerHTML !== th) tip.firstChild.innerHTML = th; }
      pill.innerHTML = arcOn() && arc.pn ? (arcLvlOk() && !pnd ? arcRing() : "") + '<span class="pname">' + esc(arc.pn) + "</span>" + (arc.err || pnd ? "<i></i>" : "") : '<i></i><span>' + (arcOn() ? (arcBusy ? "Syncing…" : "ARCTracker") : '<em class="pl1">Link </em>ARCTracker') + "</span>";
      pill.classList.toggle("who", !!(arcOn() && arc.pn));
      pill.title = arcOn() && arc.at ? "" : arcOn() ? "ARCTracker linked" : "Link your ARCTracker stash";
    }
    var pop = $("#arcPop"), keep = pop && !pop.hidden && !arcOn() ? (($("#arcKey") || {}).value || "") : null;
    Array.prototype.forEach.call(document.querySelectorAll("[data-arcbar]"), function (el) {
      var full = el.hasAttribute("data-arcfull"), html = !full && arcOn() && !arcNoData() && !arc.err ? "" : arcBox(full);
      if (full && !arcOn() && el.querySelector("#arcKey")) { var e = el.querySelector(".arcerr"); if (e) e.textContent = arc.err || ""; return; }
      el.innerHTML = html; el.hidden = !html;
    });
    if (keep != null && $("#arcKey") && !$("#arcKey").value) $("#arcKey").value = keep;
    Array.prototype.forEach.call(document.querySelectorAll("[data-arcmini]"), function (el) {
      el.hidden = !ARC_PROXY;
      el.innerHTML = arcNoData() ? '<a class="arcmini warn" href="' + ARC_APP_URL + '" target="_blank" rel="noopener" title="ARCTracker has no game data for your account yet. Install ARC Tracker Link to sync your stash."><i></i>No ARCTracker data · install guide</a>' : arcOn() ? '<span class="arcmini on"><i></i>Synced via ARCTracker</span>' : '<button type="button" class="arcmini" data-arc="open"><i></i>Fill in from ARCTracker</button>';
    });
  }
  function arcOpen(show) {
    if (show && !ARC_PROXY) { toast(t("Linking ARCTracker works on raidkits.com."), true); return; }
    var p = $("#arcPop"); if (!p) return;
    p.hidden = !show;
    if (show) { renderArc(); var i = $("#arcKey"); if (i) setTimeout(function () { i.focus(); }, 30); }
  }
  document.addEventListener("click", function (e) {
    var p = $("#arcPop");
    if (p && !p.hidden && !e.target.closest("#arcPop") && !e.target.closest("[data-arc]") && !e.target.closest("#arcPill")) arcOpen(false);
    if (e.target.closest && e.target.closest("#arcPill")) { arcOpen(p.hidden); return; }
    var b = e.target.closest && e.target.closest("[data-arc]"); if (!b) return;
    var a = b.dataset.arc;
    if (a === "open") { arc.err = ""; arcOpen(true); }
    else if (a === "close") arcOpen(false);
    else if (a === "go") {
      var v = (($("#arcKey") || {}).value || "").trim();
      if (!/^arc_u1_[A-Za-z0-9_\-]{8,}$/.test(v)) { arc.err = "That does not look like an ARCTracker personal key (it starts with arc_u1_)."; renderArc(); return; }
      arc = { key: v, man: [] }; arcSave(); arcOpen(false); arcSync("link");
    }
    else if (a === "sync") arcSync("manual");
    else if (a === "diag") copyText(arcReport(), function () { toast("Sync details copied. Paste them to us in Discord. They contain no key.", true); });
    else if (a === "off") { arc = {}; arcSave(); arcOpen(false); renderArc(); renderWeapon(); toast("ARCTracker unlinked. Your Have counts were kept."); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.id === "arcKey") { var b = document.querySelector('[data-arc="go"]'); if (b) b.click(); }
    if (e.key === "Escape") arcOpen(false);
  });
  function arcTick() { if (!arcOn() || arcBusy || document.hidden) return; if (arcAutoIn() <= 0) arcSync("auto"); else renderArc(); }
  setInterval(arcTick, 1000);
  document.addEventListener("visibilitychange", arcTick);

  function renderAll() {
    applyI18nStatic();
    setTitle();
    [renderWList, renderWeapon, renderSources, renderTop, renderList, renderRarChips, renderUseChips, function () { renderItems(true); }, renderMapList, renderMapDetail, renderEvents, renderKeyChips, renderKeys, renderShop, renderWTabs, renderDataCheck, renderArc, renderBp, renderQuests, renderSkills].forEach(function (fn) {
      try { fn(); } catch (err) { if (window.console) console.error("init failed:", err); }
    });
  }
  var langSel = $("#langSel");
  if (langSel) {
    langSel.value = LANG;
    langSel.addEventListener("change", function () { LANG = this.value; store("rt-lang", LANG); renderAll(); });
  }
  renderAll();

