  /* ---------- Routing ---------- */
  var VIEWS = ["home", "workshop", "weapons", "blueprints", "quests", "items", "maps", "keys", "list", "info", "privacy", "skills"];
  var started = {};
  var VIEW_TITLE = { workshop: "Workshop planner", weapons: "Weapon calculator", blueprints: "Blueprint tracker", quests: "Quest tracker", items: "Item finder", maps: "Map intel", keys: "Keys & keycards", list: "Shopping list", info: "Info, sources & legal", privacy: "Privacy policy", skills: "Skill tree" };
  function setTitle() {
    var h = (location.hash || "").replace("#", "").split("?")[0];
    document.title = VIEW_TITLE[h] ? t(VIEW_TITLE[h]) + " · Raider Toolkit" : "Raider Toolkit";
  }
  function route() {
    var full = (location.hash || "").replace("#", ""), h = full.split("?")[0];
    if (VIEWS.indexOf(h) < 0) h = "home";
    var sm = full.match(/[?&]share=([A-Za-z0-9_-]+)/); if (sm) shareRead(sm[1]);
    VIEWS.forEach(function (v) { $("#v-" + v).classList.toggle("on", v === h); });
    Array.prototype.forEach.call(document.querySelectorAll("#nav a"), function (a) {
      if (a.dataset.v === h) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    Array.prototype.forEach.call(document.querySelectorAll("#nav .ndd"), function (d) { d.classList.toggle("cur", !!d.querySelector('a[aria-current="page"]')); });
    navClose();
    if (h === "maps") {
      setSbw(); mvApply();
      var rm = full.match(/[?&]route=([A-Za-z0-9_-]+)/);   // #maps?route=r… opens a shared route
      if (rm) { try { history.replaceState(null, "", location.pathname + location.search + "#maps"); } catch (e) {} planLoadShared(rm[1]); }
      // #maps?map=dam, &item=toaster, &key=…, &quest=… (used by the companion app's map tab and other links)
      var pm = full.match(/[?&]map=([a-z_]+)/), pi = full.match(/[?&]item=([a-z0-9_]+)/), pk = full.match(/[?&]key=([a-z0-9_]+)/), pq = full.match(/[?&]quest=([a-z0-9_]+)/);
      mapsGrid(mapWantGrid && !rm && !(pm || pi || pk || pq)); mapWantGrid = false;
      if (!rm && (pm || pi || pk || pq)) {
        try { history.replaceState(null, "", location.pathname + location.search + "#maps"); } catch (e) {}
        var mk = pm && (MAPS[pm[1]] ? pm[1] : pm[1].indexOf("stella_") === 0 ? "stella" : "");
        if (pm && pm[1].indexOf("stella_") === 0) MV.layer = pm[1].slice(7);
        setTimeout(function () {
          if (pi) mapShowItem(pi[1], mk || undefined);
          else if (pk) showKeyOnMap(pk[1]);
          else if (pq) mapShowQuest(pq[1], mk || undefined);
          else if (mk) selectMap(mk);
        }, 0);
      }
    }
    if (h === "weapons") {
      var cm = full.match(/[?&]code=([^&]+)/);   // #weapons?code=ARC-… opens that build (used by the Discord bot)
      if (cm) { try { history.replaceState(null, "", location.pathname + location.search + "#weapons"); } catch (e) {} var er = applyCode(decodeURIComponent(cm[1])); if (er) toast(er, true); }
      centerWSel();
    }
    if (h === "items") {
      var qm = full.match(/[?&]q=([^&]*)/);   // #items?q=Toaster opens the finder with that search (used by the Discord bot)
      if (qm) {
        $("#q").value = decodeURIComponent(qm[1].replace(/\+/g, " ")); $("#fType").value = "All types"; fRar = "All"; renderRarChips();
        try { history.replaceState(null, "", location.pathname + location.search + "#items"); } catch (e) {}
      }
      renderUseChips(); renderItems(!!qm);
      // a link to one item (from the Discord bot, say) opens its details straight away
      if (qm) { var one = filtered(), qn = $("#q").value.trim().toLowerCase(), ex = one.filter(function (x) { return x.n.toLowerCase() === qn; }); if (ex.length === 1 || one.length === 1) itemOpen((ex[0] || one[0]).id); }
    }
    if (h === "blueprints") renderBp();
    if (h === "quests") renderQuests();
    if (h === "skills") { skRead(full); renderSkills(); }
    if (window.__scene) { if (h === "home") window.__scene.start(); else window.__scene.stop(); }
    setTitle();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-goto]"); if (!a) return;
    e.preventDefault();
    var id = a.dataset.goto;
    if (location.hash !== "#home") location.hash = "#home";
    setTimeout(function () { var el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 80, behavior: "smooth" }); }, 60);
  });
  /* auto-hide the top bar: hides while scrolling down, comes back when scrolling up or pointing at the top edge */
  (function () {
    var lastY = window.pageYOffset, hidden = false, bar = document.querySelector("header.top");
    function set(h) { if (h === hidden) return; hidden = h; document.body.classList.toggle("hh", h); }
    window.addEventListener("scroll", function () {
      var y = window.pageYOffset;
      if (y < 80) set(false);
      else if (y > lastY + 6) set(true);
      else if (y < lastY - 6) set(false);
      lastY = y;
    }, { passive: true });
    document.addEventListener("mousemove", function (e) { if (hidden && e.clientY < 28) set(false); }, { passive: true });
    bar.addEventListener("focusin", function () { set(false); });
    window.addEventListener("hashchange", function () { set(false); lastY = 0; });
  })();
  function go(v) { if (location.hash === "#" + v) route(); else location.hash = v; }

