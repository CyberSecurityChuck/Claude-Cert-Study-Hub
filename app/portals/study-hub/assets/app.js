"use strict";
/* ============================================================
   Learn Portal — client app
   ============================================================ */

(function () {
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] === true) node.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  /* ============================================================
     State
     ============================================================ */
  var state = {
    me: null,
    syllabus: null,
    syllabusSource: null,
    progress: null,
    activeSession: null,
    sessions: [],
    modules: [],
  };

  var LS = {
    theme: "ccaf_theme",
    activeSlug: "ccaf_learn_active_slug",
  };

  var TUTOR_NAME = "Nyx";
  var TUTOR_TAGLINE = "AI study coach";

  /* ============================================================
     AI provider configuration
     ------------------------------------------------------------
     All provider/model/API-key handling lives in the shared module
     (/shared/ai-config.js). It is stored per user on the server, so
     it survives refresh, matches the Exam Center, and never leaks
     between users on the same browser.
     ============================================================ */
  function initAiProvider() {
    if (!window.CCAF_AI) return;
    window.CCAF_AI.init({
      modal: "providerModal",
      providerSelect: "provProviderSel",
      modelSelect: "provModelSel",
      modelOverrideInput: "provModelOverride",
      apiKeyInput: "provApiKey",
      saveButton: "provSaveBtn",
      cancelButton: "provCancelBtn",
      openButtons: ["providerBtn", "tutorProviderBtn"],
      badge: "tutorProviderInfo"
    });
  }

  function openProviderModal() {
    if (window.CCAF_AI) window.CCAF_AI.openModal();
  }

  function aiConfigured() {
    return !!(window.CCAF_AI && window.CCAF_AI.isConfigured());
  }

  /* ============================================================
     Exam date (shared module)
     ------------------------------------------------------------
     The date is stored per user on the server, so the countdown here
     and the one in the Exam Center are always the same number. The
     editor lives in the Profile dropdown.
     ============================================================ */
  function initExamDate() {
    if (!window.CCAF_EXAM) return;
    window.CCAF_EXAM.onChange(function () {
      /* Only the Home hero shows the countdown; refresh it if visible. */
      refreshExamCountdownCards();
    });
    window.CCAF_EXAM.init();
  }

  function mountExamDateEditor() {
    if (!window.CCAF_EXAM) return;
    window.CCAF_EXAM.mountEditor({
      host: "examDateEditor",
      onSaved: function () { refreshExamCountdownCards(); }
    });
  }

  function examStats() {
    if (window.CCAF_EXAM) return window.CCAF_EXAM.getStats();
    /* Fallback if the shared module failed to load. */
    var exam = new Date(2026, 8, 30);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.max(0, Math.round((exam - today) / 86400000));
    return {
      days: days,
      daysLabel: String(days),
      isPast: false,
      isToday: days === 0,
      phase: "Phase 1",
      phaseDetail: "Learning",
      progressPct: days >= 100 ? 5 : Math.min(100, Math.max(5, 100 - days)),
      examDateLong: exam.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    };
  }

  /* Repaint the "days to exam" hero card in place (Home only). */
  function refreshExamCountdownCards() {
    var card = document.querySelector('.hero.sci-fi [data-hero-stat="days"]');
    if (!card) return;
    var stats = examStats();
    var big = card.querySelector(".big");
    var bar = card.querySelector(".bar-mini span");
    if (big) big.textContent = stats.daysLabel;
    if (bar) bar.style.width = stats.progressPct + "%";
    card.setAttribute("title", "Exam date: " + stats.examDateLong + " · " + stats.phaseDetail);
  }

  /* ============================================================
     API helpers
     ============================================================ */
  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || "GET", credentials: "include", headers: {} };
    if (opts.body) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    return fetch(path, init).then(function (res) {
      return res.text().then(function (raw) {
        var data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = { error: raw }; }
        if (!res.ok) {
          var err = new Error((data && data.error) || ("HTTP " + res.status));
          err.status = res.status;
          err.payload = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* ============================================================
     Init / auth
     ============================================================ */
  function init() {
    wireTopbar();
    wireAuth();
    initAiProvider();
    initExamDate();
    wireTutor();
    wireHashRouting();
    wireAuthBroadcast();
    wireCheckCardToggles();
    restoreTheme();
    loadMeAndProceed();
  }

  /* Delegated click handler for the "Show answer" / "Hide answer"
     toggles inside server-rendered check-block cards. Uses event
     delegation on document so dynamically-rendered content works
     without re-binding. */
  function wireCheckCardToggles() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-check-toggle]");
      if (!btn) return;
      var card = btn.closest("[data-check-card]");
      if (!card) return;
      var ans = card.querySelector(".check-answer");
      if (!ans) return;
      var expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", expanded ? "false" : "true");
      ans.hidden = expanded;
      btn.childNodes[0].nodeValue = expanded ? "Show answer" : "Hide answer";
    });
  }

  /* Listen for sign-out events from other tabs (e.g. the Exam Center). */
  function wireAuthBroadcast() {
    try {
      if (typeof BroadcastChannel === "undefined") return;
      var ch = new BroadcastChannel("ccaf_auth");
      ch.onmessage = function (ev) {
        if (!ev || !ev.data || ev.data.type !== "logout") return;
        /* Another tab signed out — clear our local state and show the
           auth modal. We do NOT reload (that caused a stuck page when
           the originating tab was also reloading). */
        try { localStorage.removeItem(LS.activeSlug); } catch (e) {}
        state.me = null;
        state.activeSession = null;
        /* Drop the previous user's provider selection from this tab. */
        if (window.CCAF_AI) window.CCAF_AI.reset();
        /* …and their exam date. */
        if (window.CCAF_EXAM) {
          window.CCAF_EXAM.reset();
          window.CCAF_EXAM.refresh(true);
        }
        if ($("accountBtn")) $("accountBtn").style.display = "none";
        if ($("accountDropdown")) $("accountDropdown").classList.add("hidden");
        showAuthModal();
        $("tutorLog").innerHTML = "<div class=\"tutor-empty\">Signed out from another tab. Sign in again to chat with Nyx.</div>";
        $("mainPane").innerHTML = "";
      };
    } catch (e) {}
  }

  function loadMeAndProceed() {
    api("/api/me").then(function (me) {
      state.me = me;
      showSignedIn();
      afterAuth();
    }).catch(function () {
      showAuthModal();
    });
  }

  function showAuthModal() {
    var m = $("authModal");
    if (!m) return;
    m.classList.remove("hidden");
    m.hidden = false;
    m.removeAttribute("hidden");
    var n = $("authName");
    if (n) n.focus();
  }
  function hideAuthModal() {
    var m = $("authModal");
    if (!m) return;
    m.classList.add("hidden");
    m.hidden = true;
    m.setAttribute("hidden", "");
  }

  function showSignedIn() {
    var btn = $("accountBtn");
    if (btn) btn.style.display = "inline-flex";
    var name = (state.me && (state.me.name || state.me.slug)) || "User";
    var initial = name.charAt(0).toUpperCase();
    var handle = "@" + ((state.me && (state.me.slug || state.me.name)) || "user").toLowerCase().replace(/\s+/g, "");
    if ($("avatarInitial")) $("avatarInitial").textContent = initial;
    if ($("dropdownAvatar")) $("dropdownAvatar").textContent = initial;
    if ($("avatarName")) $("avatarName").textContent = name;
    if ($("accountUserName")) $("accountUserName").textContent = name;
    if ($("accountUserHandle")) $("accountUserHandle").textContent = handle;
    try { localStorage.setItem(LS.activeSlug, state.me.slug); } catch (e) {}
  }

  function wireAuth() {
    $("authSignInBtn").addEventListener("click", function () { doAuth(false); });
    $("authCreateBtn").addEventListener("click", function () { doAuth(true); });
    $("authPass").addEventListener("keydown", function (e) {
      if (e.key === "Enter") doAuth(false);
    });
    $("authName").addEventListener("keydown", function (e) {
      if (e.key === "Enter") $("authPass").focus();
    });

    /* Account dropdown */
    var accBtn = $("accountBtn");
    var accDd = $("accountDropdown");
    mountExamDateEditor();
    if (accBtn && accDd) {
      accBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var hidden = accDd.classList.contains("hidden");
        accDd.classList.toggle("hidden");
        accBtn.setAttribute("aria-expanded", hidden ? "true" : "false");
        if (hidden && window.CCAF_EXAM) window.CCAF_EXAM.refresh(false);
      });
      document.addEventListener("click", function (e) {
        if (!accDd.contains(e.target) && e.target !== accBtn) accDd.classList.add("hidden");
      });
    }

    var signOutBtn = $("signOutBtn");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", function () {
        if (accDd) accDd.classList.add("hidden");
        /* Tell the server first (so the cookie is gone and any other
           tab that re-fetches /api/me gets 401). */
        api("/api/profile/logout", { method: "POST" }).then(function () {
          try {
            localStorage.removeItem(LS.activeSlug);
            localStorage.removeItem("ccaf_active_profile");
          } catch (e) {}
          /* The AI provider config belongs to the signed-out user: drop
             it from this tab and tell the other portal to do the same. */
          if (window.CCAF_AI) window.CCAF_AI.signalSignOut();
          /* Same for the exam date — fall back to the built-in default. */
          if (window.CCAF_EXAM) {
            window.CCAF_EXAM.reset();
            window.CCAF_EXAM.refresh(true);
          }
          /* Broadcast sign-out to other tabs of this origin so the
             Exam Center tab also logs out without a refresh. */
          try {
            if (typeof BroadcastChannel !== "undefined") {
              var ch = new BroadcastChannel("ccaf_auth");
              ch.postMessage({ type: "logout", at: Date.now() });
            }
          } catch (e) {}
          state.me = null;
          state.activeSession = null;
          if ($("accountBtn")) $("accountBtn").style.display = "none";
          showAuthModal();
          $("tutorLog").innerHTML = "<div class=\"tutor-empty\">Signed out. Sign in to chat with Nyx.</div>";
          $("mainPane").innerHTML = "";
        }).catch(function () {
          state.me = null;
          if (window.CCAF_AI) window.CCAF_AI.reset();
          if ($("accountBtn")) $("accountBtn").style.display = "none";
          showAuthModal();
        });
      });
    }
  }

  function doAuth(createIfMissing) {
    var name = ($("authName").value || "").trim();
    var password = ($("authPass").value || "").trim();
    if (!name || !password) { alert("Enter name and password."); return; }
    api("/api/profile/login", { method: "POST", body: { name: name, password: password, createIfMissing: createIfMissing } })
      .then(function (resp) {
        state.me = { slug: resp.user.slug, name: resp.user.name, createdAt: new Date().toISOString() };
        hideAuthModal();
        showSignedIn();
        /* Load this user's own saved provider/model. */
        if (window.CCAF_AI) window.CCAF_AI.refresh();
        /* …and their own exam date. */
        if (window.CCAF_EXAM) window.CCAF_EXAM.refresh(true);
        try { afterAuth(); } catch (e) { console.error("afterAuth failed:", e); renderHome(); }
      })
      .catch(function (err) {
        var msg = (err && err.message) || "Sign-in failed.";
        if (err && err.status === 401) {
          msg = createIfMissing ? "Could not create profile: " + msg : "Profile not found. Click 'Create profile' to make one.";
        }
        alert(msg);
      });
  }

  function afterAuth() {
    Promise.all([
      api("/api/syllabus"),
      api("/api/progress"),
      api("/api/chat/sessions").catch(function () { return []; }),
    ]).then(function (results) {
      state.syllabus = results[0].syllabus;
      state.syllabusSource = results[0].source;
      state.progress = results[1];
      state.sessions = results[2];
      state.modules = [];
      state.syllabus.forEach(function (dom) {
        dom.modules.forEach(function (m) { state.modules.push(Object.assign({ domainId: dom.id, domainName: dom.name, weight: dom.weight }, m)); });
      });
      resolveRoute();
      if (state.sessions && state.sessions.length) {
        setActiveSession(state.sessions[0].id);
      } else {
        renderTutorEmpty();
      }
    }).catch(function (err) {
      console.error("Failed to load portal data", err);
      renderError("Failed to load portal data: " + (err.message || ""));
    });
  }

  /* ============================================================
     Topbar / theme / nav toggles
     ============================================================ */
  function wireTopbar() {
    $("themeToggle").addEventListener("click", function () {
      var dark = document.body.classList.toggle("dark-mode");
      try { localStorage.setItem(LS.theme, dark ? "dark" : "light"); } catch (e) {}
      $("themeIcon").textContent = dark ? "🌙" : "☀️";
    });
    $("navToggle").addEventListener("click", function () {
      document.body.classList.toggle("nav-open");
      document.body.classList.toggle("nav-collapsed");
    });
    $("tutorToggle").addEventListener("click", function () {
      var collapsed = document.body.classList.contains("tutor-collapsed");
      if (collapsed) { document.body.classList.remove("tutor-collapsed"); document.body.classList.add("tutor-open"); }
      else { document.body.classList.add("tutor-collapsed"); document.body.classList.remove("tutor-open"); }
    });
  }

  function restoreTheme() {
    try {
      var t = localStorage.getItem(LS.theme);
      if (t === "dark") {
        document.body.classList.add("dark-mode");
        $("themeIcon").textContent = "🌙";
      }
    } catch (e) {}
  }

  /* ============================================================
     Tutor sidebar
     ============================================================ */
  function wireTutor() {
    $("tutorSendBtn").addEventListener("click", sendTutorMessage);
    $("tutorInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTutorMessage(); }
    });
    $("tutorNewBtn").addEventListener("click", function () { createNewSession(null); });
    $("tutorListBtn").addEventListener("click", function () { location.hash = "#/sessions"; });
    var colBtn = $("tutorCollapse");
    if (colBtn) {
      colBtn.addEventListener("click", function () {
        document.body.classList.add("tutor-collapsed");
        document.body.classList.remove("tutor-open");
      });
    }
    var log = $("tutorLog");
    if (log) {
      log.addEventListener("click", function (e) {
        var chip = e.target.closest(".tutor-chip");
        if (!chip) return;
        var prompt = chip.getAttribute("data-prompt") || chip.textContent;
        var input = $("tutorInput");
        if (input) {
          input.value = prompt;
          sendTutorMessage();
        }
      });
    }
  }

  function setSessionInfo(text) {
    var info = $("tutorSessionInfo");
    if (info) info.textContent = text;
  }

  function setActiveSession(sessionId) {
    if (!sessionId) { state.activeSession = null; renderTutorEmpty(); return; }
    api("/api/chat/sessions/" + encodeURIComponent(sessionId))
      .then(function (sess) { state.activeSession = sess; renderTutorSession(sess); })
      .catch(function () { state.activeSession = null; renderTutorEmpty(); });
  }

  function createNewSession(focus) {
    if (!state.me) return;
    var title = focus && focus.moduleId
      ? ("Module " + focus.moduleId)
      : "Free-form chat";
    api("/api/chat/sessions", { method: "POST", body: { title: title, focus: focus || null } })
      .then(function (sess) {
        state.activeSession = sess;
        state.sessions.unshift({ id: sess.id, title: sess.title, startedAt: sess.startedAt, lastMessageAt: sess.lastMessageAt, messageCount: 0 });
        renderTutorSession(sess);
      })
      .catch(function (err) { alert("Failed to create session: " + (err.message || "")); });
  }

  function renderTutorEmpty() {
    setSessionInfo("No active session");
    var log = $("tutorLog");
    if (!log) return;
    log.innerHTML = [
      '<div class="tutor-empty">',
      '  <div class="tutor-empty-icon">🧠</div>',
      '  <h4>Hello! I\'m Nyx</h4>',
      '  <p>Your dedicated AI tutor for the Claude Certified Architect curriculum. Pick a topic below or ask any question:</p>',
      '  <div class="tutor-prompt-chips">',
      '    <button type="button" class="tutor-chip" data-prompt="Explain the Agent Loop (perception, reasoning, action) in Claude architectures.">🚀 Agent Loop Stages</button>',
      '    <button type="button" class="tutor-chip" data-prompt="How do MCP clients and stdio servers communicate?">🔌 MCP Architecture</button>',
      '    <button type="button" class="tutor-chip" data-prompt="Explain Anthropic Prompt Caching breakpoint rules and minimum token thresholds.">⚡ Prompt Caching</button>',
      '    <button type="button" class="tutor-chip" data-prompt="What are the essential HITL guardrails when building autonomous agents?">🛡️ HITL &amp; Guardrails</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderTutorSession(sess) {
    setSessionInfo(sess.title || "Active session");
    var log = $("tutorLog");
    log.innerHTML = "";
    var msgs = (sess.messages || []).filter(function (m) { return m.role !== "system"; });
    if (!msgs.length) {
      log.appendChild(el("div", { class: "tutor-empty" }, "Say hello or ask a question to begin."));
      return;
    }
    msgs.forEach(function (m) { appendTutorBubble(m.role, m.content); });
    log.scrollTop = log.scrollHeight;
  }

  function appendTutorBubble(role, text) {
    var log = $("tutorLog");
    var empty = log.querySelector(".tutor-empty");
    if (empty) empty.remove();
    var row = el("div", { class: "tutor-msg " + (role === "user" ? "user" : "assistant") });
    var roleLabel = role === "user" ? "👤 You" : "🧠 " + TUTOR_NAME + " · AI Tutor";
    row.appendChild(el("div", { class: "role-tag" }, roleLabel));
    var bubble = el("div", { class: "bubble" });
    bubble.textContent = text;
    row.appendChild(bubble);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function sendTutorMessage() {
    var input = $("tutorInput");
    var text = (input.value || "").trim();
    if (!text) return;
    /* The provider/model/key live on the server for this user; we only
       need to know that a configuration exists. */
    if (!aiConfigured()) {
      alert("Configure your AI provider (⚡ AI Provider) first.");
      openProviderModal();
      return;
    }
    if (!state.activeSession) {
      api("/api/chat/sessions", { method: "POST", body: { title: text.slice(0, 60), focus: null } })
        .then(function (sess) { state.activeSession = sess; actuallySendTutor(text); })
        .catch(function (err) { alert("Failed to create session: " + (err.message || "")); });
      return;
    }
    actuallySendTutor(text);
  }

  function actuallySendTutor(text) {
    appendTutorBubble("user", text);
    $("tutorInput").value = "";
    $("tutorSendBtn").disabled = true;
    var placeholder = el("div", { class: "tutor-msg assistant" }, [
      el("div", { class: "role-tag" }, "🧠 " + TUTOR_NAME + " · AI Tutor"),
      el("div", { class: "bubble" }, "Thinking…")
    ]);
    $("tutorLog").appendChild(placeholder);
    $("tutorLog").scrollTop = $("tutorLog").scrollHeight;
    api("/api/chat/sessions/" + encodeURIComponent(state.activeSession.id) + "/messages", {
      method: "POST",
      body: { content: text }
    }).then(function (resp) {
      placeholder.remove();
      appendTutorBubble("assistant", resp.reply);
      state.activeSession = resp.session;
      setSessionInfo(resp.session.title || "Active session");
    }).catch(function (err) {
      placeholder.querySelector(".bubble").textContent = "Error: " + (err.message || "Failed to send");
      if (err && err.payload && err.payload.needsConfig) openProviderModal();
    }).then(function () {
      $("tutorSendBtn").disabled = false;
      $("tutorLog").scrollTop = $("tutorLog").scrollHeight;
    });
  }

  /* ============================================================
     Routing
     ============================================================ */
  function wireHashRouting() {
    window.addEventListener("hashchange", resolveRoute);
  }

  function resolveRoute() {
    var hash = (location.hash || "#/home").replace(/^#/, "");
    var parts = hash.split("/").filter(Boolean);
    var route = parts[0] || "home";
    setActiveNav(route === "lab" ? "labs" : route);
    if (route === "home") return renderHome();
    if (route === "syllabus") return renderSyllabus();
    if (route === "knowledge") return renderKnowledgeIndex();
    if (route === "module") return renderModule(parts[1]);
    if (route === "labs") return renderLabs();
    if (route === "lab") return renderLabDetail(parts[1]);
    if (route === "sessions") return renderSessions();
    if (route === "session") return renderSessionDetail(parts[1]);
    if (route === "resources") return renderResources();
    renderHome();
  }

  function setActiveNav(route) {
    var items = document.querySelectorAll(".nav-item");
    items.forEach(function (i) { i.classList.toggle("active", i.getAttribute("data-route") === route); });
  }

  function setBreadcrumb(text) { $("breadcrumb").textContent = text; }

  /* The footer must live INSIDE the .page div (same container as the
     Resume/Ask Nyx/Practice/Next-up cards) so it inherits the exact
     same max-width, centered margin, and left/right offset. */
  var FOOTER_NODE = null;
  function mountFooterIntoMain() {
    if (!FOOTER_NODE) {
      var tpl = $("siteFooterTemplate");
      if (!tpl) return;
      var node = tpl.content.firstElementChild;
      if (!node) return;
      FOOTER_NODE = node;
    }
    var page = document.querySelector("#mainPane > .page");
    if (!page) return;
    if (FOOTER_NODE.parentNode === page) {
      page.appendChild(FOOTER_NODE);
      return;
    }
    page.appendChild(FOOTER_NODE);
  }

  function clearMain() {
    $("mainPane").innerHTML = "";
  }

  function renderError(msg) {
    clearMain();
    $("mainPane").appendChild(el("div", { class: "banner error" }, msg || "Something went wrong."));
    mountFooterIntoMain();
  }

  /* ============================================================
     Home page — sci-fi / cyberpunk / AI feel
     ============================================================ */
  function renderHome() {
    setBreadcrumb("Home");
    clearMain();
    var page = el("div", { class: "page" });
    var name = state.me ? (state.me.name || state.me.slug) : "there";
    var firstName = String(name).split(/[_\s]+/)[0] || name;
    var greeting = (new Date().getHours() < 12) ? "Good morning" : (new Date().getHours() < 18 ? "Good afternoon" : "Good evening");

    var totalModules = state.modules.length;
    var doneCount = state.modules.filter(function (m) { return state.progress.modules[m.id] && state.progress.modules[m.id].done; }).length;
    var avgScore = 0;
    var scoreCount = 0;
    (state.progress.checkpointScores || []).forEach(function (s) { if (typeof s.pct === "number") { avgScore += s.pct; scoreCount++; } });
    avgScore = scoreCount ? Math.round(avgScore / scoreCount) : 0;
    var weakCount = (state.progress.weakTopics || []).length;
    var streak = state.progress.currentStreak || 0;
    var nextMod = state.modules.find(function (m) { return !state.progress.modules[m.id] || !state.progress.modules[m.id].done; });
    var nextUpId = (state.progress.nextUpModuleId) || (nextMod ? nextMod.id : null);
    var exam = examStats();

    /* === Sci-fi hero === */
    var hero = el("section", { class: "hero sci-fi" });
    hero.innerHTML = [
      '<div class="hero-grid"></div>',
      '<div class="hero-scan"></div>',
      '<div class="hero-stars"></div>',
      '<div class="hero-orb"></div>',
      '<div class="hero-content">',
      '  <div class="hero-eyebrow">// neural study interface · v1.0</div>',
      '  <h1 class="hero-title"><span class="title-prefix">&gt;_</span> ' + greeting + ', <span class="hero-name">' + escapeHtml(firstName) + '</span></h1>',
      '  <p class="hero-tagline">Architecting your path to <span class="accent">Claude certification</span>. <span class="mono">// 30 modules · 5 domains · 1 mission</span></p>',
      '  <div class="hero-stats sci">',
      '    <div class="hero-stat sci"><div class="big">' + doneCount + ' / ' + totalModules + '</div><div class="lbl">modules complete</div><div class="bar-mini"><span style="width:' + (totalModules ? Math.round(doneCount / totalModules * 100) : 0) + '%"></span></div></div>',
      '    <div class="hero-stat sci"><div class="big">' + avgScore + '%</div><div class="lbl">avg checkpoint score</div><div class="bar-mini"><span style="width:' + avgScore + '%"></span></div></div>',
      '    <div class="hero-stat sci" data-hero-stat="days" title="' + escapeHtml("Exam date: " + exam.examDateLong + " · " + exam.phaseDetail) + '"><div class="big">' + escapeHtml(exam.daysLabel) + '</div><div class="lbl">days to exam</div><div class="bar-mini"><span style="width:' + exam.progressPct + '%"></span></div></div>',
      '    <div class="hero-stat sci"><div class="big">' + streak + '</div><div class="lbl">day streak</div><div class="bar-mini"><span style="width:' + Math.min(100, streak * 20) + '%"></span></div></div>',
      '  </div>',
      '</div>',
      '<div class="hero-corner tl"></div><div class="hero-corner tr"></div><div class="hero-corner bl"></div><div class="hero-corner br"></div>'
    ].join("");
    page.appendChild(hero);

    /* === 3 CTA cards === */
    var ctaGrid = el("div", { class: "cta-grid sci" });
    ctaGrid.appendChild(buildCta("▶", "Resume", nextUpId ? "Continue with " + (state.modules.find(function (m) { return m.id === nextUpId; }) || {}).title : "Pick a module to begin", function () {
      if (nextUpId) location.hash = "#/module/" + nextUpId;
      else location.hash = "#/syllabus";
    }));
    ctaGrid.appendChild(buildCta("✦", "Ask " + TUTOR_NAME, "Open a focused study session in the sidebar", function () {
      if (!state.activeSession) createNewSession(null);
      else $("tutorInput").focus();
      if (document.body.classList.contains("tutor-collapsed")) { document.body.classList.remove("tutor-collapsed"); document.body.classList.add("tutor-open"); }
    }));
    ctaGrid.appendChild(buildCta("◈", "Practice", "Take a section quiz or full mock in the Exam Center", function () {
      window.open("/exam-center/", "_blank");
    }));
    page.appendChild(ctaGrid);

    /* === Official Certification Target Card === */
    var certCard = el("div", { class: "cert-target-card" });
    certCard.innerHTML = [
      '<div class="cert-target-badge-wrap">',
      '  <img src="/assets/certifications/cca_foundations_master_badge.png" alt="Claude Certified Architect – Foundations" class="cert-master-badge-img">',
      '</div>',
      '<div class="cert-target-content">',
      '  <div class="cert-target-eyebrow">OFFICIAL TARGET CREDENTIAL · ANTHROPIC CLAUDE ARCHITECT</div>',
      '  <h2 class="cert-target-title">Claude Certified Architect — Foundations (CCA-F)</h2>',
      '  <p class="cert-target-desc">Comprehensive certification covering autonomous agent loops, MCP server interfaces, CLAUDE.md conventions, prompt boundary design, and reliability engineering. Passing benchmark: 72% scaled score (43/60).</p>',
      '  <div class="cert-target-chips">',
      '    <span class="cert-chip"><img src="/assets/domains/cca_domain1_agentic_architecture.png" class="mini-domain-icon" alt="D1"> Domain 1: Agentic Architecture (27%)</span>',
      '    <span class="cert-chip"><img src="/assets/domains/cca_domain2_mcp_integration.png" class="mini-domain-icon" alt="D2"> Domain 2: Tool Design &amp; MCP (18%)</span>',
      '    <span class="cert-chip"><img src="/assets/domains/cca_domain3_code_workflows.png" class="mini-domain-icon" alt="D3"> Domain 3: Claude Code (20%)</span>',
      '    <span class="cert-chip"><img src="/assets/domains/cca_domain4_prompt_engineering.png" class="mini-domain-icon" alt="D4"> Domain 4: Prompt Engineering (20%)</span>',
      '    <span class="cert-chip"><img src="/assets/domains/cca_domain5_context_reliability.png" class="mini-domain-icon" alt="D5"> Domain 5: Reliability (15%)</span>',
      '  </div>',
      '</div>',
      '<div class="cert-target-actions">',
      '  <a href="/exam-center/" target="_blank" class="btn primary">Launch Exam Center →</a>',
      '  <a href="#/labs" class="btn ghost">Explore 14 Hands-On Labs →</a>',
      '</div>'
    ].join("");
    page.appendChild(certCard);

    if (state.syllabusSource === "fallback") {
      page.appendChild(el("div", { class: "banner warn" }, "Syllabus is using the built-in fallback (remote site unreachable). All 30 task statements are still listed below."));
    }

    /* === "Continue with" callout === */
    if (nextUpId) {
      var next = state.modules.find(function (m) { return m.id === nextUpId; });
      if (next) {
        var nextCard = el("div", { class: "next-up-card" });
        nextCard.appendChild(el("div", { class: "next-up-kicker" }, "// next up in your queue"));
        nextCard.appendChild(el("div", { class: "next-up-domain" }, next.domainName + " · " + next.weight + "%"));
        nextCard.appendChild(el("h2", { class: "next-up-title" }, next.title));
        var goBtn = el("button", { class: "btn primary" }, "Open module " + next.id + " →");
        goBtn.addEventListener("click", function () { location.hash = "#/module/" + next.id; });
        nextCard.appendChild(goBtn);
        page.appendChild(nextCard);
      }
    }

    $("mainPane").appendChild(page);
    mountFooterIntoMain();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; });
  }

  function buildCta(icon, title, sub, onClick) {
    return el("div", { class: "cta-card sci", onclick: onClick }, [
      el("div", { class: "cta-icon sci" }, icon),
      el("h3", null, title),
      el("p", null, sub),
      el("div", { class: "cta-action" }, "Open →")
    ]);
  }

  /* ============================================================
     Syllabus page — overview with weight, progress, completion stats
     ============================================================ */
  function renderSyllabus() {
    setBreadcrumb("Syllabus");
    clearMain();
    var page = el("div", { class: "page" });
    page.appendChild(el("h1", { class: "page-title" }, "Syllabus"));
    page.appendChild(el("p", { class: "page-sub" }, "Overview of the official blueprint: 5 weighted domains, 30 task statements, and your completion status."));

    /* Aggregate stats */
    var totalMods = state.modules.length;
    var doneMods = state.modules.filter(function (m) { return state.progress.modules[m.id] && state.progress.modules[m.id].done; }).length;
    var pct = totalMods ? Math.round(doneMods / totalMods * 100) : 0;
    page.appendChild(el("div", { class: "syllabus-overall" }, [
      el("div", { class: "syllabus-overall-num" }, pct + "%"),
      el("div", { class: "syllabus-overall-meta" }, [
        el("div", null, doneMods + " of " + totalMods + " modules complete"),
        el("div", { class: "progress-bar" }, el("span", { style: "width:" + pct + "%" }))
      ])
    ]));

    /* Domain summary cards with weights */
    state.syllabus.forEach(function (dom) {
      var total = dom.modules.length;
      var done = dom.modules.filter(function (m) { return state.progress.modules[m.id] && state.progress.modules[m.id].done; }).length;
      var domainPct = total ? Math.round(done / total * 100) : 0;
      var card = el("div", { class: "syllabus-domain" });
      var head = el("div", { class: "domain-head" }, [
        el("h3", null, dom.name),
        el("span", { class: "weight-pill" }, dom.weight + "%"),
        el("div", { class: "progress-bar" }, el("span", { style: "width:" + domainPct + "%" })),
        el("span", { style: "font-size:.78rem;color:var(--text-muted);" }, done + " / " + total)
      ]);
      card.appendChild(head);
      var sub = el("p", { class: "domain-summary" }, domainSummaryText(dom));
      card.appendChild(sub);
      var ctas = el("div", { class: "domain-ctas" });
      var openBtn = el("button", { class: "btn ghost" }, "View modules →");
      openBtn.addEventListener("click", function () { location.hash = "#/knowledge"; });
      ctas.appendChild(openBtn);
      var next = dom.modules.find(function (m) { return !state.progress.modules[m.id] || !state.progress.modules[m.id].done; });
      if (next) {
        var startBtn = el("button", { class: "btn primary" }, "Start " + next.id);
        startBtn.addEventListener("click", function () { location.hash = "#/module/" + next.id; });
        ctas.appendChild(startBtn);
      }
      card.appendChild(ctas);
      page.appendChild(card);
    });
    $("mainPane").appendChild(page);
    mountFooterIntoMain();
  }

  function domainSummaryText(dom) {
    var titles = dom.modules.map(function (m) { return m.title; });
    if (dom.id === 1) return "Loop management, multi-agent orchestration, subagent invocation, workflow handoff, Agent SDK hooks, task decomposition, and session resumption.";
    if (dom.id === 2) return "Tool schema design, structured errors, tool distribution and choice, MCP server integration, and built-in tools.";
    if (dom.id === 3) return "CLAUDE.md hierarchy, slash commands and skills, path-specific rules, plan mode vs direct execution, iterative refinement, and CI/CD integration.";
    if (dom.id === 4) return "System prompts with explicit criteria, few-shot prompting, structured output with tool use, validation/retry loops, batch processing, and multi-pass review.";
    if (dom.id === 5) return "Context window management, escalation and ambiguity, error propagation in multi-agent systems, codebase exploration, human review calibration, and information provenance.";
    return titles.join(", ");
  }

  /* ============================================================
     Knowledge page — module browser with per-module "Ask Nyx" button
     ============================================================ */
  function renderKnowledgeIndex() {
    setBreadcrumb("Knowledge");
    clearMain();
    var page = el("div", { class: "page" });
    page.appendChild(el("h1", { class: "page-title" }, "Knowledge"));
    page.appendChild(el("p", { class: "page-sub" }, "Browse all 30 modules. Click any module title to read its AI-generated study page; click \"Ask Nyx\" to start a focused tutor session."));

    state.syllabus.forEach(function (dom) {
      var wrap = el("div", { class: "knowledge-domain" });
      var head = el("div", { class: "domain-head" }, [
        el("h3", null, dom.name),
        el("span", { class: "weight-pill" }, dom.weight + "%")
      ]);
      wrap.appendChild(head);
      var grid = el("div", { class: "module-grid" });
      dom.modules.forEach(function (m) {
        var mod = state.progress.modules[m.id] || { done: false };
        var card = el("div", { class: "module-card" + (mod.done ? " done" : "") }, [
          el("div", { class: "mod-id" }, m.id),
          el("a", { class: "mod-title", href: "#/module/" + m.id }, m.title),
          el("div", { class: "mod-actions" }, [
            el("span", { class: "mod-status" }, mod.done ? "✓ Read" : "○ New"),
            (function () { var b = el("button", { class: "btn ghost tiny" }, "Ask Nyx"); b.addEventListener("click", function (e) { e.stopPropagation(); startNyxForModule(m); }); return b; })()
          ])
        ]);
        card.addEventListener("click", function () { location.hash = "#/module/" + m.id; });
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
      page.appendChild(wrap);
    });
    $("mainPane").appendChild(page);
    mountFooterIntoMain();
  }

  function startNyxForModule(m) {
    if (!state.activeSession) {
      createNewSession({ kind: "knowledge", moduleId: m.id });
    } else {
      api("/api/chat/sessions", { method: "POST", body: { title: "Module " + m.id, focus: { kind: "knowledge", moduleId: m.id } } })
        .then(function (sess) { state.activeSession = sess; renderTutorSession(sess); });
    }
    $("tutorInput").value = "Explain " + m.title + " in simple terms with a cybersecurity analogy.";
    $("tutorInput").focus();
    if (document.body.classList.contains("tutor-collapsed")) { document.body.classList.remove("tutor-collapsed"); document.body.classList.add("tutor-open"); }
  }

  /* ============================================================
     Module page
     ============================================================ */
  function renderModule(moduleId) {
    if (!moduleId) { renderKnowledgeIndex(); return; }
    var found = state.modules.find(function (m) { return m.id === moduleId; });
    if (!found) { renderError("Unknown module: " + moduleId); return; }
    setBreadcrumb(found.domainName + " · " + found.title);
    clearMain();
    var page = el("div", { class: "page" });
    var article = el("article", { class: "article" });
    var meta = state.progress.modules[moduleId] || { done: false, readAt: null };
    article.appendChild(el("h1", null, found.title));
    article.appendChild(el("div", { class: "article-meta" }, found.domainName + " · " + found.weight + "% · Module " + moduleId));

    var banner = el("div", { class: "ai-disclaimer" }, "AI-generated study page — verify specific facts (model names, prices, API shapes) against the official Anthropic docs.");
    article.appendChild(banner);

    var actions = el("div", { class: "article-actions" });
    var genBtn = el("button", { class: "btn primary" }, meta.done ? "Regenerate this page" : "Generate this page");
    genBtn.addEventListener("click", function () { generateModule(moduleId, article, genBtn); });
    actions.appendChild(genBtn);

    var tutorBtn = el("button", { class: "btn ghost" }, "Ask Nyx about this");
    tutorBtn.addEventListener("click", function () { startNyxForModule(found); });
    actions.appendChild(tutorBtn);

    var markBtn = el("button", { class: "btn ghost" }, meta.done ? "Mark as not done" : "Mark as done");
    markBtn.addEventListener("click", function () { toggleModuleDone(moduleId, article, markBtn); });
    actions.appendChild(markBtn);

    article.appendChild(actions);

    var body = el("div", { class: "md" });
    body.innerHTML = "<p style=\"color:var(--text-muted);font-style:italic;\">Click <strong>Generate this page</strong> to have " + TUTOR_NAME + " write a focused study page for this module. Cached on this device for instant re-opens.</p>";
    article.appendChild(body);
    page.appendChild(article);
    $("mainPane").appendChild(page);

    api("/api/knowledge/" + encodeURIComponent(moduleId)).then(function (resp) {
      if (resp && resp.html) { body.innerHTML = resp.html; }
    }).catch(function () {});
  }

  function generateModule(moduleId, article, btn) {
    if (!aiConfigured()) {
      alert("Configure your AI provider (⚡ AI Provider) first.");
      openProviderModal();
      return;
    }
    btn.disabled = true; btn.textContent = "Generating…";
    var body = article.querySelector(".md");
    body.innerHTML = "<p style=\"color:var(--text-muted);font-style:italic;\">Asking " + TUTOR_NAME + " to write this page (may take 5-15 seconds)…</p>";
    api("/api/knowledge/" + encodeURIComponent(moduleId) + "/generate", {
      method: "POST",
      body: {}
    }).then(function (resp) {
      body.innerHTML = resp.html || "<p>No content returned.</p>";
      btn.textContent = "Regenerate this page";
    }).catch(function (err) {
      body.innerHTML = "<div class=\"banner error\">AI generation failed: " + (err.message || "") + "</div>";
      btn.textContent = "Retry generation";
      if (err && err.payload && err.payload.needsConfig) openProviderModal();
    }).then(function () { btn.disabled = false; });
  }

  function toggleModuleDone(moduleId, article, btn) {
    var current = state.progress.modules[moduleId] || { done: false };
    var next = Object.assign({}, current, { done: !current.done, readAt: new Date().toISOString() });
    state.progress.modules[moduleId] = next;
    if (next.done) {
      state.progress.lastCompletedModuleId = moduleId;
      var idx = state.modules.findIndex(function (m) { return m.id === moduleId; });
      if (idx >= 0 && idx + 1 < state.modules.length) state.progress.nextUpModuleId = state.modules[idx + 1].id;
    } else {
      state.progress.nextUpModuleId = moduleId;
    }
    btn.textContent = next.done ? "Mark as not done" : "Mark as done";
    api("/api/progress", { method: "PUT", body: state.progress }).then(function () {
      location.reload();
    }).catch(function (err) { alert("Failed to save: " + (err.message || "")); });
  }

  /* ============================================================
     Labs
     ============================================================ */
  /* ============================================================
     Labs (Architect-grade interactive labs)
     ============================================================ */
  function renderLabs() {
    setBreadcrumb("Labs");
    clearMain();
    var page = el("div", { class: "page" });
    page.appendChild(el("h1", { class: "page-title" }, "Hands-On Architectural Labs"));
    page.appendChild(el("p", { class: "page-sub" }, "14 practical step-by-step labs covering the 5 Claude Certified Architect domains. 100% doable on the free tier of Claude.ai."));

    api("/api/labs").then(function (resp) {
      if (!resp || !resp.labs || !resp.labs.length) {
        page.appendChild(el("div", { class: "banner warn" }, "No labs found. Please ensure content/labs/Hands_On_Labs.md is present."));
        $("mainPane").appendChild(page);
        mountFooterIntoMain();
        return;
      }

      var labs = resp.labs;
      var activeTrackId = "all";
      var searchQuery = "";
      var allExpanded = false;

      var TRACKS = [
        {
          id: "all",
          badge: "/assets/certifications/cca_foundations_master_badge.png",
          icon: "🌟",
          title: "All Curriculum Labs",
          weight: "100%",
          desc: "Complete 14-lab hands-on journey from basic prompting to autonomous agent loops.",
          match: function () { return true; }
        },
        {
          id: "prompt",
          badge: "/assets/domains/cca_domain4_prompt_engineering.png",
          icon: "✍️",
          title: "Prompting & Structured Output",
          weight: "20% Weight",
          desc: "Clear prompts, few-shot conditioning, XML tag boundaries, and guaranteed JSON.",
          match: function (l) { return (l.domain || "").toLowerCase().indexOf("prompt") >= 0; }
        },
        {
          id: "agentic",
          badge: "/assets/domains/cca_domain1_agentic_architecture.png",
          icon: "🤖",
          title: "Agentic Architecture",
          weight: "27% Weight",
          desc: "Observe-think-act loops, role-playing agent runtimes, and multi-step decomposition.",
          match: function (l) {
            var d = (l.domain || "").toLowerCase();
            return d.indexOf("agentic") >= 0 || d.indexOf("orchestration") >= 0;
          }
        },
        {
          id: "tools",
          badge: "/assets/domains/cca_domain2_mcp_integration.png",
          icon: "🛠️",
          title: "Tool Design & MCP",
          weight: "18% Weight",
          desc: "JSON schema design, conversational tool dispatch loops, and Model Context Protocol.",
          match: function (l) {
            var d = (l.domain || "").toLowerCase();
            return d.indexOf("tool") >= 0 || d.indexOf("mcp") >= 0;
          }
        },
        {
          id: "context",
          badge: "/assets/domains/cca_domain5_context_reliability.png",
          icon: "🛡️",
          title: "Context & Reliability",
          weight: "15% Weight",
          desc: "Mini-RAG ground truth, test benchmarks, prompt injection mitigation, and context budgeting.",
          match: function (l) {
            var d = (l.domain || "").toLowerCase();
            return d.indexOf("context") >= 0 || d.indexOf("reliability") >= 0;
          }
        },
        {
          id: "code",
          badge: "/assets/domains/cca_domain3_code_workflows.png",
          icon: "💻",
          title: "Claude Code & Workflows",
          weight: "20% Weight",
          desc: "CLAUDE.md configuration, tool permissions, safety allowlists, and plan-act-verify workflow.",
          match: function (l) { return (l.domain || "").toLowerCase().indexOf("code") >= 0; }
        }
      ];

      function getLabStats(labList) {
        var totalSteps = 0;
        var completedSteps = 0;
        var completedLabs = 0;
        (labList || []).forEach(function (l) {
          var allDone = l.steps && l.steps.length > 0;
          (l.steps || []).forEach(function (s) {
            totalSteps++;
            if (s.done) completedSteps++;
            else allDone = false;
          });
          if (allDone) completedLabs++;
        });
        return {
          totalSteps: totalSteps,
          completedSteps: completedSteps,
          completedLabs: completedLabs,
          pct: totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0
        };
      }

      // Progress Banner Card
      var progressCard = el("div", { class: "labs-progress-card" });
      function updateOverallProgressUI() {
        var overallStats = getLabStats(labs);
        progressCard.innerHTML = "";
        progressCard.appendChild(el("div", { class: "labs-progress-header" }, [
          el("div", { class: "labs-progress-title" }, [
            el("span", null, "🧪"),
            el("span", null, "Curriculum Lab Completion Progress")
          ]),
          el("div", { class: "labs-progress-count" }, overallStats.completedLabs + " / " + labs.length + " Labs Complete · " + overallStats.completedSteps + "/" + overallStats.totalSteps + " Steps (" + overallStats.pct + "%)")
        ]));
        var barWrap = el("div", { class: "labs-progress-bar-wrap" });
        var barFill = el("div", { class: "labs-progress-bar-fill", style: "width: " + overallStats.pct + "%;" });
        barWrap.appendChild(barFill);
        progressCard.appendChild(barWrap);
      }
      updateOverallProgressUI();
      page.appendChild(progressCard);

      // Track Hero Cards Grid
      var tracksGrid = el("div", { class: "labs-tracks-grid" });
      function renderTracksGrid() {
        tracksGrid.innerHTML = "";
        TRACKS.forEach(function (track) {
          var trackLabs = labs.filter(track.match);
          var trackStats = getLabStats(trackLabs);
          var isDone = trackStats.completedLabs > 0 && trackStats.completedLabs === trackLabs.length;

          var card = el("div", { class: "lab-track-card" + (activeTrackId === track.id ? " active" : "") });
          card.addEventListener("click", function () {
            activeTrackId = track.id;
            renderTracksGrid();
            renderFilteredLabs();
          });

          var badgeEl = track.badge
            ? el("div", { class: "lab-track-badge-wrap" }, [el("img", { src: track.badge, alt: track.title, class: "lab-track-badge-img" })])
            : el("span", { class: "lab-track-icon" }, track.icon);

          var top = el("div", { class: "lab-track-card-top" }, [
            badgeEl,
            el("span", { class: "lab-track-weight" }, track.weight)
          ]);

          var title = el("h3", { class: "lab-track-title" }, track.title);
          var desc = el("p", { class: "lab-track-desc" }, track.desc);

          var footer = el("div", { class: "lab-track-footer" }, [
            el("span", null, trackLabs.length + (trackLabs.length === 1 ? " Lab" : " Labs")),
            el("span", { class: "lab-track-progress-pill" }, isDone ? "✓ Complete" : trackStats.completedLabs + "/" + trackLabs.length + " Done")
          ]);

          card.appendChild(top);
          card.appendChild(title);
          card.appendChild(desc);
          card.appendChild(footer);
          tracksGrid.appendChild(card);
        });
      }
      renderTracksGrid();
      page.appendChild(tracksGrid);

      // Search & Controls Toolbar
      var controlsBar = el("div", { class: "labs-controls-bar" });

      var searchWrap = el("div", { class: "labs-search-wrap" });
      searchWrap.appendChild(el("span", { class: "labs-search-icon" }, "🔍"));
      var searchInput = el("input", {
        type: "text",
        class: "labs-search-input",
        placeholder: "Search labs by keyword, topic, or command (e.g. XML, JSON, MCP, RAG)..."
      });
      searchInput.addEventListener("input", function () {
        searchQuery = (searchInput.value || "").trim().toLowerCase();
        renderFilteredLabs();
      });
      searchWrap.appendChild(searchInput);
      controlsBar.appendChild(searchWrap);

      var counterSpan = el("span", { style: "font-size: 0.82rem; font-weight: 700; color: var(--text-muted);" }, "14 Labs Available");
      controlsBar.appendChild(counterSpan);

      page.appendChild(controlsBar);

      // Labs Catalog Container
      var catalogContainer = el("div", { class: "labs-catalog-container" });
      page.appendChild(catalogContainer);

      function renderFilteredLabs() {
        catalogContainer.innerHTML = "";

        var currentTrack = TRACKS.find(function (t) { return t.id === activeTrackId; }) || TRACKS[0];
        var filtered = labs.filter(function (l) {
          if (!currentTrack.match(l)) return false;
          if (!searchQuery) return true;
          var hay = (l.title + " " + (l.domain || "") + " " + (l.goal || "") + " " + (l.observe || "") + " " + (l.whyMatters || "")).toLowerCase();
          return hay.indexOf(searchQuery) >= 0;
        });

        counterSpan.textContent = "Showing " + filtered.length + " " + (filtered.length === 1 ? "Lab" : "Labs") + (activeTrackId !== "all" ? " in " + currentTrack.title : "");

        if (!filtered.length) {
          catalogContainer.appendChild(el("div", { class: "banner info" }, "No labs match your filter or search query."));
          return;
        }

        var list = el("div", { class: "labs-catalog-list" });

        filtered.forEach(function (lab, index) {
          var isLabCompleted = lab.steps && lab.steps.length > 0 && lab.steps.every(function (s) { return s.done; });
          var completedStepCount = (lab.steps || []).filter(function (s) { return s.done; }).length;
          var labNum = (lab.title.match(/Lab\s+(\d+)/i) || [])[1] || String(index);

          var card = el("a", {
            class: "lab-catalog-card" + (isLabCompleted ? " is-completed" : ""),
            href: "#/lab/" + lab.slug
          });

          var main = el("div", { class: "lab-catalog-main" });

          var badges = el("div", { class: "lab-catalog-badges" });
          badges.appendChild(el("span", { class: "lab-num-badge" }, "LAB " + (labNum.length === 1 ? "0" + labNum : labNum)));
          if (lab.domain) {
            badges.appendChild(el("span", { class: "lab-domain-badge" }, lab.domain.split(";")[0]));
          }
          if (lab.prerequisites) {
            var isFree = lab.prerequisites.toLowerCase().indexOf("free") >= 0;
            badges.appendChild(el("span", { class: "lab-prereq-badge" }, isFree ? "✓ 100% Free Tier" : "📖 Concept / Read-Only"));
          }
          main.appendChild(badges);

          main.appendChild(el("h3", { class: "lab-catalog-title" }, lab.title));
          if (lab.goal) {
            main.appendChild(el("p", { class: "lab-catalog-goal" }, lab.goal));
          }

          var meta = el("div", { class: "lab-catalog-meta" });
          meta.appendChild(el("span", null, "⏱ ~10–15 min"));
          meta.appendChild(el("span", null, (lab.steps ? lab.steps.length : 0) + " Checkpoints"));
          meta.appendChild(el("span", { class: "lab-catalog-status-pill" + (isLabCompleted ? " done" : "") },
            isLabCompleted ? "✓ Completed" : (completedStepCount > 0 ? completedStepCount + "/" + lab.steps.length + " In Progress" : "○ Not Started")
          ));
          main.appendChild(meta);

          var action = el("div", { class: "lab-catalog-action" });
          var btn = el("span", { class: "lab-launch-btn" }, [
            el("span", null, isLabCompleted ? "Review Lab" : "Launch Lab"),
            el("span", null, "→")
          ]);
          action.appendChild(btn);

          card.appendChild(main);
          card.appendChild(action);
          list.appendChild(card);
        });

        catalogContainer.appendChild(list);
      }

      renderFilteredLabs();

      $("mainPane").appendChild(page);
      mountFooterIntoMain();
    }).catch(function (err) {
      renderError("Failed to load labs: " + (err.message || ""));
    });
  }

  function getDomainBadge(domainStr) {
    var d = (domainStr || "").toLowerCase();
    if (d.indexOf("agentic") >= 0 || d.indexOf("orchestration") >= 0) return "/assets/domains/cca_domain1_agentic_architecture.png";
    if (d.indexOf("tool") >= 0 || d.indexOf("mcp") >= 0) return "/assets/domains/cca_domain2_mcp_integration.png";
    if (d.indexOf("code") >= 0 || d.indexOf("workflow") >= 0) return "/assets/domains/cca_domain3_code_workflows.png";
    if (d.indexOf("prompt") >= 0) return "/assets/domains/cca_domain4_prompt_engineering.png";
    if (d.indexOf("context") >= 0 || d.indexOf("reliability") >= 0) return "/assets/domains/cca_domain5_context_reliability.png";
    return "/assets/certifications/cca_foundations_master_badge.png";
  }

  /* ============================================================
     Dedicated Lab Workspace (Full-page professional SaaS experience)
     ============================================================ */
  function renderLabDetail(labSlug) {
    setBreadcrumb("Lab Workspace");
    clearMain();
    var page = el("div", { class: "page" });

    api("/api/labs").then(function (resp) {
      if (!resp || !resp.labs || !resp.labs.length) {
        page.appendChild(el("div", { class: "banner warn" }, "No labs found."));
        $("mainPane").appendChild(page);
        mountFooterIntoMain();
        return;
      }

      var labs = resp.labs;
      var currentIndex = labs.findIndex(function (l) { return l.slug === labSlug; });
      if (currentIndex === -1) {
        page.appendChild(el("div", { class: "banner error" }, "Lab not found: " + labSlug));
        var back = el("a", { class: "lab-back-btn", href: "#/labs", style: "margin-top: 14px;" }, "← Back to Labs Catalog");
        page.appendChild(back);
        $("mainPane").appendChild(page);
        mountFooterIntoMain();
        return;
      }

      var lab = labs[currentIndex];
      var prevLab = currentIndex > 0 ? labs[currentIndex - 1] : null;
      var nextLab = currentIndex + 1 < labs.length ? labs[currentIndex + 1] : null;

      setBreadcrumb("Labs / " + lab.title);

      var workspace = el("div", { class: "lab-workspace" });

      // Back navigation bar
      var backBar = el("div", { class: "lab-back-bar" });
      var backBtn = el("a", { class: "lab-back-btn", href: "#/labs" }, "← Back to Labs Catalog");
      var pagerInfo = el("span", { style: "font-size: 0.82rem; font-weight: 700; color: var(--text-muted);" },
        "Lab " + (currentIndex + 1) + " of " + labs.length
      );
      backBar.appendChild(backBtn);
      backBar.appendChild(pagerInfo);
      workspace.appendChild(backBar);

      // Workspace Header Card
      var isLabCompleted = lab.steps && lab.steps.length > 0 && lab.steps.every(function (s) { return s.done; });
      var headerCard = el("div", { class: "lab-workspace-header-card" });

      var labNum = (lab.title.match(/Lab\s+(\d+)/i) || [])[1] || String(currentIndex);
      var topRow = el("div", { class: "lab-workspace-top-row" });
      var badgesRow = el("div", { class: "lab-catalog-badges" });
      var domBadgeSrc = getDomainBadge(lab.domain);
      if (domBadgeSrc) {
        badgesRow.appendChild(el("img", { src: domBadgeSrc, alt: lab.domain || "Domain", style: "width: 28px; height: 28px; object-fit: contain; border-radius: 50%; vertical-align: middle; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));" }));
      }
      badgesRow.appendChild(el("span", { class: "lab-num-badge" }, "LAB " + (labNum.length === 1 ? "0" + labNum : labNum)));
      if (lab.domain) {
        badgesRow.appendChild(el("span", { class: "lab-domain-badge" }, lab.domain));
      }
      if (lab.prerequisites) {
        var isFree = lab.prerequisites.toLowerCase().indexOf("free") >= 0;
        badgesRow.appendChild(el("span", { class: "lab-prereq-badge" }, isFree ? "✓ 100% Free Tier" : "📖 Architecture Concept"));
      }
      topRow.appendChild(badgesRow);

      var statusBadge = el("span", { class: "lab-catalog-status-pill" + (isLabCompleted ? " done" : "") },
        isLabCompleted ? "✓ Completed" : (lab.steps ? (lab.steps.filter(function (s) { return s.done; }).length + "/" + lab.steps.length + " Steps") : "In Progress")
      );
      topRow.appendChild(statusBadge);
      headerCard.appendChild(topRow);

      var title = el("h1", { class: "lab-workspace-title" }, lab.title);
      headerCard.appendChild(title);

      if (lab.goal) {
        var goalBox = el("div", { class: "lab-workspace-goal-box" }, [
          el("span", { class: "lab-workspace-goal-label" }, "🎯 Mission & Architectural Goal:"),
          el("span", null, lab.goal)
        ]);
        headerCard.appendChild(goalBox);
      }
      workspace.appendChild(headerCard);

      // Interactive Steps Section
      if (lab.steps && lab.steps.length) {
        var stepsSection = el("div", { class: "lab-steps-section" });
        stepsSection.appendChild(el("h2", { class: "lab-steps-title" }, [
          el("span", null, "⚡"),
          el("span", null, "Interactive Checkpoints & Prompts (" + lab.steps.length + " Steps)")
        ]));

        lab.steps.forEach(function (step, sIdx) {
          var stepCard = el("div", { class: "lab-step-card" + (step.done ? " is-done" : "") });

          var stepHeader = el("label", { class: "lab-step-header" });
          var cb = el("input", { type: "checkbox" });
          cb.checked = !!step.done;
          cb.addEventListener("change", function () {
            step.done = cb.checked;
            if (cb.checked) stepCard.classList.add("is-done");
            else stepCard.classList.remove("is-done");
            toggleLabStep(lab.title, step.slug, cb.checked);

            var doneCount = (lab.steps || []).filter(function (s) { return s.done; }).length;
            var allDone = doneCount === lab.steps.length;
            if (allDone) {
              statusBadge.className = "lab-catalog-status-pill done";
              statusBadge.textContent = "✓ Completed";
            } else {
              statusBadge.className = "lab-catalog-status-pill";
              statusBadge.textContent = doneCount + "/" + lab.steps.length + " Steps";
            }
          });

          stepHeader.appendChild(cb);
          stepHeader.appendChild(el("span", { class: "lab-step-text" }, (step.num ? step.num + ". " : (sIdx + 1) + ". ") + step.text));
          stepCard.appendChild(stepHeader);

          if (step.code) {
            var codeWrap = el("div", { class: "lab-code-container" });
            var pre = el("pre", { class: "lab-code-block" }, step.code);
            var copyBtn = el("button", { type: "button", class: "lab-copy-btn" }, "📋 Copy Prompt");
            copyBtn.addEventListener("click", function (e) {
              e.stopPropagation();
              var textToCopy = step.code;
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(function () {
                  copyBtn.textContent = "✓ Copied!";
                  setTimeout(function () { copyBtn.textContent = "📋 Copy Prompt"; }, 2000);
                }).catch(function () { copyFallback(textToCopy, copyBtn); });
              } else {
                copyFallback(textToCopy, copyBtn);
              }
            });
            codeWrap.appendChild(copyBtn);
            codeWrap.appendChild(pre);
            stepCard.appendChild(codeWrap);
          }

          stepsSection.appendChild(stepCard);
        });
        workspace.appendChild(stepsSection);
      }

      // Analytical Callouts Grid
      if (lab.observe || lab.whyMatters) {
        var calloutsGrid = el("div", { class: "lab-callouts-grid" });
        if (lab.observe) {
          calloutsGrid.appendChild(el("div", { class: "lab-callout-card observe" }, [
            el("div", { class: "lab-callout-title" }, [el("span", null, "👁"), el("span", null, "What to Observe & Expected Outcome")]),
            el("div", null, lab.observe)
          ]));
        }
        if (lab.whyMatters) {
          calloutsGrid.appendChild(el("div", { class: "lab-callout-card why" }, [
            el("div", { class: "lab-callout-title" }, [el("span", null, "🎯"), el("span", null, "Why this Matters for the Architect Exam")]),
            el("div", null, lab.whyMatters)
          ]));
        }
        workspace.appendChild(calloutsGrid);
      }

      // Bottom Action & Navigation Bar
      var actionsBar = el("div", { class: "lab-workspace-actions-bar" });

      var leftActions = el("div", { style: "display: flex; align-items: center; gap: 10px; flex-wrap: wrap;" });

      var nyxBtn = el("button", { type: "button", class: "btn ghost" }, "💬 Ask Nyx About This Lab");
      nyxBtn.addEventListener("click", function () {
        var prompt = "Hi Nyx! Can you coach me through " + lab.title + "? The goal is: " + (lab.goal || "practice hands-on architecture") + ". What are the key architectural concepts, design trade-offs, and exam traps I should know?";
        createNewSession({ kind: "lab", labTitle: lab.title });
        document.body.classList.remove("tutor-collapsed");
        document.body.classList.add("tutor-open");
        setTimeout(function () {
          if ($("tutorInput")) {
            $("tutorInput").value = prompt;
            $("tutorInput").focus();
          }
        }, 200);
      });
      leftActions.appendChild(nyxBtn);

      var markAllBtn = el("button", { type: "button", class: "btn ghost" });
      var allStepsDone = lab.steps && lab.steps.length > 0 && lab.steps.every(function (s) { return s.done; });
      markAllBtn.textContent = allStepsDone ? "↺ Reset Steps" : "✓ Complete All Steps";
      markAllBtn.addEventListener("click", function () {
        var newStatus = !allStepsDone;
        (lab.steps || []).forEach(function (s) {
          s.done = newStatus;
          toggleLabStep(lab.title, s.slug, newStatus);
        });
        renderLabDetail(lab.slug);
      });
      leftActions.appendChild(markAllBtn);
      actionsBar.appendChild(leftActions);

      var rightNav = el("div", { class: "lab-nav-pagers" });
      if (prevLab) {
        var prevBtn = el("a", { class: "btn ghost", href: "#/lab/" + prevLab.slug }, "← Previous Lab");
        rightNav.appendChild(prevBtn);
      }
      if (nextLab) {
        var nextBtn = el("a", { class: "btn primary", href: "#/lab/" + nextLab.slug }, "Next Lab: " + nextLab.title.split("—")[0].trim() + " →");
        rightNav.appendChild(nextBtn);
      } else {
        var finishBtn = el("a", { class: "btn primary", href: "#/labs" }, "Finish Curriculum 🎉");
        rightNav.appendChild(finishBtn);
      }
      actionsBar.appendChild(rightNav);

      workspace.appendChild(actionsBar);

      page.appendChild(workspace);
      $("mainPane").appendChild(page);
      mountFooterIntoMain();
    }).catch(function (err) {
      renderError("Failed to load lab: " + (err.message || ""));
    });
  }

  function copyFallback(text, btn) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      btn.textContent = "✓ Copied!";
      setTimeout(function () { btn.textContent = "📋 Copy"; }, 2000);
    } catch (e) {
      alert("Copy failed. Please copy manually.");
    }
    document.body.removeChild(ta);
  }

  function toggleLabStep(labTitle, stepSlug, done) {
    api("/api/labs/tick", { method: "POST", body: { labTitle: labTitle, stepSlug: stepSlug, done: done } })
      .catch(function (err) { alert("Failed to save lab step: " + (err.message || "")); });
  }

  /* ============================================================
     Sessions (Replicates Sage Sessions from Exam Center)
     ============================================================ */
  function renderSessions() {
    setBreadcrumb("Nyx sessions");
    clearMain();
    var page = el("div", { class: "page" });
    page.appendChild(el("h1", { class: "page-title" }, "Nyx AI Coaching Sessions"));

    var card = el("div", { class: "card" });
    var header = el("div", { class: "sessions-header" }, [
      el("div", null, [
        el("div", { class: "sessions-title" }, "Past Conversations"),
        el("p", { class: "sessions-sub" }, "Browse, resume in the Nyx sidebar, or delete past AI coaching sessions.")
      ]),
      (function () {
        var btn = el("button", { type: "button", class: "btn primary", id: "sessionsNewBtn" }, "+ New Session");
        btn.addEventListener("click", function () {
          createNewSession(null);
          document.body.classList.remove("tutor-collapsed");
          document.body.classList.add("tutor-open");
          setTimeout(function () { if ($("tutorInput")) $("tutorInput").focus(); }, 100);
        });
        return btn;
      })()
    ]);
    card.appendChild(header);

    var listContainer = el("div", { class: "sessions-list-container" });
    listContainer.appendChild(el("p", { class: "empty-note" }, "Loading sessions…"));
    card.appendChild(listContainer);
    page.appendChild(card);
    $("mainPane").appendChild(page);
    mountFooterIntoMain();

    api("/api/chat/sessions").then(function (list) {
      state.sessions = list;
      listContainer.innerHTML = "";
      if (!Array.isArray(list) || !list.length) {
        listContainer.appendChild(el("p", { class: "empty-note" }, 'No Nyx chat sessions yet. Click "+ New Session" above or chat with Nyx in the sidebar to start one.'));
        return;
      }
      var ul = el("div", { class: "sessions-list" });
      list.forEach(function (s) {
        var sessionCard = el("div", { class: "session-card" });
        sessionCard.addEventListener("click", function () {
          setActiveSession(s.id);
          document.body.classList.remove("tutor-collapsed");
          document.body.classList.add("tutor-open");
          setTimeout(function () { if ($("tutorInput")) $("tutorInput").focus(); }, 100);
        });

        var main = el("div", { class: "session-card-main" }, [
          el("div", { class: "session-card-title" }, s.title || "Untitled coaching session"),
          el("div", { class: "session-card-meta" }, (s.lastMessageAt ? new Date(s.lastMessageAt).toLocaleString() : "") + " · " + (s.messageCount || 0) + " msgs")
        ]);

        var actions = el("div", { class: "session-card-actions" });
        var resumeBtn = el("button", { type: "button", class: "btn primary" }, "Resume in Nyx →");
        resumeBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          setActiveSession(s.id);
          document.body.classList.remove("tutor-collapsed");
          document.body.classList.add("tutor-open");
          setTimeout(function () { if ($("tutorInput")) $("tutorInput").focus(); }, 100);
        });

        var delBtn = el("button", { type: "button", class: "btn ghost", title: "Delete session" }, "🗑");
        delBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          deleteSession(s.id, delBtn);
        });

        actions.appendChild(resumeBtn);
        actions.appendChild(delBtn);
        sessionCard.appendChild(main);
        sessionCard.appendChild(actions);
        ul.appendChild(sessionCard);
      });
      listContainer.appendChild(ul);
    }).catch(function (err) {
      listContainer.innerHTML = "";
      listContainer.appendChild(el("div", { class: "banner error" }, "Failed to load sessions: " + (err.message || "")));
    });
  }

  function deleteSession(sessionId, btn) {
    if (!window.confirm("Delete this session permanently?")) return;
    btn.disabled = true; btn.textContent = "…";
    api("/api/chat/sessions/" + encodeURIComponent(sessionId), { method: "DELETE" })
      .then(function () {
        state.sessions = state.sessions.filter(function (s) { return s.id !== sessionId; });
        if (state.activeSession && state.activeSession.id === sessionId) {
          state.activeSession = null;
          renderTutorEmpty();
        }
        renderSessions();
      })
      .catch(function (err) { alert("Delete failed: " + (err.message || "")); btn.disabled = false; btn.textContent = "×"; });
  }

  function renderSessionDetail(sessionId) {
    if (!sessionId) { renderSessions(); return; }
    setBreadcrumb("Session");
    clearMain();
    api("/api/chat/sessions/" + encodeURIComponent(sessionId)).then(function (sess) {
      var page = el("div", { class: "page" });
      var titleInput = el("input", { type: "text", value: sess.title || "", class: "session-title-input" });
      titleInput.addEventListener("change", function () {
        api("/api/chat/sessions/" + encodeURIComponent(sessionId) + "/rename", { method: "POST", body: { title: titleInput.value } })
          .then(function () { sess.title = titleInput.value; }).catch(function () {});
      });
      page.appendChild(titleInput);
      var delBtn = el("button", { class: "btn danger" }, "Delete session");
      delBtn.addEventListener("click", function () { deleteSession(sessionId, delBtn); });
      page.appendChild(el("div", { class: "session-detail-actions" }, [delBtn]));
      var article = el("article", { class: "article" });
      var msgs = (sess.messages || []).filter(function (m) { return m.role !== "system"; });
      if (!msgs.length) article.appendChild(el("p", { class: "page-sub" }, "No messages in this session yet."));
      msgs.forEach(function (m) {
        article.appendChild(el("div", { class: "tutor-msg " + (m.role === "user" ? "user" : "assistant") }, [
          el("div", { class: "role" }, m.role === "user" ? "You" : TUTOR_NAME),
          el("div", { class: "bubble" }, m.content)
        ]));
      });
      page.appendChild(article);
      var actions = el("div", { style: "display:flex;gap:8px;margin-top:18px;" });
      var resumeBtn = el("button", { class: "btn primary" }, "Resume in tutor sidebar");
      resumeBtn.addEventListener("click", function () { setActiveSession(sessionId); document.body.classList.remove("tutor-collapsed"); document.body.classList.add("tutor-open"); });
      actions.appendChild(resumeBtn);
      page.appendChild(actions);
      $("mainPane").appendChild(page);
      mountFooterIntoMain();
    }).catch(function (err) { renderError("Failed to load session: " + (err.message || "")); });
  }

  /* ============================================================
     Resources
     ============================================================ */
  function renderResources() {
    setBreadcrumb("Resources");
    clearMain();
    var page = el("div", { class: "page" });
    page.appendChild(el("h1", { class: "page-title" }, "Resources & Reference"));
    page.appendChild(el("p", { class: "page-sub" }, "Official documentation, certification links, engineering guides, and study materials for Claude Certified Architect."));

    var sections = [
      {
        title: "Official Certification",
        links: [
          { title: "Certification Page", url: "https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification", desc: "Exam objectives, scoring rules, and official registration." },
          { title: "Partner Academy Certifications", url: "https://anthropic-partners.skilljar.com/page/partner-certifications", desc: "Full catalog of Anthropic partner certifications and free courses." },
          { title: "Certification FAQ", url: "https://anthropic-partners.skilljar.com/page/faq-certifications", desc: "Rules, retakes, prerequisites, and logistics." },
          { title: "Claude Partner Network Announcement", url: "https://www.anthropic.com/news/claude-partner-network", desc: "Context on the certification program and partner tiers." }
        ]
      },
      {
        title: "Documentation & Architecture",
        links: [
          { title: "Anthropic Docs Hub", url: "https://docs.anthropic.com", desc: "Central hub for Anthropic API, guides, and model specifications." },
          { title: "Claude Documentation", url: "https://docs.claude.com", desc: "Prompt engineering, structured output, and capabilities." },
          { title: "Model Context Protocol (MCP) Docs", url: "https://modelcontextprotocol.io", desc: "Protocol specification, clients, servers, and SDK guides." },
          { title: "Building Effective Agents", url: "https://www.anthropic.com/engineering/building-effective-agents", desc: "Anthropic's canonical engineering guide to agent workflows and patterns." }
        ]
      },
      {
        title: "Free Prep Courses & Labs",
        links: [
          { title: "Anthropic Interactive Courses", url: "https://github.com/anthropics/courses", desc: "Open-source notebooks on prompt engineering, tool use, and agents." },
          { title: "Claude Code Documentation", url: "https://docs.claude.com", desc: "Agentic coding CLI setup, workflows, CLAUDE.md, and tool permissions." },
          { title: "Anthropic Official YouTube", url: "https://www.youtube.com/@AnthropicAI", desc: "Official product demos, technical deep-dives, and walkthroughs." }
        ]
      }
    ];

    sections.forEach(function (sec) {
      page.appendChild(el("div", { class: "res-subtitle" }, sec.title));
      var grid = el("div", { class: "res-grid" });
      sec.links.forEach(function (item) {
        var host = "";
        try { host = new URL(item.url).hostname; } catch (e) { host = item.url; }
        var card = el("a", { class: "res-card", href: item.url, target: "_blank", rel: "noopener" }, [
          el("div", { class: "res-title" }, item.title),
          el("div", { class: "res-desc" }, item.desc),
          el("div", { class: "res-url" }, host + " ↗")
        ]);
        grid.appendChild(card);
      });
      page.appendChild(grid);
    });

    $("mainPane").appendChild(page);
    mountFooterIntoMain();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
