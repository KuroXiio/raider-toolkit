  /* ---------- Maps ---------- */
  var curMap = "buried";
  function renderMapList() {
    var one = function (k, cur) { return (cur ? '<button type="button" class="mpcur" aria-expanded="false" aria-controls="mpl">' : '<button type="button" data-mapsel="' + k + '" aria-pressed="' + (curMap === k) + '">') + '<span class="mpn">' + esc(MAPS[k].name) + (mapWip(k).length ? '<span class="wip">WIP</span>' : "") + '</span><small class="mlev" data-evm="' + k + '" hidden></small>' + (cur ? '<i class="ndc" aria-hidden="true"></i>' : "") + "</button>"; };
    $("#maplist").innerHTML = one(curMap, true) + '<div class="mpl" id="mpl">' + MAP_ORDER.map(function (k) { return one(k); }).join("") + "</div>";
    renderEvents();
    var ml = $("#maplist"), sel = ml.querySelector('[aria-pressed="true"]');
    if (sel && ml.scrollWidth > ml.clientWidth) ml.scrollLeft = Math.max(0, sel.offsetLeft - 12);
  }
  var EVENTS = DB.events.filter(function (e) { return e.n !== "None"; });
  var mTagKind = "all", mTagQ = "";
  var PINSVG = '<svg viewBox="0 0 24 24"><path d="M12 22s7-7.6 7-13a7 7 0 0 0-14 0c0 5.4 7 13 7 13z" fill="#8f86d6"/><circle cx="12" cy="9" r="2.6" fill="#0b0f26"/></svg>';
  var BOLTSVG = '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>';
  function mapTags() {
    var m = MAPS[curMap], tags = [];
    Object.keys(GUIDE).forEach(function (id) {
      var g = GUIDE[id]; if (g.m.indexOf(curMap) < 0 || g.m.length >= 4) return; var it = IDX[id] || { n: nm(id) };
      tags.push({ kind: "loot", label: nm(id), icon: thumb(id), rc: rcol(it.r), title: nm(id), sub: [it.r || "", it.t || "", it.v != null ? fmt(it.v) + " coins" : ""].filter(Boolean).join(" · "), body: g.w, act: 'data-find="' + esc(nm(id)) + '"', hint: "Click to open the item" });
    });
    KEYS.filter(function (k) { return k.m === curMap; }).forEach(function (k) {
      var it = IDX[k.id] || {};
      tags.push({ kind: "keys", label: nm(k.id), icon: thumb(k.id), rc: rcol(it.r), title: nm(k.id), sub: (it.r || "Key") + (k.pin ? " · pinned on the map" : " · no map pin yet"), body: "Opens: " + k.door + "\nGet it: " + k.get, act: 'data-kshow="' + k.id + '"', hint: k.pin ? "Click to show it on the map" : "Click to open the map" });
    });
    m.pois.forEach(function (p) {
      var low = p.toLowerCase(), refs = [];
      tags.forEach(function (x) { if ((x.kind === "loot" || x.kind === "keys") && (x.body || "").toLowerCase().indexOf(low) > -1) refs.push(x.label); });
      tags.push({ kind: "areas", label: p, icon: '<span class="ti">' + PINSVG + "</span>", title: p, sub: "Named area", body: refs.length ? "Mentioned by: " + refs.join(", ") : "No item or key notes mention this area yet.", act: 'data-mtq="' + esc(p) + '"', hint: refs.length ? "Click to show what is found here" : "" });
    });
    EVENTS.forEach(function (e) {
      var here = m.events.indexOf(e.n) > -1;
      tags.push({ kind: "conds", label: e.n, icon: '<span class="ti ' + (e.cat === "major" ? "maj" : "min") + '">' + BOLTSVG + "</span>", title: e.n, sub: (e.cat === "major" ? "Major" : "Minor") + " map condition" + (e.new ? " · new in 2.0" : ""), body: here ? "Seen on this map." : "Not tracked on this map in the sources used.", act: 'data-mtq="' + esc(e.n) + '"', dim: !here, hint: "" });
    });
    return tags;
  }
  function renderMapTags() {
    var tags = mapTags(), q = mTagQ.trim().toLowerCase();
    var counts = { all: 0, loot: 0, keys: 0, areas: 0, conds: 0 };
    tags.forEach(function (x) { if (!x.dim) { counts[x.kind]++; counts.all++; } });
    var LAB = { all: "All", loot: "Loot", keys: "Keys", areas: "Areas", conds: "Conditions" };
    $("#mtk").innerHTML = Object.keys(LAB).map(function (k) { return '<button type="button" class="chip orb" data-mtk="' + k + '" aria-pressed="' + (mTagKind === k) + '">' + LAB[k] + " <b>" + counts[k] + "</b></button>"; }).join("");
    var shown = tags.filter(function (x) {
      if (mTagKind !== "all" && x.kind !== mTagKind) return false;
      if (x.dim && mTagKind !== "conds") return false;
      if (!q) return true;
      return (x.label + " " + x.body + " " + x.sub).toLowerCase().indexOf(q) > -1;
    });
    $("#mtags").innerHTML = shown.length ? shown.map(function (x) {
      return '<button type="button" class="mtag k-' + x.kind + (x.dim ? " dim" : "") + '" style="--rc:' + (x.rc || "#4a5388") + '" ' + x.act + ' data-tt="' + esc(x.title) + '" data-ts="' + esc(x.sub) + '" data-tb="' + esc(x.body) + '" data-th="' + esc(x.hint) + '">' + x.icon + "<span>" + esc(x.label) + "</span></button>";
    }).join("") : '<span class="dim">Nothing matches' + (q ? " “" + esc(mTagQ) + "”" : "") + ' on this map yet.</span>';
    $("#mtclear").hidden = !q;
  }
  function renderMapDetail() {
    var m = MAPS[curMap];
    var mk = KEYS.filter(function (k) { return k.m === curMap; });
    $("#mapstage").innerHTML = mapViewHtml();
    renderEvents();
    $("#mapdetail").innerHTML =
      '<div class="mi-top"><p class="blurb">' + esc(m.blurb) + '</p><div class="facts"><div><b>' + (m.zip || "n/a") + '</b><span class="l">Ziplines</span></div><div><b>' + m.pois.length + '</b><span class="l">Named areas</span></div><div><b>' + mk.length + '</b><span class="l">Keys</span></div></div></div>' +
      '<div class="ml2"><section class="panel mlmain" id="mlMain"></section><aside class="mlside"><section class="panel mls" id="mlKeys"></section><section class="panel mls" id="mlConds"></section></aside></div>';
    renderMapLoot(); renderMapSide();
    mvInit();
  }
