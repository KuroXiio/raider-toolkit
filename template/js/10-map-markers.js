  /* ---------- map markers (MetaForge community map) ---------- */
  var MFD = DB.mf || null, MKT = MFD ? MFD.types : [], MKLOOT = MFD ? MFD.loot : [];
  /* Marker look: few colours, and the shape says what kind of thing it is.
       cream  = places (return points are filled so they stand out first)
       amber  = locked: rooms and doors that need a key, a breach or a fuel cell
       grey   = containers (rounded squares)
       red    = ARC (diamonds)
       green  = nature
     Glyphs are strokes on a 24x24 grid; a type can have its own glyph in MKSUB. */
  var MKC = { ink: "#f1ece1", amb: "#ffc24b", dim: "#a9b1c6", red: "#ff5a52", grn: "#8fd17a", bg: "rgba(13,14,22,.92)", dark: "#12131c" };
  var MKG = [
    { k: "ext", n: "Extraction", c: MKC.ink, sh: "fill", m: ["locations:extraction", "locations:metro_entrance"], on: 1, g: "M12 16.5V6M7.5 10.5 12 6l4.5 4.5M7 19.5h10" },
    { k: "hat", n: "Raider hatches", c: MKC.ink, sh: "fill", m: ["locations:hatch"], on: 1, g: "M6 9h12v9H6zM9 9V6h6v3M9 12.5h6M9 15.5h6" },
    { k: "spn", n: "Player spawns", c: MKC.ink, sh: "ring", m: ["locations:player_spawn"], on: 0, g: "M12 5.5a2.3 2.3 0 1 1 0 4.6a2.3 2.3 0 1 1 0-4.6zM7.5 19c0-4 2-6 4.5-6s4.5 2 4.5 6" },
    { k: "sup", n: "Supply stations", c: MKC.ink, sh: "ring", m: ["locations:supply_station"], on: 0, g: "M12 19.5v-8M8.6 8.6a4.8 4.8 0 0 1 6.8 0M6 6a8.5 8.5 0 0 1 12 0M9.5 19.5h5" },
    { k: "lock", n: "Locked rooms and doors", c: MKC.amb, sh: "ring", m: ["locations:locked_room", "locations:breach_room", "locations:fuel-cell", "locations:button"], on: 1, g: "M7 11h10v8H7zM9 11V8.5a3 3 0 0 1 6 0V11M12 14v2" },
    { k: "trav", n: "Ziplines and lifts", c: MKC.ink, sh: "ring", m: ["locations:zipline", "locations:gondola_landing", "locations:mast_lift"], on: 0, g: "M4 7l16 5M12 9.5V15M9 15h6v3H9z" },
    { k: "loc", n: "Other places", c: MKC.ink, sh: "ring", cat: "locations", on: 0, g: "M12 4.5c3 0 5 2.2 5 5 0 3.8-5 9.5-5 9.5s-5-5.7-5-9.5c0-2.8 2-5 5-5zM12 8a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3z" },
    { k: "con", n: "Containers", c: MKC.dim, sh: "sq", cat: "containers", sub: 1, on: 0, g: "M5 9h14v9H5zM5 9l2-3h10l2 3M10 12.5h4" },
    { k: "arc", n: "ARC", c: MKC.red, sh: "dia", cat: "arc", sub: 1, on: 0, g: "M5 12s2.8-4.2 7-4.2S19 12 19 12s-2.8 4.2-7 4.2S5 12 5 12zM12 10.4a1.6 1.6 0 1 1 0 3.2a1.6 1.6 0 1 1 0-3.2z" },
    { k: "nat", n: "Nature", c: MKC.grn, sh: "ring", cat: "nature", sub: 1, on: 0, g: "M6 18c0-7 5-12 12-12 0 7-5 12-12 12zM6 18l6.5-6.5" },
    { k: "evt", n: "Events", c: MKC.ink, sh: "hex", cat: "events", sub: 1, on: 0, g: "M13 4.5 7 13.5h4.5L10.5 19.5 17 10.5h-4.5z" },
    { k: "qst", n: "Quests", c: MKC.amb, sh: "hex", cat: "quests", sub: 1, on: 0, g: "M8.5 19.5V5M8.5 5.5h8l-2 3.2 2 3.3h-8" }
  ];
  var MKSUB = {
    "locations:metro_entrance": "M6.5 17.5V7l5.5 6 5.5-6v10.5",
    "locations:breach_room": "M7.5 19.5v-15h9v15M5.5 19.5h13M13.5 12.5h.6",
    "locations:fuel-cell": "M8 7.5h8v12H8zM10.5 7.5V5h3v2.5M12.6 10l-2 3.5h2.8l-2 3.5",
    "locations:button": "M12 7a5 5 0 1 1 0 10a5 5 0 1 1 0-10zM12 10.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3z",
    "locations:gondola_landing": "M4 6l16 3M12 7.5V11M7.5 11h9v7.5h-9zM7.5 14.5h9",
    "locations:mast_lift": "M12 4.5v15M8 8.5l4-4 4 4M8 15.5l4 4 4-4",
    "locations:field_crate": "M5 8.5h14v10H5zM5 13.5h14M12 8.5v10",
    "locations:field_depot": "M5 19.5v-9l7-5 7 5v9zM10 19.5v-5h4v5",
    "locations:raider_camp": "M3.5 18.5 12 6l8.5 12.5zM12 6v12.5",
    "locations:emergency_shelter": "M5 18.5v-6a7 7 0 0 1 14 0v6zM10 18.5v-4h4v4",
    "containers:locker": "M8 4.5h8v15H8zM8 12h8M13.5 8v1.5M13.5 14.5V16",
    "containers:raider_cache": "M5 18.5v-7a3.5 3.5 0 0 1 3.5-3.5h7A3.5 3.5 0 0 1 19 11.5v7zM5 12.5h14M12 11v3.5",
    "containers:frozen_raider_cache": "M5 18.5v-7a3.5 3.5 0 0 1 3.5-3.5h7A3.5 3.5 0 0 1 19 11.5v7zM5 12.5h14M12 11v3.5",
    "containers:hurricane_cache": "M5 18.5v-7a3.5 3.5 0 0 1 3.5-3.5h7A3.5 3.5 0 0 1 19 11.5v7zM5 12.5h14M12 11v3.5",
    "containers:weapon_case": "M4 9h16v9H4zM9 9V6.5h6V9M8 13.5h8",
    "containers:ammo_crate": "M7.5 18.5v-8l2-3.5 2 3.5v8zM12.5 18.5v-8l2-3.5 2 3.5v8z",
    "containers:med_crate": "M5.5 7h13v11.5h-13zM12 9.5v6.5M8.8 12.8h6.4",
    "containers:car": "M4.5 16v-3.5l2.2-4.5h10.6l2.2 4.5V16zM4.5 12.5h15M8 16v2M16 16v2",
    "containers:suitcase": "M5.5 9h13v9.5h-13zM9.5 9V6.5h5V9M5.5 13h13",
    "containers:bag": "M7 9.5h10l1 9H6zM9.5 9.5V8a2.5 2.5 0 0 1 5 0v1.5",
    "containers:security_breach": "M12 4.5l6 2.5v4.5c0 4-2.6 6.6-6 8-3.4-1.4-6-4-6-8V7z",
    "containers:breachable_container": "M12 4.5l6 2.5v4.5c0 4-2.6 6.6-6 8-3.4-1.4-6-4-6-8V7z",
    "nature:mushroom": "M5 12a7 7 0 0 1 14 0zM10 12v6.5h4V12",
    "events:mine": "M12 8a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9zM12 5v3M5 12.5h2.5M16.5 12.5H19M7.3 7.8l1.4 1.4M16.7 7.8l-1.4 1.4",
    "events:security_camera": "M5 8h10v6H5zM15 10l4-2v6l-4-2M8 14v4.5",
    "events:dig_spot": "M14.5 4.5l5 5M17 7l-8 8M6.5 13.5l4 4-2 2h-4v-4z",
    "events:snow_pile": "M12 5v14M6 8.5l12 7M18 8.5l-12 7"
  };
  // loot left behind by ARC (husks, probes, couriers) is a container like any other, marked with the ARC eye
  var MKARCBOX = { baron_husk: 1, wasp_husk: 1, rocketeer_husk: 1, arc_husk: 1, deforester_husk: 1, arc_courier: 1, arc_probe: 1 };
  function mkLook(ti) {
    var ty = MKT[ti], g = MKTG[ti] || MKGI.loc, key = ty ? ty[0] + ":" + ty[1] : "";
    var red = ty && ty[0] === "containers" && MKARCBOX[ty[1]];
    return { id: red ? "arcbox" : MKSUB[key] ? key : g.k, c: g.c, sh: g.sh, g: red ? MKGI.arc.g : MKSUB[key] || g.g };
  }
  var MKGI = {}; MKG.forEach(function (g) { MKGI[g.k] = g; });
  var MKTG = MKT.map(function (t) {
    var key = t[0] + ":" + t[1];
    for (var i = 0; i < MKG.length; i++) if (MKG[i].m && MKG[i].m.indexOf(key) > -1) return MKG[i];
    for (var j = 0; j < MKG.length; j++) if (!MKG[j].m && MKG[j].cat === t[0]) return MKG[j];
    return null;
  });
  var mkLay = store("rt-mlay") || {}; // { g: {ext:true,...}, off: {"containers:car":1} }
  if (!mkLay.g) { mkLay.g = {}; MKG.forEach(function (g) { mkLay.g[g.k] = !!g.on; }); }
  if (!mkLay.off) mkLay.off = {};
  function mkSave() { store("rt-mlay", mkLay); }
  var MK_WAIT = {};
  function mkGet(key, cb) {
    if (MK[key]) return cb(MK[key]);
    if (!MKF[key]) return cb(null);
    if (MK_WAIT[key]) { MK_WAIT[key].push(cb); return; }
    MK_WAIT[key] = [cb];
    fetch(MKF[key]).then(function (r) { return r.json(); }).then(function (d) { MK[key] = d; }).catch(function () { MK[key] = { m: [], n: {}, s: {} }; })
      .then(function () { var l = MK_WAIT[key]; delete MK_WAIT[key]; l.forEach(function (f) { f(MK[key]); }); });
  }
  function mkItemMatch(id) {
    var it = IDX[id], sp = it && it.sp; if (!sp) return null;
    var ts = {}; (sp.t || []).forEach(function (x) { ts[x] = 1; });
    return function (r) { return ts[r[2]] || (sp.la && r[4] && (r[4] & sp.la) && MKT[r[2]] && MKT[r[2]][0] === "containers"); };
  }
  function mkVisible(r) {
    var g = MKTG[r[2]]; if (!g || !mkLay.g[g.k]) return false;
    var t = MKT[r[2]]; return !mkLay.off[t[0] + ":" + t[1]];
  }
  function mkLootTxt(m) { var o = []; MKLOOT.forEach(function (c, i) { if (m & (1 << i)) o.push(t(c)); }); return o.join(", "); }
  function mkSpots(id) { var it = IDX[id]; return (it && it.sp && it.sp.c) || {}; }
  function mkMapCount(id, k) { var c = mkSpots(id); return k === "stella" ? (c.stella_u || 0) + (c.stella_l || 0) : c[k] || 0; }
  function mkWhat(id) {
    var sp = (IDX[id] || {}).sp || {}, parts = [];
    (sp.t || []).forEach(function (x) { if (MKT[x]) parts.push(MKT[x][2]); });
    if (sp.la) parts.push(t("containers in") + " " + mkLootTxt(sp.la) + " " + t("areas"));
    return parts.join(", ");
  }
  /* what is shown on its own right now: one item, or one quest */
  function mkFocus() {
    if (MV.plan) return null;
    if (MV.item && IDX[MV.item] && IDX[MV.item].sp) {
      var id = MV.item;
      return { kind: "item", id: id, name: nm(id), match: mkItemMatch(id), c: mkSpots(id), what: mkWhat(id) };
    }
    var q = MV.quest && QIDX[MV.quest];
    if (q && q.mk) {
      var ts = {}; q.mk.t.forEach(function (x) { ts[x] = 1; });
      return { kind: "quest", id: q.id, name: qName(q), match: function (r) { return ts[r[2]]; }, c: q.mk.c, route: q.mk.route ? q.mk.st : null,
        what: q.mk.kw ? t("Any of these will do") + ": " + q.mk.t.map(function (x) { return MKT[x] ? MKT[x][2] : ""; }).join(", ") : "" };
    }
    return null;
  }
  function mkFocusCount(f, k) { return k === "stella" ? (f.c.stella_u || 0) + (f.c.stella_l || 0) : f.c[k] || 0; }

  /* sprites: drawn once per look and size, then stamped */
  var SPR = {}, ICIMG = {};
  function mkShape(x, sh, m, r) {
    x.beginPath();
    if (sh === "sq") { var q = r * 0.9, rr = r * 0.3; x.roundRect ? x.roundRect(m - q, m - q, q * 2, q * 2, rr) : x.rect(m - q, m - q, q * 2, q * 2); }
    else if (sh === "dia") { var d2 = r * 1.12; x.moveTo(m, m - d2); x.lineTo(m + d2, m); x.lineTo(m, m + d2); x.lineTo(m - d2, m); x.closePath(); }
    else if (sh === "hex") { for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3, px = m + Math.cos(a) * r * 1.06, py = m + Math.sin(a) * r * 1.06; if (k) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath(); }
    else x.arc(m, m, r, 0, 6.2832);
  }
  /* one marker: L is a look from mkLook (or a group), d its size. Small ones (glyph off) are plain shapes for crowded views. */
  function sprBadge(L, d, dpr, glyph) {
    if (L.k && !L.id) L = { id: L.k, c: L.c, sh: L.sh, g: L.g };
    var key = "b" + L.id + d + "_" + dpr + (glyph ? "g" : ""); if (SPR[key]) return SPR[key];
    var c = document.createElement("canvas"), px = Math.ceil((d + 4) * dpr); c.width = c.height = px;
    var x = c.getContext("2d"); x.scale(dpr, dpr); var m = (d + 4) / 2, r = d / 2, fill = L.sh === "fill";
    x.lineJoin = "round";
    if (!glyph) {
      // crowded: a small solid shape with a dark edge
      mkShape(x, L.sh === "fill" || L.sh === "ring" ? "c" : L.sh, m, r * 0.62); x.fillStyle = L.c; x.fill(); x.lineWidth = 1.4; x.strokeStyle = "rgba(8,9,16,.9)"; x.stroke();
      return (SPR[key] = c);
    }
    mkShape(x, L.sh, m, r); x.lineWidth = 2.6; x.strokeStyle = "rgba(6,7,12,.75)"; x.stroke();   // dark halo so it reads on any ground
    mkShape(x, L.sh, m, r - 0.4); x.fillStyle = fill ? L.c : MKC.bg; x.fill();
    if (!fill) { x.lineWidth = Math.max(1.2, d / 13); x.strokeStyle = L.c; x.stroke(); }
    x.save(); var sc = d / 24 * (L.sh === "dia" ? 0.66 : L.sh === "sq" ? 0.74 : 0.72); x.translate(m - 12 * sc, m - 12 * sc); x.scale(sc, sc);
    x.lineWidth = fill ? 2.6 : 2.2; x.lineCap = "round"; x.strokeStyle = fill ? MKC.dark : L.c; x.stroke(new Path2D(L.g)); x.restore();
    return (SPR[key] = c);
  }
  function sprPin(kind, id, label, w, dpr) {
    var key = "p" + kind + id + label + w + "_" + dpr; if (SPR[key]) return SPR[key];
    var h = w * 38 / 30, c = document.createElement("canvas"); c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    var x = c.getContext("2d"); x.scale(dpr * w / 30, dpr * w / 30);
    var col = kind === "quest" ? "#c49bff" : kind === "plan" ? "#5ff2ea" : "#ffe066";
    x.fillStyle = "#0b0f26"; x.strokeStyle = col; x.lineWidth = 2.4;
    var p = new Path2D("M15 37C15 37 2 22 2 14a13 13 0 0 1 26 0c0 8-13 23-13 23z"); x.fill(p); x.stroke(p);
    if (kind === "item") {
      var im = ICIMG[id];
      if (!im && ICONS[id]) { im = ICIMG[id] = new Image(); im.onload = function () { Object.keys(SPR).forEach(function (k) { if (k.indexOf("pitem" + id) === 0) delete SPR[k]; }); mkSoon(); }; im.src = ICONS[id]; }
      if (im && im.complete && im.naturalWidth) {
        x.save(); x.beginPath(); x.arc(15, 14, 9.5, 0, 6.2832); x.clip();
        var it2 = IDX[id]; x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--r-" + String((it2 && it2.r) || "common").toLowerCase()).trim() || "#6c7aa0"; x.globalAlpha = .45; x.fill(); x.globalAlpha = 1;
        var s2 = 19 / Math.max(im.naturalWidth, im.naturalHeight); x.drawImage(im, 15 - im.naturalWidth * s2 / 2, 14 - im.naturalHeight * s2 / 2, im.naturalWidth * s2, im.naturalHeight * s2); x.restore();
      } else { x.beginPath(); x.arc(15, 14, 4, 0, 6.2832); x.fillStyle = col; x.fill(); }
    } else if (label) {
      x.fillStyle = col; x.font = "800 " + (label.length > 1 ? 11 : 13) + "px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(label, 15, 14.5);
    } else {
      x.save(); x.translate(15 - 12 * 0.62, 14 - 12 * 0.62); x.scale(0.62, 0.62); x.lineWidth = 2.6; x.lineJoin = "round"; x.lineCap = "round"; x.strokeStyle = col; x.stroke(new Path2D(MKGI.qst.g)); x.restore();
    }
    return (SPR[key] = c);
  }
  /* Area names, written the way the in-game map does: small capitals, widely spaced, straight on the ground.
     [name, x, y, tier] in pixels of the 1800px map image. Tier 2 names show once you zoom in a little.
     Each one is placed from a marker that names the spot (a return point, a key door, a quest's "reach ..." pin), so a name
     can sit a little off the middle of its area; areas with nothing to place them by are left out rather than guessed. */
  var MAREAS = {"dam":[["Water Treatment Control",735,888,1],["Research & Administration",1000,992,1],["Control Tower",1052,926,2],["Testing Annex",1249,1127,1],["Power Generation Complex",1188,560,1],["Controlled Access Zone",1088,622,2],["Hydroponic Dome Complex",868,652,1],["South Swamp Outpost",480,930,2],["Victory Ridge",772,452,1],["Swamp",650,775,1],["Floodgates",1022,823,2],["Water Towers",590,1160,2],["Red Lakes Balcony",1178,1092,2],["Ben Welder's Sunroof",616,562,2]],
    "buried":[["Piazza Roma",718,808,1],["Hospital",930,566,1],["Town Hall",966,986,1],["Library",790,628,1],["Grandioso Apartments",584,1132,1],["Santa Maria Houses",934,1177,1],["Red Tower",1130,1250,2],["Space Travel",1029,781,1],["Galleria",1129,682,2],["Pharmacy",1282,1048,2],["Graveyard",1334,914,2],["Parking Garage",968,640,2]],
    "space":[["Arrival Building",700,624,1],["Departure Building",690,820,1],["Launch Towers",857,745,1],["Rocket Assembly",1101,789,1],["Control Tower",983,885,1],["Container Storage",1124,951,1],["Jiangsu Warehouse",516,535,2],["Water Towers",359,723,2],["Vehicle Maintenance",920,1065,1],["Hidden Bunker",615,912,2],["Electrical Substation",984,1354,2],["Communications Tower",1310,1052,2],["South Trench Tower",953,562,2],["Fuel Lines",521,1085,2]],
    "gate":[["Pilgrim's Peak",1289,541,1],["Reinforced Reception",885,634,1],["Raider's Refuge",564,664,1],["Ancient Fort",908,1238,1],["Checkpoint",622,1008,1],["Olive Grove",762,1105,2],["Barren Clearing",367,622,2],["Collapsed Highway",390,962,2],["Traffic Tunnel",881,748,2],["Abandoned Housing Project",1276,839,2]],
    "stella_u":[["Loading Bay",350,1193,1],["Lobby Metro",1127,311,1],["Robotic Sandbox A",954,682,1],["Robotic Sandbox B",900,1380,1],["Seed Vault",1485,1415,1],["Eastern Tunnel",1535,940,2]],
    "stella_l":[["Medical Research",300,950,1],["Security Bridge",1090,484,2],["Atrium",1048,954,1],["Cafeteria",908,876,2],["Communications",1138,818,1],["Lobby",1100,440,1],["Cultural Archives",1600,520,1],["Assembly",680,345,1]],
    "riven":[["Hotel Panorama Azzurro",480,1062,1],["Port Authority Building",795,690,1],["Crane House",1240,954,1],["Customs House",890,1230,1],["Mulatierra Hill",874,1021,2],["Quay",1402,825,2],["Raider Camp",550,858,2]],
    "pendola":[["Almatera Station",788,787,1],["Dispatch Tower",889,618,1],["Weather Station",1300,915,1],["Loading Platforms",1270,1288,1],["Commissary Supermarket",940,955,1],["Cielo Sereno Observatory",1283,708,1],["Railyard",1150,1140,1],["The Emperor",600,935,1],["Old Town",646,1173,1],["Northern Tracks",1171,439,2]]};
  function mkAreas(cx, s, W, H) {
    var list = MAREAS[mapImgKey()]; if (!list || mkLay.names === false) return;
    var fs = Math.max(10, Math.min(14, 9.5 + MV.z * 1.1)), boxes = [], fam = getComputedStyle(document.documentElement).getPropertyValue("--f-display") || "sans-serif";
    cx.save(); cx.textAlign = "center"; cx.textBaseline = "middle"; cx.lineJoin = "round";
    try { cx.letterSpacing = (fs * 0.16).toFixed(1) + "px"; } catch (e) {}
    [1, 2].forEach(function (tier) {
      if (tier === 2 && MV.z < 1.45) return;
      var f = tier === 1 ? fs : fs - 1.5; cx.font = "700 " + f + "px " + fam;
      list.forEach(function (a) {
        if (a[3] !== tier) return;
        var x = MV.x + a[1] * s, y = MV.y + a[2] * s + 18; if (x < -80 || y < -20 || x > W + 80 || y > H + 20) return;
        var words = a[0].toUpperCase().split(" "), lines = [words[0]];
        for (var k = 1; k < words.length; k++) { if ((lines[lines.length - 1] + " " + words[k]).length <= 13) lines[lines.length - 1] += " " + words[k]; else lines.push(words[k]); }
        var w = 0; lines.forEach(function (l) { w = Math.max(w, cx.measureText(l).width); });
        var h = lines.length * f * 1.22, b = [x - w / 2 - 6, y - h / 2 - 3, x + w / 2 + 6, y + h / 2 + 3];
        for (var q = 0; q < boxes.length; q++) if (b[0] < boxes[q][2] && b[2] > boxes[q][0] && b[1] < boxes[q][3] && b[3] > boxes[q][1]) return;
        boxes.push(b);
        lines.forEach(function (l, n) {
          var ly = y - h / 2 + f * 0.61 + n * f * 1.22;
          cx.lineWidth = 3.2; cx.strokeStyle = "rgba(6,7,12,.82)"; cx.strokeText(l, x, ly);
          cx.fillStyle = tier === 1 ? "rgba(241,236,225,.96)" : "rgba(241,236,225,.78)"; cx.fillText(l, x, ly);
        });
      });
    });
    cx.restore();
  }
  var mkRaf = 0, mkPts = [];
  function mkSoon() { if (!mkRaf) mkRaf = requestAnimationFrame(function () { mkRaf = 0; mkDraw(); }); }
  function mkDraw() {
    var box = $("#mview"), cv = $("#mkc"); if (!box || !cv) return;
    var W = box.clientWidth, H = box.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var cx = cv.getContext("2d"); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    mkPts = [];
    var key = mapImgKey(), d = MAPIMG[key], data = MK[key];
    if (!d || !data) return;
    if (MV.plan) { mkAreas(cx, Math.min(W / d.w, H / d.h) * MV.z, W, H); planDraw(cx, data, Math.min(W / d.w, H / d.h) * MV.z, W, H, dpr); return; }
    var s = Math.min(W / d.w, H / d.h) * MV.z, f = mkFocus(), list = data.m, on = [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (f ? !f.match(r) : !mkVisible(r)) continue;
      var x = MV.x + r[0] * s, y = MV.y + r[1] * s;
      if (x < -30 || y < -40 || x > W + 30 || y > H + 30) continue;
      on.push([x, y, i]);
    }
    if (f) {
      var pw = Math.round(22 + Math.min(8, (MV.z - 1) * 2)), ph = pw * 38 / 30;
      if (f.route) {
        // one stop per step, each the closest to the step before, joined by a dashed line
        var bySt = {}; on.forEach(function (p) { var st = data.s && data.s[p[2]]; if (st) (bySt[st] = bySt[st] || []).push(p); });
        var steps = Object.keys(bySt).map(Number).sort(function (a, b) { return a - b; }), path = [];
        steps.forEach(function (st) { var c = bySt[st], prev = path[path.length - 1]; path.push(prev ? c.slice().sort(function (a, b) { return Math.hypot(a[0] - prev[0], a[1] - prev[1]) - Math.hypot(b[0] - prev[0], b[1] - prev[1]); })[0] : c[0]); });
        if (path.length > 1) {
          cx.save(); cx.lineWidth = 3; cx.strokeStyle = "rgba(196,155,255,.85)"; cx.setLineDash([7, 6]); cx.lineCap = "round";
          cx.shadowColor = "rgba(0,0,0,.7)"; cx.shadowBlur = 4;
          cx.beginPath(); path.forEach(function (p, k) { if (k) cx.lineTo(p[0], p[1] - 2); else cx.moveTo(p[0], p[1] - 2); }); cx.stroke(); cx.restore();
        }
      }
      mkAreas(cx, s, W, H);
      on.sort(function (a, b) { return a[1] - b[1]; });
      on.forEach(function (p) {
        var st = f.route && data.s ? data.s[p[2]] : 0;
        cx.drawImage(sprPin(f.kind, f.kind === "item" ? f.id : "", st ? String(st) : "", pw, dpr), p[0] - pw / 2, p[1] - ph, pw, ph);
        mkPts.push([p[0], p[1] - ph * 0.62, p[2], ph * 0.45]);
      });
      return;
    }
    // a lot on screen: containers, plants and ARC shrink to small shapes; places always keep their icon
    var dense = on.length > 320 && MV.z < 4.5, zb = Math.min(6, (MV.z - 1) * 1.8);
    var rank = function (p) { var g = MKTG[list[p[2]][2]]; return g ? MKG.indexOf(g) : 0; };
    on.sort(function (a, b) { return rank(b) - rank(a); });
    on.forEach(function (p) {
      var ti = list[p[2]][2], g = MKTG[ti] || MKGI.loc, place = !g.cat || g.k === "loc", ret = g.sh === "fill";
      var mini = dense && !place, size = mini ? Math.round(8 + Math.min(4, MV.z - 1)) : Math.round((ret ? 21 : place ? 18 : 16) + zb), sp = sprBadge(mkLook(ti), size, dpr, !mini);
      cx.drawImage(sp, p[0] - (size + 4) / 2, p[1] - (size + 4) / 2, size + 4, size + 4);
      mkPts.push([p[0], p[1], p[2], size / 2 + 3]);
    });
    mkAreas(cx, s, W, H);
  }
  function mkHit(px, py) {
    var best = null, bd = 1e9;
    for (var i = mkPts.length - 1; i >= 0; i--) { var p = mkPts[i], dd = Math.hypot(p[0] - px, p[1] - py); if (dd < Math.max(9, p[3]) && dd < bd) { bd = dd; best = p; } }
    return best;
  }
  function mkTip(p, ev) {
    var sk = planStopAt(p[2]); if (sk > -1) { planTipAt(planStopTip(sk), { left: ev.clientX - 14, top: ev.clientY - 14, width: 28, height: 28, right: ev.clientX + 14, bottom: ev.clientY + 14 }); return; }
    var data = MK[mapImgKey()], r = data.m[p[2]], ty = MKT[r[2]], g = MKTG[r[2]], f = mkFocus();
    var nmx = data.n[p[2]], sub = [g ? t(g.n) : "", ty[2]].filter(function (x, i, a) { return x && a.indexOf(x) === i; }).join(" · ");
    var body = [], st = f && f.route && data.s ? data.s[p[2]] : 0;
    if (st && f.route[st - 1]) body.push(t("Step") + " " + st + ": " + f.route[st - 1]);
    if (r[4]) body.push(t("Loot area") + ": " + mkLootTxt(r[4]));
    if (r[3] & 1) body.push(t("Behind a locked door"));
    if (r[3] & 2) body.push(t("Only during some map conditions"));
    tt.innerHTML = "<b>" + esc(nmx || ty[2]) + "</b><small>" + esc(sub) + "</small>" + (body.length ? "<p>" + body.map(esc).join("<br>") + "</p>" : "");
    tt.hidden = false;
    var w = tt.offsetWidth, h = tt.offsetHeight, x = Math.max(8, Math.min(innerWidth - w - 8, ev.clientX - w / 2)), y = ev.clientY - h - 18;
    if (y < 8) y = ev.clientY + 18;
    tt.style.left = x + "px"; tt.style.top = y + "px";
  }
  function mkCounts(key) {
    var data = MK[key], c = {}; if (!data) return c;
    data.m.forEach(function (r) { var g = MKTG[r[2]]; if (!g) return; c[g.k] = (c[g.k] || 0) + 1; var tk = MKT[r[2]][0] + ":" + MKT[r[2]][1]; c[tk] = (c[tk] || 0) + 1; });
    return c;
  }
  function mkIcon(g, path) {
    var sh = g.sh === "sq" ? '<rect x="2.5" y="2.5" width="19" height="19" rx="4"/>' : g.sh === "dia" ? '<path class="s" d="M12 1.2 22.8 12 12 22.8 1.2 12z"/>' : g.sh === "hex" ? '<path class="s" d="M12 1.5l9.1 5.25v10.5L12 22.5l-9.1-5.25V6.75z"/>' : '<circle cx="12" cy="12" r="10.3"/>';
    return '<svg class="mlsw' + (g.sh === "fill" ? " fill" : "") + '" viewBox="0 0 24 24" style="--c:' + g.c + '">' + sh + '<path transform="translate(2.6 2.6) scale(.78)" d="' + (path || g.g) + '"/></svg>';
  }
  function mkSubIcon(tk, g) { var red = tk.indexOf("containers:") === 0 && MKARCBOX[tk.slice(11)]; return mkIcon(g, red ? MKGI.arc.g : MKSUB[tk]); }
  var mkOpen = {};
  function renderLayers() {
    var el = $("#mlayp"); if (!el) return;
    var key = mapImgKey(), c = mkCounts(key), f = mkFocus();
    if (!MK[key]) { el.innerHTML = '<p class="dim">' + esc(t("Loading markers…")) + "</p>"; return; }
    var html = '<div class="mlh2"><b>' + esc(t("Filter map")) + '</b><button type="button" class="mlx" data-mlclose aria-label="' + esc(t("Close")) + '">×</button></div>';
    if (f) html += '<label class="mlr mlonly"><input type="checkbox" data-mlfoc checked><span>' + esc(t("Only")) + ": <b>" + esc(f.name) + "</b></span></label>" +
      '<p class="mlnote2">' + esc(t("Everything else is hidden. Untick this, or tick anything below, to go back to your filter.")) + "</p>";
    var pins = keysOnImg(key);
    if (pins.length) html += '<label class="mlr"><input type="checkbox" data-mlkeys' + (MV.keys && !f ? " checked" : "") + '><svg class="mlsw key" viewBox="0 0 30 38"><path d="M15 37C15 37 2 22 2 14a13 13 0 0 1 26 0c0 8-13 23-13 23z"/><circle cx="11.5" cy="13" r="4"/><path d="M15 14.5h8m-3 0v3.5m3-3.5v2.5"/></svg><span>' + esc(t("Key rooms")) + "</span><small>" + pins.length + "</small></label>";
    if ((MAREAS[key] || []).length) html += '<label class="mlr"><input type="checkbox" data-mlnames' + (mkLay.names !== false ? " checked" : "") + '><span class="mlaa" aria-hidden="true">Aa</span><span>' + esc(t("Area names")) + "</span><small>" + MAREAS[key].length + "</small></label>";
    MKG.forEach(function (g) {
      if (!c[g.k]) return;
      var subs = [];
      if (g.sub) MKT.forEach(function (ty, i) { var tk = ty[0] + ":" + ty[1]; if (MKTG[i] === g && c[tk]) subs.push([tk, ty[2], c[tk]]); });
      subs.sort(function (a, b) { return b[2] - a[2]; });
      var gon = mkLay.g[g.k] && !f;
      html += '<div class="mlg"><label class="mlr"><input type="checkbox" data-mlg="' + g.k + '"' + (gon ? " checked" : "") + ">" + mkIcon(g) + "<span>" + esc(t(g.n)) + "</span><small>" + fmt(c[g.k]) + "</small>" +
        (subs.length > 1 ? '<button type="button" class="mlexp" data-mlexp="' + g.k + '" aria-expanded="' + !!mkOpen[g.k] + '" aria-label="' + esc(t("Show types")) + '"></button>' : "") + "</label>";
      if (subs.length > 1 && mkOpen[g.k]) html += '<div class="mlsub">' + subs.map(function (s) { return '<label class="mlr"><input type="checkbox" data-mlt="' + esc(s[0]) + '"' + (!mkLay.off[s[0]] && gon ? " checked" : "") + (gon ? "" : " disabled") + ">" + mkSubIcon(s[0], g) + "<span>" + esc(s[1]) + "</span><small>" + fmt(s[2]) + "</small></label>"; }).join("") + "</div>";
      html += "</div>";
    });
    html += '<div class="mlfoot"><button type="button" class="chip orb" data-mlall="1">' + esc(t("All on")) + '</button><button type="button" class="chip orb" data-mlall="0">' + esc(t("All off")) + '</button></div><p class="mlsrc">' + t("Markers from the <a href=\"https://metaforge.app/arc-raiders\" target=\"_blank\" rel=\"noopener\">MetaForge</a> community map.") + "</p>";
    el.innerHTML = html;
  }
  function mkKeyPins() {
    var pn = $("#mview .pins"); if (!pn) return;
    pn.innerHTML = MV.keys && !mkFocus() && !MV.plan ? pinGroups(keysOnImg(mapImgKey()), mapImgKey()).map(function (g) { return pinHtml(g, MAPIMG[mapImgKey()]); }).join("") : "";
  }
  function renderFocus() {
    var el = $("#mfoc"); if (!el) return;
    var f = mkFocus();
    if (!f) { el.hidden = true; el.innerHTML = ""; return; }
    var n = mkFocusCount(f, curMap), here = curMap === "stella" ? f.c["stella_" + MV.layer] || 0 : n;
    var other = MAP_ORDER.filter(function (k) { return k !== curMap && mkFocusCount(f, k); });
    var data = MK[mapImgKey()], present = {};
    if (f.route && data && data.s) Object.keys(data.s).forEach(function (i) { if (f.match(data.m[i])) present[data.s[i]] = 1; });
    var cnt = here ? fmt(here) + " " + esc(t(f.kind === "quest" ? (here === 1 ? "spot" : "spots") : here === 1 ? "marked spot" : "marked spots")) + (curMap === "stella" && n !== here ? " " + esc(t("on this floor")) + " (" + fmt(n) + " " + esc(t("in total")) + ")" : "") : esc(t("Nothing marked on this map"));
    var icon = f.kind === "item" ? thumb(f.id) : '<span class="th mfq"><svg viewBox="0 0 24 24"><path d="' + MKGI.qst.g + '"/></svg></span>';
    var steps = f.route ? '<ol class="mfst">' + f.route.map(function (x, i) { return "<li" + (present[i + 1] ? "" : ' class="no"') + "><i>" + (i + 1) + "</i>" + esc(x) + "</li>"; }).join("") + "</ol>" : "";
    el.hidden = false; el.className = "mfoc" + (f.kind === "quest" ? " q" : "");
    el.innerHTML = icon + '<div class="mfb"><b>' + esc(f.name) + '</b><span>' + (f.route ? esc(t("Route")) + " · " : "") + cnt + "</span>" + (f.what ? "<small>" + esc(f.what) + "</small>" : "") + steps +
      (other.length ? '<div class="mfo">' + esc(t("Also on")) + ": " + other.map(function (k) { return '<button type="button" data-mfmap="' + k + '">' + esc(MAPS[k].name) + " <em>" + fmt(mkFocusCount(f, k)) + "</em></button>"; }).join("") + "</div>" : "") +
      '</div><div class="mfa"><button type="button" class="mfx" data-mfclear aria-label="' + esc(t("Show my filter again")) + '" title="' + esc(t("Show my filter again")) + '">×</button>' + (f.kind === "item" ? '<button type="button" class="chip orb" data-find="' + esc(f.name) + '">' + esc(t("Item details")) + "</button>" : '<a class="chip orb" href="#quests">' + esc(t("Quest tracker")) + "</a>") + "</div>";
  }
  function mkFit() {
    var box = $("#mview"), key = mapImgKey(), d = MAPIMG[key], data = MK[key], f = mkFocus(); if (!box || !d || !data || !f) return;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    data.m.forEach(function (r) { if (f.match(r)) { n++; x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[0]); y1 = Math.max(y1, r[1]); } });
    var W = box.clientWidth, H = box.clientHeight, base = Math.min(W / d.w, H / d.h);
    if (!n) { MV.z = 1; MV.x = 0; MV.y = 0; mvApply(); return; }
    var pad = 70, z = Math.min((W - pad * 2) / Math.max(60, x1 - x0), (H - pad * 2) / Math.max(60, y1 - y0)) / base;
    MV.z = Math.max(1, Math.min(4, z)); var s = base * MV.z;
    MV.x = W / 2 - (x0 + x1) / 2 * s; MV.y = H / 2 - (y0 + y1) / 2 * s + 20; mvApply();
  }
  function mkShow(kind, id, mapKey) {
    var c = kind === "item" ? mkSpots(id) : (QIDX[id] && QIDX[id].mk && QIDX[id].mk.c) || {};
    var cnt = function (k) { return k === "stella" ? (c.stella_u || 0) + (c.stella_l || 0) : c[k] || 0; };
    var k = mapKey || (cnt(curMap) ? curMap : MAP_ORDER.filter(cnt).sort(function (a, b) { return cnt(b) - cnt(a); })[0]) || curMap;
    if (k === "stella") MV.layer = (c.stella_l || 0) > (c.stella_u || 0) ? "l" : "u";
    MV.item = kind === "item" ? id : ""; MV.quest = kind === "quest" ? id : ""; MV.layersOpen = false; MV.plan = null;
    var same = k === curMap && location.hash === "#maps";
    if (!same) { curMap = k; MV.z = 1; MV.x = 0; MV.y = 0; renderMapList(); renderMapDetail(); go("maps"); }
    else { var keep = { z: MV.z, x: MV.x, y: MV.y }; renderMapDetail(); MV.z = keep.z; MV.x = keep.x; MV.y = keep.y; }
    setTimeout(function () {
      var box = $("#mview"); if (!box) return;
      var top = box.getBoundingClientRect().top + window.pageYOffset - Math.max(80, (innerHeight - box.offsetHeight) / 2);
      window.scrollTo({ top: Math.max(0, top), behavior: same ? "smooth" : "instant" });
      mkGet(mapImgKey(), function () { mkFit(); renderFocus(); });
    }, 80);
  }
  function mapShowItem(id, mapKey) { if (!IDX[id] || !IDX[id].sp) { findItem(nm(id)); return; } mkShow("item", id, mapKey); }
  function mapShowQuest(id, mapKey) { if (QIDX[id] && QIDX[id].mk) mkShow("quest", id, mapKey); }
  function mapClearItem() { MV.item = ""; MV.quest = ""; var keep = { z: MV.z, x: MV.x, y: MV.y }; renderMapDetail(); MV.z = keep.z; MV.x = keep.x; MV.y = keep.y; mvApply(); }
  function mkUIClick(e, box) {
    if (e.target.closest("button[data-mlay]") && MV.plan) planClose();
    if (e.target.closest("button[data-mlay]") || e.target.closest("[data-mlclose]")) { MV.layersOpen = !MV.layersOpen; var lp = $("#mlayp"), lb = box.querySelector("[data-mlay]"); lp.hidden = !MV.layersOpen; if (lb) lb.setAttribute("aria-expanded", String(MV.layersOpen)); if (MV.layersOpen) renderLayers(); return true; }
    var ex = e.target.closest("[data-mlexp]"); if (ex) { e.preventDefault(); mkOpen[ex.dataset.mlexp] = !mkOpen[ex.dataset.mlexp]; renderLayers(); return true; }
    var al = e.target.closest("[data-mlall]"); if (al) { var on = al.dataset.mlall === "1"; MKG.forEach(function (g) { mkLay.g[g.k] = on; }); mkLay.off = {}; MV.keys = on; MV.item = MV.quest = ""; mkSave(); renderFocus(); mkKeyPins(); renderLayers(); mkSoon(); renderMapLoot(); return true; }
    if (e.target.closest("[data-mfclear]")) { mapClearItem(); return true; }
    var fm = e.target.closest("[data-mfmap]"); if (fm) { if (MV.quest) mapShowQuest(MV.quest, fm.dataset.mfmap); else mapShowItem(MV.item, fm.dataset.mfmap); return true; }
    return false;
  }
  function mkUIChange(e) {
    var c = e.target; if (!c.matches || !c.matches("input[type=checkbox]")) return;
    var hadFocus = !!mkFocus();
    if (c.hasAttribute("data-mlfoc")) { MV.item = MV.quest = ""; }
    else {
      if (hadFocus) { MV.item = MV.quest = ""; }
      if (c.dataset.mlg) { mkLay.g[c.dataset.mlg] = c.checked; }
      else if (c.dataset.mlt) { if (c.checked) delete mkLay.off[c.dataset.mlt]; else mkLay.off[c.dataset.mlt] = 1; }
      else if (c.hasAttribute("data-mlkeys")) MV.keys = c.checked;
      else if (c.hasAttribute("data-mlnames")) { mkLay.names = c.checked; mkSave(); }
    }
    mkSave(); renderFocus(); mkKeyPins(); renderLayers(); mkSoon();
    if (hadFocus) renderMapLoot();
  }


