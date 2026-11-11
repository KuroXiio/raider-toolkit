  /* ---------- Map conditions (estimated from the recorded rotation) ---------- */
  var EV = DB.ev, EVREG = [["eu", "Europe", 0], ["na", "North America", 7], ["sa", "South America", 6], ["as", "Asia", -5], ["oc", "Oceania", -9]];
  var evReg = store("rt-evreg") || "eu";
  function evOff() { var r = EVREG.filter(function (x) { return x[0] === evReg; })[0]; return r ? r[2] : 0; }
  function evMod(a, n) { return ((a % n) + n) % n; }
  function evAt(m, h) {
    var c = EV && EV.m[m]; if (!c) return "";
    var per = EV.per, parts = (c[evMod(h - evOff(), per)] || "").split(" + ").filter(function (x) { return x && x !== "Redirection"; });
    if (m === "pendola" && (c[evMod(h, per)] || "").indexOf("Redirection") > -1) parts.push("Redirection");
    return parts.join(" + ");
  }
  function evClock(sec) { sec = Math.max(0, Math.floor(sec)); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ":" : "") + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }
  function evState(m, now) {
    var t0 = Date.parse(EV.t0), h = Math.floor((now - t0) / 3600000), left = (t0 + (h + 1) * 3600000 - now) / 1000;
    var cur = evAt(m, h), k = 1, nx = "";
    while (k <= EV.per && !(nx = evAt(m, h + k))) k++;
    return { cur: cur, left: left, next: nx, inS: left + (k - 1) * 3600 };
  }
  function renderEvents() {
    if (!EV) return;
    var now = Date.now();
    Array.prototype.forEach.call(document.querySelectorAll("[data-evm]"), function (el) {
      var m = el.dataset.evm; if (!EV.m[m]) { el.hidden = true; return; }
      var s = evState(m, now); el.hidden = !s.cur;
      if (s.cur) el.innerHTML = esc(s.cur) + " <b>" + evClock(s.left) + "</b>";
    });
    // the map cards' "next" line
    Array.prototype.forEach.call(document.querySelectorAll("[data-evn]"), function (el) {
      var m = el.dataset.evn; if (!EV.m[m]) { el.textContent = t("No timed conditions"); return; }
      var s = evState(m, now); el.innerHTML = s.next ? "<small>" + esc(t("Next")) + "</small> " + esc(s.next) + " <b>" + evClock(s.inS) + "</b>" : esc(t("No condition coming up"));
    });
    var te = $("#mcevt");
    if (te) { if (!EV.m[curMap]) te.parentNode.hidden = true; else { var s = evState(curMap, now); te.innerHTML = s.next ? '<small>Next</small>' + esc(s.next) + " <b>in " + evClock(s.inS) + "</b>" : '<small>Next</small>No condition coming up'; } }
  }
  setInterval(function () { var v = $("#v-maps"); if (v && v.classList.contains("on") && !document.hidden) renderEvents(); }, 1000);
  document.addEventListener("change", function (e) { if (e.target && e.target.id === "evReg") { evReg = e.target.value; store("rt-evreg", evReg); renderEvents(); } });

  var ALL4 = ["dam", "buried", "space", "gate"];
  function mapChips(keys) {
    var all = ALL4.every(function (k) { return keys.indexOf(k) > -1; }) && keys.indexOf("pendola") < 0;
    if (all) return '<span class="pill">All main maps</span>';
    return keys.map(function (k) { return '<button type="button" class="chip orb" data-map="' + k + '">' + esc(MAPS[k].name) + "</button>"; }).join("");
  }

  $("#statItems").textContent = ITEMS.length;

