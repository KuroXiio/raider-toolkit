  /* ---------- Init ---------- */
  $("#statStations").textContent = STATIONS.length;
  $("#statWeapons").textContent = WEAPONS.length;
  $("#statMaps").textContent = MAP_ORDER.length;
  /* zigzag guide: each step sits a fixed distance below the one before, and only moves further down if the step above it on the same side is long */
  function layoutZZ() {
    Array.prototype.forEach.call(document.querySelectorAll(".zz"), function (ul) {
      var lis = Array.prototype.filter.call(ul.children, function (li) { return !li.hidden; });
      var wide = window.matchMedia("(min-width: 701px)").matches;
      if (!wide || !lis.length) { lis.forEach(function (li) { li.style.marginTop = ""; }); ul.style.paddingBottom = ""; return; }
      var STEP = 110, GAP = 30, top = [], h = lis.map(function (li) { return li.offsetHeight; }), end = 0;
      lis.forEach(function (li, k) {
        top[k] = k === 0 ? 0 : Math.max(top[k - 1] + STEP, k > 1 ? top[k - 2] + h[k - 2] + GAP : 0);
        var m = k === 0 ? "" : Math.round(top[k] - (top[k - 1] + h[k - 1])) + "px";
        if (li.style.marginTop !== m) li.style.marginTop = m;
        end = Math.max(end, top[k] + h[k]);
      });
      var last = lis.length - 1, pb = Math.round(6 + end - (top[last] + h[last])) + "px";
      if (ul.style.paddingBottom !== pb) ul.style.paddingBottom = pb;
    });
  }
  if (window.ResizeObserver) { var zzRO = new ResizeObserver(function () { layoutZZ(); }); Array.prototype.forEach.call(document.querySelectorAll(".zz > li"), function (li) { zzRO.observe(li); }); }
  window.addEventListener("resize", layoutZZ);
