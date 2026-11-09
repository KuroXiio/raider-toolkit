  /* ---------- menu: two dropdowns (Planning, Topside) ---------- */
  function navClose(except) {
    Array.prototype.forEach.call(document.querySelectorAll("#nav .ndd.open"), function (d) {
      if (d === except) return; d.classList.remove("open"); d.querySelector(".ndb").setAttribute("aria-expanded", "false");
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#nav .ndb");
    if (b) { var d = b.parentNode, open = !d.classList.contains("open") || d.dataset.hov === "1"; delete d.dataset.hov; navClose(d); d.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open)); return; }
    if (!e.target.closest || !e.target.closest("#nav .ndp")) navClose();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { var o = document.querySelector("#nav .ndd.open"); if (o) { navClose(); o.querySelector(".ndb").focus(); } }
  });
  /* desktop mouse: open on hover too, with a short delay so it does not flicker */
  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    Array.prototype.forEach.call(document.querySelectorAll("#nav .ndd"), function (d) {
      var tm;
      d.addEventListener("mouseenter", function () { clearTimeout(tm); tm = setTimeout(function () { if (!d.classList.contains("open")) d.dataset.hov = "1"; navClose(d); d.classList.add("open"); d.querySelector(".ndb").setAttribute("aria-expanded", "true"); }, 90); });
      d.addEventListener("mouseleave", function () { clearTimeout(tm); tm = setTimeout(function () { delete d.dataset.hov; d.classList.remove("open"); d.querySelector(".ndb").setAttribute("aria-expanded", "false"); }, 220); });
    });
  }
  window.addEventListener("scroll", function () { if (document.body.classList.contains("hh")) navClose(); }, { passive: true });

