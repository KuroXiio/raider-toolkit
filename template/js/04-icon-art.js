  /* ---------- Icon art (original) ---------- */
  var DUCKS = { "Rubber Duck": "#f6d34a", "Tropical Duck": "#3fd8a8", "Gentle Duck": "#f7a8c8", "Alien Duck": "#86e06a", "Doodly Duck": "#ff9b3d", "Flashy Duck": "#4fb3ff", "Familiar Duck": "#c28bff" };
  var SM = {
    wrench: '<svg viewBox="0 0 24 24"><path d="M21 6.5a5 5 0 0 1-6.6 4.7L7 18.6a2 2 0 1 1-2.8-2.8l7.4-7.4A5 5 0 0 1 17.5 2l-3 3 .5 3.5L18.5 9l3-2.5z" fill="#fff"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="#fff"/></svg>',
    gem: '<svg viewBox="0 0 24 24"><path d="M12 2l8 8-8 12L4 10z" fill="#fff"/></svg>',
    ring: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="#fff" stroke-width="3"/></svg>',
    aim: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6" stroke="#fff" stroke-width="2.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="#fff"/></svg>'
  };
  var GUNS = ["Assault Rifle", "SMG", "Pistol", "Shotgun", "Battle Rifle", "Hand Cannon", "LMG", "Sniper Rifle"];
  var A = "#a9b8d2", D = "#0b1024";
  function big(i) {
    var t = i.t, f = i.f || "", c;
    if (DUCKS[i.n]) { c = DUCKS[i.n]; return '<svg class="gl" viewBox="0 0 64 64"><ellipse cx="30" cy="42" rx="20" ry="13" fill="' + c + '"/><circle cx="42" cy="24" r="11" fill="' + c + '"/><path d="M51 23l10 3-10 4z" fill="#ff8a3d"/><circle cx="45" cy="21" r="1.9" fill="' + D + '"/><path d="M14 40c6 5 14 5 20 0" stroke="rgba(0,0,0,.28)" fill="none" stroke-width="2.4"/></svg>'; }
    if (t === "Trinket") return '<svg class="gl" viewBox="0 0 64 64"><path d="M32 8l20 14-20 34L12 22z" fill="#d6defa"/><path d="M12 22h40M32 8l-8 14 8 34 8-34z" stroke="' + D + '" stroke-width="2" fill="none"/></svg>';
    if (GUNS.indexOf(t) > -1) return '<svg class="gl" viewBox="0 0 64 64"><path d="M6 26h38l4-4h10v8h-8l-2 4H34l-2 14H22l2-14H6z" fill="' + A + '"/><rect x="12" y="29" width="14" height="3" fill="' + D + '"/></svg>';
    if (t === "Ammunition") return '<svg class="gl" viewBox="0 0 64 64"><g fill="' + A + '"><rect x="14" y="22" width="10" height="28" rx="2"/><rect x="27" y="22" width="10" height="28" rx="2"/><rect x="40" y="22" width="10" height="28" rx="2"/></g><g fill="#e8b25c"><path d="M14 22l5-10 5 10zM27 22l5-10 5 10zM40 22l5-10 5 10z"/></g></svg>';
    if (t === "Key") return '<svg class="gl" viewBox="0 0 64 64"><circle cx="22" cy="32" r="12" fill="none" stroke="' + A + '" stroke-width="6"/><path d="M34 32h24M50 32v10M58 32v8" stroke="' + A + '" stroke-width="6"/></svg>';
    if (t === "Blueprint") return '<svg class="gl" viewBox="0 0 64 64"><rect x="10" y="12" width="44" height="40" rx="3" fill="#2d5fa8"/><path d="M10 26h44M10 38h44M24 12v40M38 12v40" stroke="#7fb0f0" stroke-width="1.6"/><circle cx="38" cy="32" r="7" fill="none" stroke="#fff" stroke-width="2"/></svg>';
    if (t === "Quick Use") return '<svg class="gl" viewBox="0 0 64 64"><rect x="22" y="22" width="20" height="32" rx="6" fill="' + A + '"/><rect x="26" y="12" width="12" height="10" rx="2" fill="#7e8ca8"/><path d="M40 14l8-4" stroke="' + A + '" stroke-width="3"/><rect x="22" y="34" width="20" height="5" fill="' + D + '"/></svg>';
    if (t === "Modification") return '<svg class="gl" viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="' + A + '"/><circle cx="32" cy="32" r="6" fill="' + D + '"/><g stroke="' + A + '" stroke-width="6"><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6"/></g></svg>';
    if (t === "Shield" || t === "Augment") return '<svg class="gl" viewBox="0 0 64 64"><path d="M32 8l20 7v15c0 12-9 21-20 26C21 51 12 42 12 30V15z" fill="' + A + '"/><path d="M32 16v34" stroke="' + D + '" stroke-width="3"/></svg>';
    if (t === "Nature") return '<svg class="gl" viewBox="0 0 64 64"><path d="M14 50C14 26 28 12 52 12c0 24-12 38-34 38" fill="#5fcf6e"/><path d="M14 50L40 24" stroke="' + D + '" stroke-width="2.5" fill="none"/></svg>';
    if (f.indexOf("ARC") === 0) return '<svg class="gl" viewBox="0 0 64 64"><rect x="16" y="16" width="32" height="32" rx="4" fill="' + A + '"/><rect x="25" y="25" width="14" height="14" fill="' + D + '"/><path d="M22 10v6M32 10v6M42 10v6M22 48v6M32 48v6M42 48v6M10 22h6M10 32h6M10 42h6M48 22h6M48 32h6M48 42h6" stroke="' + A + '" stroke-width="3"/></svg>';
    return '<svg class="gl" viewBox="0 0 64 64"><path d="M32 8l20 12v24L32 56 12 44V20z" fill="' + A + '"/><circle cx="32" cy="32" r="9" fill="' + D + '"/></svg>';
  }
  function small(i) {
    if (DUCKS[i.n]) return SM.ring;
    if (i.t === "Trinket") return SM.gem;
    if (GUNS.indexOf(i.t) > -1) return SM.aim;
    if (i.t === "Quick Use") return SM.plus;
    if ((i.f || "").indexOf("ARC") === 0) return SM.bolt;
    return SM.wrench;
  }
  function short(v) { if (v == null) return "?"; return v >= 1000 ? (Math.round(v / 100) / 10) + "K" : String(v); }
  function art(i) { return ICONS[i.id] ? '<img class="gl" alt="" loading="lazy" src="' + ICONS[i.id] + '">' : big(i); }
  function thumb(id) { var it = IDX[id]; return '<span class="th" style="--rc:' + rcol(it && it.r) + '">' + (ICONS[id] ? '<img alt="" loading="lazy" decoding="async" src="' + ICONS[id] + '">' : "<i></i>") + "</span>"; }
  function tile(i) {
    return '<div class="tile orb"><div class="tin"><i class="sw"></i>' + art(i) + '<div class="strip">' + small(i) + "<b>" + short(i.v) + "</b></div></div></div>";
  }

