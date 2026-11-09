  var LANG = store("rt-lang") || "en";
  function t(s) { var d = I18N[LANG]; return (d && d[s]) || s; }
  function applyI18nStatic() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    document.documentElement.lang = LANG;
    var sel = $("#langSel"); if (sel) sel.value = LANG;
  }

  var DATA_INFO = /*DATAINFO*/;
  var ARC_PROXY = /*ARCPROXY*/"";
  var ADMIN_HASH = /*ADMINHASH*/;
  var FIX = store("rt-fix") || {};
  var ORIG = {};
  function applyFixes() {
    Object.keys(FIX).forEach(function (id) {
      var it = IDX[id], f = FIX[id]; if (!it) return;
      if (!ORIG[id]) ORIG[id] = { v: it.v, r: it.r };
      if (f.v != null && f.v !== "") it.v = +f.v;
      if (f.r) it.r = f.r;
      it.mine = 1; if (f.note) it.myNote = f.note;
    });
  }
  applyFixes();
  function pretty(id) { return id.replace(/_/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function nm(id) { return IDX[id] ? IDX[id].n : pretty(id); }
  var BENCH = { weapon_bench: "Gunsmith", equipment_bench: "Gear Bench", explosives_bench: "Explosives Station", med_station: "Medical Lab", refiner: "Refiner", utility_bench: "Utility Station", workbench: "Workbench", in_raid: "In-raid crafting", scrappy: "Scrappy" };
  var RAR = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Amplified"];
  function rcol(r) { return "var(--r-" + String(r || "Common").toLowerCase() + ")"; }

  var MAPS = {
    dam: { name: "Dam Battlegrounds", unlock: "Available from the start", zip: 17,
      blurb: "Waterlogged woodland around the Alcantara Power Plant, known as The Dam. A first-wave Raider stronghold and a constant ARC fight.",
      pois: ["The Dam", "Swamp", "Red Lakes", "Power Generation Complex", "Water Treatment Control", "Research & Administration", "Control Tower", "Testing Annex", "Old Battleground", "Hydroponic Dome Complex", "Primary Facility", "Pattern House", "South Swamp Outpost"],
      events: ["Harvester", "Matriarch", "Night Raid", "Uncovered Caches", "Husk Graveyard", "Lush Blooms", "Prospecting Probes"] },
    buried: { name: "Buried City", unlock: "Unlocks after 6 matches", zip: 51,
      blurb: "A pre-collapse city half swallowed by sand: apartment blocks, plazas, a hospital and a mall. Narrow streets funnel fights around the high-value points.",
      pois: ["Hospital", "Pharmacy", "Marana Park", "Santa Maria Houses", "Plaza Rosa", "Piazza Roma", "Town Hall"],
      events: ["Bird City", "Prospecting Probes", "Uncovered Caches", "Husk Graveyard", "Night Raid", "Lush Blooms"] },
    space: { name: "The Spaceport", unlock: "Unlocks after 12 matches", zip: 27,
      blurb: "Acerra Spaceport, launch site of the Exodus fleet. Launch towers, hangars and warehouses hold plenty of salvage, and ARC defenses are tight.",
      pois: ["Control Tower", "Rocket Assembly", "Launch tower", "Container yard", "Bunker"],
      events: ["Launch Tower Loot"] },
    gate: { name: "The Blue Gate", unlock: "Unlocks after 18 matches", zip: 33,
      blurb: "A once-busy mountain hub with ridgelines, villages and underground tunnels. Large, open and heavy with ARC units.",
      pois: ["Pilgrim's Peak", "Reinforced Reception", "Ben Welder's Sunroof", "Raider's Refuge secret bunker", "Underground tunnels"],
      events: ["Night Raid"] },
    stella: { name: "Stella Montis", unlock: "Later-game map", zip: 16, blurb: "A research facility in the snow with an upper and a lower floor. Area names below are the labels on the game map.", pois: ["Lobby Metro", "Robotic Sandbox A", "Robotic Sandbox B", "Control Room", "Logistics Admin", "Loading Bay", "Eastern Tunnel", "Western Tunnel", "Seed Vault", "Assembly Workshops", "Assembly", "Security Bridge", "Lobby", "Business Center", "Medical Research", "Cultural Archives", "Communications", "Atrium", "Cafeteria", "Storage Room"], events: [] },
    riven: { name: "Riven Tides", unlock: "Later-game map", zip: 15, blurb: "Takes Raiders to the western coast of the Rust Belt. The sources used here list no confirmed item spawn notes for it yet.", pois: ["Hotel Panorama Azzurro", "Port Authority Building", "Stacking Yard", "Crane House", "Customs House", "Harbor"], events: [] }
  };
  MAPS.pendola = { name: "Pendola Pass", unlock: "Added in update 2.x (October 2026)", zip: 13,
    blurb: "The newest map, from the Frozen Trail update. Old Town on the west side has houses and a supermarket to search. Frigates and the fallen Emperor here drop Amplification Modules.",
    pois: ["Old Town", "Old Hamlet", "Commissary Supermarket", "Almatera Station", "Railyard", "Controlled Receiving Facility", "Cielo Sereno Observatory", "Deep-Space Telescope", "Northern Tracks"], events: ["Frigate"] };
  var AMAPS = { dam: "dam", buried: "buried-city", space: "spaceport", gate: "blue-gate", stella: "stella-montis", riven: "riven-tides", pendola: "pendola-pass" };
  var MAP_ORDER = ["dam", "buried", "space", "gate", "stella", "riven", "pendola"];
