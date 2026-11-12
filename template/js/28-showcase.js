(function () {
  var box = $("#appShow"); if (!box) return;
  var slides = box.querySelectorAll(".ss"), cur = 0, hold = false, seen = false, v = box.querySelector("video");
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  // each card sits where it would be over the game; work out how far it has to travel to start big in the middle
  function aim(s) {
    var W = box.clientWidth, H = box.clientHeight;
    Array.prototype.forEach.call(s.querySelectorAll(".fly"), function (el) {
      var w = el.offsetWidth, h = el.offsetHeight, sc = Math.min(1.6, W * 0.8 / w, H * 0.78 / h);
      el.style.setProperty("--dx", Math.round(W / 2 - (el.offsetLeft + w / 2)) + "px");
      el.style.setProperty("--dy", Math.round(H / 2 - (el.offsetTop + h / 2)) + "px");
      el.style.setProperty("--s", sc.toFixed(3));
    });
    var a = s.querySelector(".msync .sw1"), b = s.querySelector(".msync .oc");
    if (a && b) {
      a.style.setProperty("--ex", Math.round(b.offsetLeft + b.offsetWidth / 2 - (a.offsetLeft + a.offsetWidth / 2)) + "px");
      a.style.setProperty("--ey", Math.round(b.offsetTop + b.offsetHeight / 2 - (a.offsetTop + a.offsetHeight / 2)) + "px");
      a.style.setProperty("--es", (b.offsetWidth / a.offsetWidth).toFixed(3));
    }
  }
  // the smaller clip when it is sharp enough for this screen (or the visitor asked to save data)
  function pick() {
    var W = box.clientWidth, H = box.clientHeight || 1, a = W / H, need = W * Math.min(2, window.devicePixelRatio || 1) / Math.min(1, a / 1.6);
    return v.dataset.sd && (need <= 900 || (navigator.connection && navigator.connection.saveData)) ? v.dataset.sd : v.dataset.hd;
  }
  function show(i) {
    cur = (i + slides.length) % slides.length; aim(slides[cur]);
    Array.prototype.forEach.call(slides, function (s, k) { s.classList.toggle("on", k === cur); s.setAttribute("aria-hidden", String(k !== cur)); });
  }
  aim(slides[0]);
  window.addEventListener("resize", function () { aim(slides[cur]); }, { passive: true });
  box.addEventListener("mouseenter", function () { hold = true; }); box.addEventListener("mouseleave", function () { hold = false; });
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; box.classList.toggle("off", !seen); if (v) { if (seen && !calm) { if (!v.getAttribute("src")) v.src = pick(); v.play().catch(function () {}); } else v.pause(); } }).observe(box); else seen = true;
  if (!calm) setInterval(function () { if (seen && !hold && !document.hidden) show(cur + 1); }, 7000);
})();
