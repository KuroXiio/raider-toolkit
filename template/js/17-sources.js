  /* ---------- Sources ---------- */
  function renderSources() {
    var s = {};
    Object.keys(GUIDE).forEach(function (k) { s[GUIDE[k].s] = 1; });
    WEAPONS.forEach(function (w) { if (w.bpl && w.bpl[1]) s[w.bpl[1]] = 1; });
    Object.keys(MODS).forEach(function (k) { var m = MODS[k]; if (m.bpl && m.bpl[1]) s[m.bpl[1]] = 1; });
    KEYS.forEach(function (k) { (k.src || []).forEach(function (x) { s[x] = 1; }); });
    // one clean list of outlets: "KeenGamer 2.0 patch notes, Oct 8 2026 and Metaforge, ..." -> KeenGamer, MetaForge
    var outlets = {};
    Object.keys(s).forEach(function (src) {
      src.replace(/\([^)]*\)/g, "").split(/ and /).forEach(function (part) {
        part.split(",").forEach(function (bit, i) {
          bit = bit.trim();
          if (!bit || /^(updated )?([A-Z][a-z]{2} )?\d/.test(bit) || /^Game data/.test(bit) || (i > 0 && /\d/.test(bit))) return;
          bit = bit.replace(/ (\d\.\d )?(patch notes|wiki|workshop guide)$/i, "").replace(/^Metaforge$/, "MetaForge");
          outlets[bit] = 1;
        });
      });
    });
    function fmtD(d) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(d || ""); return m ? +m[3] + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[2] - 1] + " " + m[1] : (d || ""); }
    function a(href, txt) { return '<a href="' + href + '" target="_blank" rel="noopener">' + txt + "</a>"; }
    $("#srcBody").innerHTML = "<p>The site rebuilds itself every day from these sources, so anything they publish shows up here within a day.</p><ul>" +
      "<li><b>Game data:</b> " + a("https://github.com/RaidTheory/arcraiders-data", "RaidTheory/arcraiders-data") + " (MIT licence), the data set behind " + a("https://arctracker.io", "arctracker.io") + ": items, recipes, recycling, weapons, attachments, vendors, quests and Workshop levels 1 to 3. Last updated " + esc(DATA_INFO.baseDate) + ".</li>" +
      "<li><b>" + a("https://metaforge.app/arc-raiders", "MetaForge") + ":</b> current item values, rarity, weight and loot areas, items added in 2.x, and the map markers (containers, extractions, hatches, spawns, ARC, plants, events, key doors and quest spots). Fetched " + esc(DB.mf && DB.mf.at ? fmtD(DB.mf.at) : "not yet") + ".</li>" +
      "<li><b>ARCTracker:</b> research costs for each blueprint, and your own stash, stations, blueprints and quests if you link it.</li>" +
      "<li><b>" + a("https://arcraiders.wiki/wiki/Category:Map_overview_images", "ARC Raiders Wiki") + ":</b> the map images.</li>" +
      (DB.skills ? "<li><b>" + esc(t("Skill tree")) + ":</b> the 2.0 tree from the Frozen Trail patch notes and community guides, with icons and max-rank values from MetaForge's skill builder. Sources: " + esc(DB.skills.src.join(" · ")) + ".</li>" : "") +
      (EV ? "<li><b>thearcraiders.wiki:</b> the map condition rotation, recorded " + esc(fmtD(EV.rec)) + ".</li>" : "") +
      "<li><b>Community guides</b> from October and November 2026 (update 2.x): Gunsmith IV, the Outpost, the Research Station, Pendola Pass, new materials, amplification, Research Points and the newest blueprint locations.</li></ul>" +
      '<p class="dim">Guides used for where-to-find notes and 2.x data: ' + esc(Object.keys(outlets).sort(function (x, y) { return x.toLowerCase() < y.toLowerCase() ? -1 : 1; }).join(" · ")) + ".</p>";
    var gaps = [], wip = WEAPONS.filter(function (w) { return w.wip; }).map(function (w) { return w.n; });
    var noVR = ITEMS.filter(function (i) { return i.v == null || i.r == null; }).map(function (i) { return i.n; }).sort();
    var noPin = KEYS.filter(function (k) { return !k.pin && k.m !== "any"; }).map(function (k) { return nm(k.id); });
    function list(x) { return x.length > 1 ? x.slice(0, -1).join(", ") + " and " + x[x.length - 1] : x[0]; }
    gaps.push("Amplification Module quantities and most Research node costs are not published yet.");
    gaps.push("The game data does not say which Gunsmith level each weapon tier upgrade needs.");
    if (wip.length) gaps.push(esc(list(wip)) + (wip.length > 1 ? " are" : " is") + " not in the Weapon calculator until " + (wip.length > 1 ? "their recipes are" : "its recipe is") + " published.");
    if (noVR.length) gaps.push(noVR.length + (noVR.length > 1 ? " items have" : " item has") + " no value or rarity yet: " + esc(list(noVR)) + ".");
    if (noPin.length) gaps.push(esc(list(noPin)) + (noPin.length > 1 ? " have" : " has") + " no map pin, because the door is not on the community map yet.");
    gaps.push("The map images have no area names or loot icons, so use the area types under each map, or the in-game map.");
    gaps.push("Most containers on the community map are not tagged with a loot area, so item spots are a place to start looking, not a full list.");
    gaps.push("Map condition timers are estimates and can be off now and then.");
    if (DB.skills) gaps.push("The game data set still has the old skill tree, so the 2.0 tree is kept by hand. ARCTracker does not share skill trees, so your own can't be loaded.");
    var gb = $("#gapsBody"); if (gb) gb.innerHTML = '<ul class="gaps"><li>' + gaps.join("</li><li>") + "</li></ul>";
  }
