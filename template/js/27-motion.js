  /* ---------- motion: things on the home page come in as you scroll to them, and the numbers count up ----------
     Skipped entirely when the visitor has asked their system for less motion. */
  (function () {
    if (!window.IntersectionObserver || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    function reveal(sel, opt) {
      opt = opt || {};
      document.querySelectorAll(sel).forEach(function (el) {
        var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.matches(sel.split(",").map(function (x) { return x.trim().split(" ").pop(); }).join(",")); });
        var i = Math.max(0, sibs.indexOf(el));
        el.classList.add("rv"); if (opt.side) el.classList.add(i % 2 ? "rv-r" : "rv-l");
        el.style.setProperty("--rd", Math.min(i, 8) * (opt.step || 0.06) + "s");
        io.observe(el);
      });
    }
    reveal("#v-home .shd");
    reveal("#v-home .zz li", { side: true, step: 0.04 });
    reveal("#v-home .cards .card", { step: 0.05 });
    reveal("#v-home .appbox");
    reveal("#v-home .faql details", { step: 0.03 });
    // the numbers under the hero count up once
    ["statItems", "statStations", "statWeapons", "statMaps"].forEach(function (id) {
      var el = document.getElementById(id), to = el && parseInt(el.textContent, 10); if (!to) return;
      var t0 = null, dur = 900;
      el.textContent = "0";
      requestAnimationFrame(function step(ts) {
        if (t0 === null) t0 = ts + 450;   // after the hero text has come in
        var k = Math.max(0, Math.min(1, (ts - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e);
        if (k < 1) requestAnimationFrame(step);
      });
    });
    // the cart badge pops when its number changes
    var last = null;
    new MutationObserver(function () {
      var b = document.getElementById("cartn"); if (!b || b.textContent === last) return;
      last = b.textContent; b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  })();
