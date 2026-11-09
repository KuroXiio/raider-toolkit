  /* ---------- Hero scene: original dusk ruins, drawn in code ---------- */
  (function () {
    var cv = $("#scene"); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d");
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var W = 0, H = 0, dpr = 1, P = 2000;
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function ridge(base, amps, phases) {
      return function (x) {
        var y = 0;
        for (var i = 0; i < amps.length; i++) y += Math.sin((x / P) * Math.PI * 2 * (i + 1) * 2 + phases[i]) * amps[i];
        return base + y;
      };
    }
    var far = ridge(0.62, [0.045, 0.03, 0.015, 0.008], [0.4, 1.7, 2.9, 4.1]);
    var dune = ridge(0.80, [0.04, 0.02, 0.01], [2.2, 0.3, 3.7]);
    var dune2 = ridge(0.91, [0.03, 0.015], [5.0, 1.1]);
    var bld = [];
    var x = 0;
    while (x < P) {
      var w = 40 + rnd() * 90, h = 0.10 + rnd() * 0.22;
      var pts = [[x, 0], [x, h * (0.6 + rnd() * 0.4)], [x + w * 0.3, h * (0.5 + rnd() * 0.5)], [x + w * 0.62, h], [x + w, h * (0.4 + rnd() * 0.6)], [x + w, 0]];
      bld.push({ pts: pts, arch: rnd() > 0.7, x: x, w: w, h: h });
      x += w + 10 + rnd() * 60;
    }
    var gantry = { x: 1180, h: 0.46 };
    var dust = [];
    for (var i = 0; i < 90; i++) dust.push({ x: rnd(), y: rnd(), s: 0.4 + rnd() * 1.6, v: 6 + rnd() * 22, o: 0.1 + rnd() * 0.4 });

    function resize() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function layer(fn, off, color, par) {
      ctx.beginPath(); ctx.moveTo(0, H);
      var sc = W / 1400;
      for (var px = 0; px <= W + 6; px += 6) ctx.lineTo(px, fn(((px / sc) + off * par) % P + (px / sc + off * par < 0 ? P : 0)) * H);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }
    function ruins(off, par, color, baseY, scale) {
      var sc = (W / 1400) * scale;
      ctx.fillStyle = color;
      var shift = (off * par) % P;
      for (var rep = -1; rep < Math.ceil(W / sc / P) + 2; rep++) {
        bld.forEach(function (b) {
          var ox = (rep * P - shift) * sc;
          if (ox + (b.x + b.w) * sc < -50 || ox + b.x * sc > W + 50) return;
          ctx.beginPath();
          b.pts.forEach(function (p, idx) {
            var X = ox + p[0] * sc, Y = baseY * H - p[1] * H * scale * 1.25;
            if (idx === 0) ctx.moveTo(X, baseY * H + 4); ctx.lineTo(X, idx === 0 ? baseY * H : Y);
          });
          ctx.lineTo(ox + (b.x + b.w) * sc, baseY * H + 4); ctx.closePath(); ctx.fill();
          if (b.arch) {
            ctx.save(); ctx.globalCompositeOperation = "destination-out";
            var ax = ox + (b.x + b.w * 0.5) * sc, ay = baseY * H - 6, ar = Math.min(b.w * sc * 0.16, 20);
            ctx.beginPath(); ctx.arc(ax, ay - ar, ar, Math.PI, 0); ctx.lineTo(ax + ar, ay); ctx.lineTo(ax - ar, ay); ctx.closePath(); ctx.globalAlpha = 0.0; ctx.fill(); ctx.restore();
          }
        });
      }
    }
    function tower(off, par) {
      var sc = W / 1400;
      var gx = ((gantry.x - off * par) % P + P) % P * sc;
      if (gx > W + 40) return;
      var top = H * (0.72 - gantry.h), bot = H * 0.74;
      ctx.strokeStyle = "#1a1530"; ctx.fillStyle = "#1a1530"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(gx - 16, bot); ctx.lineTo(gx - 6, top); ctx.moveTo(gx + 16, bot); ctx.lineTo(gx + 6, top); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath();
      var n = 9; for (var k = 0; k < n; k++) { var y1 = top + (bot - top) * k / n, y2 = top + (bot - top) * (k + 1) / n; var a1 = 6 + 10 * k / n, a2 = 6 + 10 * (k + 1) / n; ctx.moveTo(gx - a1, y1); ctx.lineTo(gx + a2, y2); ctx.moveTo(gx + a1, y1); ctx.lineTo(gx - a2, y2); }
      ctx.stroke(); ctx.fillRect(gx - 7, top - 10, 14, 10);
      ctx.fillRect(gx + 6, top + 12, 70, 5);
    }
    function frame(t) {
      var time = t / 1000, off = reduce ? 0 : time * 6;
      var g = ctx.createLinearGradient(0, 0, 0, H * 0.78);
      g.addColorStop(0, "#090b14"); g.addColorStop(0.38, "#1b1a30"); g.addColorStop(0.62, "#4a3a78"); g.addColorStop(0.82, "#8d73c8"); g.addColorStop(1, "#d3bdf5");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // sun and glow
      var sx = W * 0.72, sy = H * 0.66;
      var rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.9);
      rg.addColorStop(0, "rgba(255,250,255,.95)"); rg.addColorStop(0.08, "rgba(215,195,255,.55)"); rg.addColorStop(0.35, "rgba(140,105,220,.2)"); rg.addColorStop(1, "rgba(140,105,220,0)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(sx, sy, Math.max(14, H * 0.035), 0, 6.283); ctx.fill();
      // thin high cloud streaks
      ctx.globalAlpha = 0.18; ctx.fillStyle = "#d9ccff";
      for (var c = 0; c < 5; c++) { var cx = ((c * 330 - off * 1.5) % (W + 400) + W + 400) % (W + 400) - 200; ctx.fillRect(cx, H * (0.22 + c * 0.05), 260 + c * 40, 2); }
      ctx.globalAlpha = 1;
      layer(far, off, "#3b2f63", 0.4);
      ctx.globalAlpha = 0.55; ctx.fillStyle = "#b79cf0"; ctx.fillRect(0, H * 0.62, W, H * 0.12); ctx.globalAlpha = 1;
      ruins(off, 0.8, "#241e40", 0.76, 0.9);
      tower(off, 0.9);
      ruins(off, 1.4, "#151128", 0.84, 1.15);
      layer(dune, off, "#0e0a1c", 1.0);
      layer(dune2, off, "#06040c", 1.8);
      // low haze
      var hz = ctx.createLinearGradient(0, H * 0.6, 0, H * 0.9);
      hz.addColorStop(0, "rgba(170,140,240,0)"); hz.addColorStop(1, "rgba(170,140,240,.14)");
      ctx.fillStyle = hz; ctx.fillRect(0, H * 0.6, W, H * 0.3);
      // dust
      ctx.fillStyle = "#e7dcff";
      dust.forEach(function (d) {
        var dx = ((d.x * W - time * d.v * (reduce ? 0 : 1)) % W + W) % W, dy = d.y * H * 0.9 + Math.sin(time * 0.6 + d.x * 9) * (reduce ? 0 : 6);
        ctx.globalAlpha = d.o; ctx.fillRect(dx, dy, d.s, d.s);
      });
      ctx.globalAlpha = 1;
      // vignette
      var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.7)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    var running = false, tok = 0;
    window.__scene = {
      start: function () {
        resize();
        if (reduce) { frame(2000); return; }
        tok++; var my = tok; running = true;
        (function l(t) { if (my !== tok || !running) return; frame(t); requestAnimationFrame(l); })(0);
      },
      stop: function () { running = false; tok++; }
    };
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (document.getElementById("v-home").classList.contains("on")) { resize(); if (reduce) frame(2000); } }, 120); });
  })();
