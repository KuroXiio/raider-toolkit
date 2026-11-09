  /* ---------- map side panel: tabs for Filter and Plan a route ---------- */
  function mkDockHtml() {
    if (!MFD || !(MKF[mapImgKey()] || MK[mapImgKey()])) return "";
    var r = !!MV.plan;
    return '<aside class="mdock" id="mdock"><div class="mdin"><div class="mtabs" role="tablist">' +
      '<button type="button" role="tab" data-mtab="filter" aria-selected="' + !r + '"><svg viewBox="0 0 24 24"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/></svg>' + esc(t("Filter")) + "</button>" +
      '<button type="button" role="tab" data-mtab="route" aria-selected="' + r + '"><svg viewBox="0 0 24 24"><path d="M5 19c4 0 3-6 7-6s3 6 7 6M12 5.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z"/></svg>' + esc(t("Plan a route")) + "</button></div>" +
      '<div class="mfoc" id="mfoc" hidden></div><div class="mlayp" id="mlayp"' + (r ? " hidden" : "") + '></div><div class="mplanp" id="mplanp" hidden></div></div></aside>';
  }
  function mkTabsSync() {
    var r = !!MV.plan;
    Array.prototype.forEach.call(document.querySelectorAll("#mdock [data-mtab]"), function (b) { b.setAttribute("aria-selected", String((b.dataset.mtab === "route") === r)); });
    var lp = $("#mlayp"); if (lp) { lp.hidden = r; if (!r) renderLayers(); }
  }

