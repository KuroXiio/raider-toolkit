  /* ---------- report a problem (sent through the relay to a private Discord channel) ---------- */
  var RP_TOPICS = [["map", "Maps"], ["keys", "Keys"], ["items", "Item finder"], ["workshop", "Workshop planner"], ["weapons", "Weapon calculator"], ["blueprints", "Blueprint tracker"], ["quests", "Quest tracker"], ["list", "Shopping list"], ["arc", "ARCTracker link"], ["site", "Something else"]];
  var rpLast = 0, rpFrom = null;
  function rpOpen(kind) {
    var h = (location.hash || "").replace("#", "").split("?")[0] || "home", ov = $("#rpov");
    if (!ARC_PROXY) { window.open("https://discord.gg/NE3ughZTxn", "_blank", "noopener"); return; }
    var pick = kind === "map" ? "map" : RP_TOPICS.some(function (x) { return x[0] === h; }) ? h : h === "maps" ? "map" : "site";
    $("#rpTopic").innerHTML = RP_TOPICS.map(function (x) { var lab = x[0] === "map" && curMap && MAPS[curMap] ? t("Maps") + ": " + MAPS[curMap].name : t(x[1]); return '<option value="' + x[0] + '"' + (x[0] === pick ? " selected" : "") + ">" + esc(lab) + "</option>"; }).join("");
    $("#rpSub").textContent = kind === "map" ? t("Wrong pin, area, condition or timer? Tell us what you saw and where.") : t("Something wrong or missing? Tell us what and where, and we will look at it.");
    $("#rpMsg").placeholder = kind === "map" ? t("Example: the Hospital key pin on Buried City is one building too far north.") : t("What happened, and where on the site?");
    $("#rpStat").textContent = ""; $("#rpStat").className = "rpstat"; $("#rpSend").disabled = false;
    rpFrom = document.activeElement; ov.hidden = false; document.body.classList.add("rpopen");
    setTimeout(function () { $("#rpMsg").focus(); }, 30);
  }
  function rpClose() { $("#rpov").hidden = true; document.body.classList.remove("rpopen"); if (rpFrom && rpFrom.focus) rpFrom.focus(); }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-report]"); if (b) { e.preventDefault(); rpOpen(b.dataset.report); return; }
    if (e.target.closest && e.target.closest("[data-rpclose]")) { rpClose(); return; }
    if (e.target.id === "rpov") rpClose();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#rpov").hidden) rpClose(); });
  document.addEventListener("input", function (e) { if (e.target && e.target.id === "rpMsg") $("#rpCount").textContent = e.target.value.length + " / 1500"; });
  $("#rpform").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $("#rpMsg").value.trim(), st = $("#rpStat"), topicSel = $("#rpTopic");
    if (msg.length < 5) { st.textContent = t("Please write a little more about what is wrong."); st.className = "rpstat bad"; $("#rpMsg").focus(); return; }
    if (Date.now() - rpLast < 20000) { st.textContent = t("Give it a few seconds before sending another one."); st.className = "rpstat bad"; return; }
    var h = (location.hash || "").replace("#", "").split("?")[0] || "home";
    var body = { topic: topicSel.options[topicSel.selectedIndex].text, msg: msg, who: $("#rpWho").value.trim(), website: $("#rpWeb").value, view: h, lang: LANG,
      page: h === "maps" && MAPS[curMap] ? "Map: " + MAPS[curMap].name : h === "items" ? "Search: " + ($("#q") ? $("#q").value : "") : "" };
    $("#rpSend").disabled = true; st.textContent = t("Sending…"); st.className = "rpstat";
    fetch(ARC_PROXY.replace(/\/+$/, "") + "/report", { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) throw new Error(x.j && x.j.error || "");
        rpLast = Date.now(); $("#rpMsg").value = ""; $("#rpCount").textContent = "0 / 1500";
        st.textContent = t("Thanks! Your report is on its way."); st.className = "rpstat ok";
        setTimeout(function () { if (!$("#rpov").hidden) rpClose(); }, 1600);
      })
      .catch(function (er) {
        var net = !er || er.name === "TypeError" || /fetch|network|load failed/i.test(er.message || "");
        if (net) st.innerHTML = esc(t("Couldn't reach the report service. Try again in a minute, or post it in our Discord.")) + ' <a href="https://discord.gg/NE3ughZTxn" target="_blank" rel="noopener">Discord</a>';
        else st.textContent = er.message || t("The report could not be sent. Check your connection and try again.");
        st.className = "rpstat bad"; $("#rpSend").disabled = false;
      });
  });

