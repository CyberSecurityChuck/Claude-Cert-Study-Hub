"use strict";
/* ============================================================
   Claude Certified Architect – Foundations · Study Dashboard
   Fully offline, vanilla JS. No eval / new Function / string setTimeout.

   Contains:
     1) Existing dashboard behaviour (countdown, phase, ring,
        domain checklists + localStorage, mock chart/table, reset).
     2) Quiz/Mock engine driven by window.CCAF_MANIFEST and
        window.registerQuestionSet(set).
   ============================================================ */

/* ---------- Config: key exam facts ----------
   The exam date is per-user and lives on the server (see
   /shared/exam-date.js + /api/settings). These helpers are the only
   way the rest of the file should ask "when is the exam?", so a date
   change in the profile menu is picked up everywhere at once. */
var FALLBACK_EXAM_DATE = new Date(2026, 8, 30);   // 2026-09-30 (month is 0-based)
var FALLBACK_PHASE2_DAYS = 17;
var PASS_SCALED  = 720;
var QUESTIONS    = 60;

function examApi() {
  return (typeof window !== "undefined" && window.CCAF_EXAM) ? window.CCAF_EXAM : null;
}

/* Derived exam facts, always safe to call (falls back to the built-in
   date before the shared module has loaded). */
function examStats() {
  var api = examApi();
  if (api) return api.getStats();

  var today = new Date();
  today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var exam = FALLBACK_EXAM_DATE;
  var days = Math.max(0, Math.round((exam - today) / 86400000));
  var phase1End = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate() - FALLBACK_PHASE2_DAYS);
  var isPast = exam < today;
  return {
    days: days,
    daysLabel: isPast ? "Passed" : (days === 0 ? "Today" : String(days)),
    isPast: isPast,
    isToday: !isPast && days === 0,
    phase: isPast ? "Done" : (today <= phase1End ? "Phase 1" : "Phase 2"),
    phaseLabel: isPast ? "Exam date passed" : (today <= phase1End ? "Foundations Learning" : "Timed Mock Drilling"),
    phaseDetail: isPast ? "Exam date has passed — set a new date"
      : (today <= phase1End ? "Learning" : "Mock tests"),
    progressPct: days >= 100 ? 5 : Math.min(100, Math.max(5, 100 - days)),
    examDateLong: exam.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  };
}

/* localStorage keys — everything is prefixed ccaf_ so global reset can clear it */
var LS_PREFIX   = "ccaf_";
var LS_CHECKS   = "ccaf_checks_v1";     // checklist state
var LS_MOCKS    = "ccaf_mocks_v1";      // manually logged mock attempts (feeds chart)
var LS_RESULTS  = "ccaf_results_v1";    // engine quiz/mock results keyed by set id
var LS_PROFILE  = "ccaf_active_profile"; // current user profile (name + password)
var DISCOVERED_SETS = { quizzes: [], mocks: [] };

/* Progress/score keys are namespaced per profile so two people using the
   same browser keep separate local progress. (The AI provider configuration
   is NOT stored locally — it lives server-side per user.) */
function getScopedStorageKey(baseKey) {
  var profile = readJSON(LS_PROFILE, null);
  if (!profile || !profile.name) return baseKey;
  var slug = String(profile.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return slug ? ("ccaf_user_" + slug + "_" + baseKey) : baseKey;
}

function getActiveProfile() {
  var profile = readJSON(LS_PROFILE, null);
  if (!profile || !profile.name) return null;
  return profile;
}

function getStoredUserProfiles() {
  return readJSON("ccaf_user_profiles", {});
}

function setStoredUserProfiles(list) {
  writeJSON("ccaf_user_profiles", list);
}

function saveProfile(name, password) {
  if (!name || !password) return null;
  var safeName = String(name).trim();
  var safePassword = String(password).trim();
  if (!safeName || !safePassword) return null;
  var profiles = getStoredUserProfiles();
  profiles[safeName.toLowerCase()] = { name: safeName, password: safePassword };
  setStoredUserProfiles(profiles);
  writeJSON(LS_PROFILE, { name: safeName, password: safePassword });
  return { name: safeName, password: safePassword };
}

function loginProfile(name, password, createIfMissing) {
  var safeName = String(name || "").trim();
  var safePassword = String(password || "").trim();
  if (!safeName || !safePassword) return Promise.resolve(null);
  return fetch("/api/profile/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: safeName, password: safePassword, createIfMissing: !!createIfMissing })
  }).then(function (res) {
    return res.json().then(function (payload) {
      if (!res.ok) {
        throw new Error((payload && payload.error) || "Profile sign-in failed");
      }
      if (payload && payload.user) {
        writeJSON(LS_PROFILE, { name: payload.user.name, password: safePassword });
      }
      return payload;
    });
  }).catch(function () {
    saveProfile(safeName, safePassword);
    return { ok: true, status: "created", user: { name: safeName, password: safePassword } };
  });
}

function showAuthModal() {
  var modal = $("authModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.hidden = false;
  modal.removeAttribute("hidden");
  var nameInput = $("profileNameInput") || $("authName");
  if (nameInput) nameInput.focus();
}

function hideAuthModal() {
  var modal = $("authModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.hidden = true;
  modal.setAttribute("hidden", "");
}

function logoutCurrentProfile() {
  /* Idempotent: if already logged out, do nothing. This prevents an
     infinite broadcast loop when both portals handle the same event. */
  var wasSignedIn = !!getActiveProfile();
  localStorage.removeItem(LS_PROFILE);
  try { localStorage.removeItem("ccaf_learn_active_slug"); } catch (e) {}
  try { localStorage.removeItem("ccaf_active_profile"); } catch (e) {}
  /* The AI provider selection belongs to the user who just signed out. */
  if (window.CCAF_AI) window.CCAF_AI.reset();
  /* So does the exam date: drop it and re-read the built-in default. */
  if (window.CCAF_EXAM) {
    window.CCAF_EXAM.reset();
    window.CCAF_EXAM.refresh(true).then(function () { refreshCountdown(); });
  }
  activeSageSessionId = null;
  ensureProfileSession();
  updateAccountMenu();
  showAuthModal();
  var nameInput = $("profileNameInput") || $("authName");
  var passInput = $("profilePasswordInput") || $("authPass");
  if (nameInput) nameInput.value = "";
  if (passInput) passInput.value = "";
  var status = $("profileStatus");
  if (status) status.textContent = "Logged out. Create or switch to a study profile.";
  if (wasSignedIn) {
    if (window.CCAF_AI) window.CCAF_AI.signalSignOut();
    try {
      if (typeof BroadcastChannel !== "undefined") {
        var ch = new BroadcastChannel("ccaf_auth");
        ch.postMessage({ type: "logout", at: Date.now() });
      }
    } catch (e) {}
    try { fetch("/api/profile/logout", { method: "POST", credentials: "include" }); } catch (e) {}
  }
}

function ensureProfileSession() {
  var profile = getActiveProfile();
  var badge = $("profileBadge") || $("avatarInitial");
  var status = $("profileStatus");
  if (profile && profile.name) {
    if (badge) badge.textContent = profile.name.slice(0, 1).toUpperCase();
    if (status) status.textContent = "Signed in as " + profile.name;
    updateAccountMenu();
    return profile;
  }
  if (badge) badge.textContent = "?";
  if (status) status.textContent = "Create or switch to a study profile.";
  updateAccountMenu();
  return null;
}

/* Domains with weights + foundations sub-topics.
   Stable ids so localStorage keeps working across reloads. */
var DOMAINS = [
  { id: "d1", name: "Agentic Architecture & Orchestration", weight: 27, badge: "/assets/domains/cca_domain1_agentic_architecture.png", topics: [
      "Agent loop: perception, reasoning, action",
      "Single-agent vs multi-agent orchestration patterns",
      "Workflows vs autonomous agents (when to use each)",
      "Task decomposition & delegation to sub-agents",
      "Human-in-the-loop checkpoints & guardrails"
  ]},
  { id: "d2", name: "Claude Code Configuration & Workflows", weight: 20, badge: "/assets/domains/cca_domain3_code_workflows.png", topics: [
      "Installing & configuring Claude Code",
      "CLAUDE.md project memory & instructions",
      "Permissions, allowed tools & safe automation",
      "Common coding workflows (edit, review, refactor)",
      "Slash commands & custom workflow shortcuts"
  ]},
  { id: "d3", name: "Prompt Engineering & Structured Output", weight: 20, badge: "/assets/domains/cca_domain4_prompt_engineering.png", topics: [
      "Clear instructions, roles & system prompts",
      "Few-shot examples & prompt templates",
      "XML tags to structure inputs and outputs",
      "JSON / schema-constrained structured output",
      "Iterative prompt refinement & evaluation"
  ]},
  { id: "d4", name: "Tool Design & MCP Integration", weight: 18, badge: "/assets/domains/cca_domain2_mcp_integration.png", topics: [
      "Designing clear, well-scoped tool interfaces",
      "Tool schemas, descriptions & error handling",
      "Model Context Protocol (MCP) fundamentals",
      "Connecting servers, resources & prompts via MCP",
      "Security & permissioning for tool use"
  ]},
  { id: "d5", name: "Context Management & Reliability", weight: 15, badge: "/assets/domains/cca_domain5_context_reliability.png", topics: [
      "Context windows, budgeting & token limits",
      "Summarization / compaction of long context",
      "State persistence & recovery across turns",
      "Reducing hallucination & grounding responses",
      "Evaluation, retries & reliable failure handling"
  ]}
];

/* Map domainKey -> friendly name for the engine */
var DOMAIN_NAME = {};
for (var di = 0; di < DOMAINS.length; di++) { DOMAIN_NAME[DOMAINS[di].id] = DOMAINS[di].name; }

/* ============================================================
   Storage helpers
   ============================================================ */
function readJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    var val = JSON.parse(raw);
    return (val === null || val === undefined) ? fallback : val;
  } catch (e) { return fallback; }
}
function writeJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* quota / private mode */ }
}

/* ============================================================
   Small DOM helpers
   ============================================================ */
function el(tag, attrs, children) {
  var node = document.createElement(tag);
  if (attrs) {
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      if (k === "class") node.className = attrs[k];
      else if (k === "text") node.textContent = attrs[k];
      else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) node.setAttribute(k, "");
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
    }
  }
  if (children) {
    if (!Array.isArray(children)) children = [children];
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }
  return node;
}
function $(id) { return document.getElementById(id); }

/* ============================================================
   Checklist state (per sub-topic)
   ============================================================ */
function topicKey(domainId, index) { return domainId + ":" + index; }

function getChecks() { return readJSON(getScopedStorageKey(LS_CHECKS), {}); }
function setCheck(key, val) {
  var checks = getChecks();
  if (val) checks[key] = true; else delete checks[key];
  writeJSON(getScopedStorageKey(LS_CHECKS), checks);
}

/* Count completed sub-topics for one domain */
function domainProgress(domain) {
  var checks = getChecks();
  var done = 0;
  for (var i = 0; i < domain.topics.length; i++) {
    if (checks[topicKey(domain.id, i)]) done++;
  }
  return { done: done, total: domain.topics.length };
}

/* ============================================================
   Build domain cards + checklists
   ============================================================ */
function buildDomains() {
  var grid = $("domainGrid");
  /* The Domains section is only in the DOM while that route is mounted.
     Bail out quietly instead of throwing, which used to abort the rest
     of the boot sequence (countdown, scores, generated sets). */
  if (!grid) return;
  grid.innerHTML = "";
  DOMAINS.forEach(function (domain) {
    var checks = getChecks();

    var bar = el("div", { class: "bar" }, el("span", { class: "domainBar", id: "bar_" + domain.id }));
    var meta = el("div", { class: "domain-meta", id: "meta_" + domain.id });

    var list = el("ul", { class: "checklist" });
    domain.topics.forEach(function (topic, idx) {
      var key = topicKey(domain.id, idx);
      var input = el("input", { type: "checkbox" });
      input.checked = !!checks[key];
      input.addEventListener("change", function () {
        setCheck(key, input.checked);
        refreshProgress();
      });
      var label = el("label", null, [input, el("span", { text: topic })]);
      list.appendChild(el("li", null, label));
    });

    var card = el("div", { class: "card" }, [
      el("div", { class: "domain-head" }, [
        el("div", { class: "domain-title-wrap" }, [
          el("div", { class: "domain-badge-wrap" }, [
            el("img", { src: domain.badge, alt: domain.name, class: "domain-badge-img" })
          ]),
          el("h3", { text: domain.name })
        ]),
        el("span", { class: "weight-pill", text: domain.weight + "%" })
      ]),
      meta,
      bar,
      list
    ]);
    grid.appendChild(card);
  });
}

/* ============================================================
   Progress: per-domain bars + overall ring + hero
   ============================================================ */
var RING_CIRC = 2 * Math.PI * 60; // r=60

function refreshProgress() {
  var totalDone = 0, totalAll = 0;

  DOMAINS.forEach(function (domain) {
    var p = domainProgress(domain);
    totalDone += p.done; totalAll += p.total;
    var pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    var bar = $("bar_" + domain.id);
    var meta = $("meta_" + domain.id);
    if (bar) bar.style.width = pct + "%";
    if (meta) {
      var res = latestResultFor(domain.id);
      var txt = p.done + " / " + p.total + " sub-topics · " + pct + "%";
      if (res) txt += "  ·  last quiz " + res.correct + "/" + res.total + " (" + res.pct + "%)";
      meta.textContent = txt;
    }
  });

  var overallPct = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;
  var ring = $("ringFill");
  if (ring) ring.setAttribute("stroke-dashoffset", String(RING_CIRC * (1 - overallPct / 100)));
  if ($("ringPct")) $("ringPct").textContent = overallPct + "%";
  if ($("heroPct")) $("heroPct").textContent = overallPct + "%";
  if ($("overallSummary")) {
    $("overallSummary").textContent = totalDone + " of " + totalAll +
      " sub-topics completed across all " + DOMAINS.length + " domains.";
  }

  /* Keep the Home hero in sync when it happens to be mounted. */
  refreshHeroStats();
}

/* ============================================================
   Countdown + phase
   ------------------------------------------------------------
   Updates the legacy #daysLeft / #phaseBadge nodes when they exist
   and re-renders the Home hero, which is where these numbers are
   actually shown in the current layout.
   ============================================================ */
function refreshCountdown() {
  var stats = examStats();

  if ($("daysLeft")) $("daysLeft").textContent = stats.daysLabel;

  var badge = $("phaseBadge");
  var detail = $("phaseDetail");
  if (badge) badge.textContent = stats.phase;
  if (detail) detail.textContent = stats.phaseDetail;

  /* The hero lives in #mainContent, so refresh it in place when the
     user is on Home (e.g. after saving a new exam date). */
  refreshHeroStats();
}

/* ============================================================
   Mock attempts table + chart (manual log + engine mock results)
   ============================================================ */
function scaledFromRaw(raw, total) {
  var t = total || QUESTIONS;
  return Math.round(100 + (raw / t) * 900);
}

function getMocks() { return readJSON(getScopedStorageKey(LS_MOCKS), []); }
function saveMocks(list) { writeJSON(getScopedStorageKey(LS_MOCKS), list); }

function addMock(dateStr, raw, total, source) {
  var list = getMocks();
  list.push({
    id: "m_" + Date.now() + "_" + Math.floor(Math.random() * 1e6),
    date: dateStr,
    raw: raw,
    total: total || QUESTIONS,
    source: source || "manual"
  });
  list.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  saveMocks(list);
  renderMocks();
}

function deleteMock(id) {
  var list = getMocks().filter(function (m) { return m.id !== id; });
  saveMocks(list);
  renderMocks();
}

function renderMocks() {
  var list = getMocks();
  var tbody = $("mockTbody");
  /* Only present while the Performance section is mounted. */
  if (!tbody) return;
  tbody.innerHTML = "";
  var empty = $("mockEmpty");
  var chartWrap = $("chartWrap");

  if (!list.length) {
    if (empty) empty.hidden = false;
    if (chartWrap) chartWrap.hidden = true;
    return;
  }
  if (empty) empty.hidden = true;

  list.forEach(function (m) {
    var scaled = scaledFromRaw(m.raw, m.total);
    var pass = scaled >= PASS_SCALED;
    var delBtn = el("button", { class: "row-del", title: "Delete", text: "×" });
    delBtn.addEventListener("click", function () { deleteMock(m.id); });
    var tr = el("tr", null, [
      el("td", { text: m.date + (m.source === "engine" ? " · mock" : "") }),
      el("td", { text: m.raw + " / " + m.total }),
      el("td", { text: String(scaled) }),
      el("td", null, el("span", { class: "tag " + (pass ? "pass" : "fail"), text: pass ? "PASS" : "FAIL" })),
      el("td", null, delBtn)
    ]);
    tbody.appendChild(tr);
  });

  drawChart(list);
}

function getRecentResults() {
  var entries = [];
  var all = getAllResults();
  Object.keys(all || {}).forEach(function (setId) {
    var bucket = all[setId];
    if (!bucket || !Array.isArray(bucket.history)) return;
    bucket.history.forEach(function (r) { if (r && r.mode) entries.push(r); });
  });
  entries.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
  return entries;
}

function renderPerformanceInsight() {
  var insightBody = $("insightBody");
  if (!insightBody) return;
  var results = getRecentResults().filter(function (r) { return r && (r.mode === "mock" || r.mode === "quiz"); });
  if (!results.length) {
    insightBody.innerHTML = '<p class="insight-placeholder">Complete a quiz or mock to start tracking your improvement trend.</p>';
    return;
  }

  var sorted = results.slice(0, 10).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
  var mockScores = sorted.filter(function (r) { return r.mode === "mock" && typeof r.scaled === "number"; });
  var latest = mockScores.length ? mockScores[mockScores.length - 1] : sorted[sorted.length - 1];
  var avg = mockScores.length ? Math.round(mockScores.reduce(function (sum, r) { return sum + (r.scaled || 0); }, 0) / mockScores.length) : Math.round((latest.scaled || latest.pct || 0));
  var best = mockScores.length ? Math.max.apply(null, mockScores.map(function (r) { return r.scaled || 0; })) : Math.round(latest.scaled || latest.pct || 0);
  var passRate = mockScores.length ? Math.round((mockScores.filter(function (r) { return r.pass; }).length / mockScores.length) * 100) : 0;
  var gain = mockScores.length > 1 ? Math.round((latest.scaled || 0) - (mockScores[0].scaled || 0)) : 0;
  var trendText = gain >= 0 ? "up " + gain + " pts" : "down " + Math.abs(gain) + " pts";
  var focus = (latest && latest.pct !== undefined && latest.pct < 60) ? "Target weak concept review before your next timed run." : "Keep the current rhythm and focus on consistency across full mock sets.";

  insightBody.innerHTML = [
    '<div class="insight-grid">',
    '  <div class="insight-stat"><span>Latest</span><strong>' + (latest && latest.scaled ? latest.scaled : (latest && latest.pct ? latest.pct + '%' : '--')) + '</strong></div>',
    '  <div class="insight-stat"><span>Average</span><strong>' + avg + '</strong></div>',
    '  <div class="insight-stat"><span>Best</span><strong>' + best + '</strong></div>',
    '  <div class="insight-stat"><span>Pass rate</span><strong>' + passRate + '%</strong></div>',
    '</div>',
    '<p class="insight-summary">Recent performance shows a trend ' + trendText + ' over your latest tracked attempts. The current pattern suggests ' + focus + '</p>'
  ].join('');
}

function generateAIPerformanceInsight() {
  var body = $("insightBody");
  if (!body) return;
  if (!aiConfigured()) {
    renderPerformanceInsight();
    openSageProviderModal();
    return;
  }

  var entries = getRecentResults().slice(0, 8);
  var payload = entries.map(function (r) {
    return { mode: r.mode, date: r.date || "unknown", score: (r.scaled !== undefined ? r.scaled : (r.pct || 0)), pass: !!r.pass };
  });
  if (!payload.length) {
    renderPerformanceInsight();
    return;
  }

  var prompt = [
    "You are a performance coach for an exam prep dashboard.",
    "Review this score history and provide a brief, actionable summary focused on performance, trend, and weak areas.",
    "Use plain English and keep it under 120 words.",
    "JSON format: {\"summary\": \"...\"}",
    "History:", JSON.stringify(payload)
  ].join("\n");

  aiChatCompletion(prompt, 1200)
    .then(function (content) {
      try {
        var parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim());
        var summary = parsed && parsed.summary ? parsed.summary : null;
        if (summary) {
          var latestScore = entries[0] && entries[0].scaled !== undefined ? entries[0].scaled : (entries[0] && entries[0].pct !== undefined ? entries[0].pct + '%' : '--');
          var avgScore = Math.round(entries.reduce(function (sum, r) {
            return sum + ((r.scaled !== undefined) ? r.scaled : (r.pct || 0));
          }, 0) / Math.max(entries.length, 1));
          var bestScore = Math.max.apply(null, entries.map(function (r) {
            return (r.scaled !== undefined) ? r.scaled : (r.pct || 0);
          }));
          var trendText = entries.length > 1 ? (
            ((entries[0].scaled !== undefined ? entries[0].scaled : (entries[0].pct || 0)) >=
             (entries[entries.length - 1].scaled !== undefined ? entries[entries.length - 1].scaled : (entries[entries.length - 1].pct || 0)))
              ? 'Up' : 'Down'
          ) : 'Steady';
          var statsMarkup = [
            '<div class="insight-grid">',
            '  <div class="insight-stat"><span>Latest</span><strong>' + latestScore + '</strong></div>',
            '  <div class="insight-stat"><span>Average</span><strong>' + avgScore + '</strong></div>',
            '  <div class="insight-stat"><span>Best</span><strong>' + bestScore + '</strong></div>',
            '  <div class="insight-stat"><span>Trend</span><strong>' + trendText + '</strong></div>',
            '</div>'
          ].join('');
          body.innerHTML = '<p class="insight-summary ai-summary">' + summary + '</p>' + statsMarkup;
          return;
        }
      } catch (e) {}
      renderPerformanceInsight();
    })
    .catch(function () {
      renderPerformanceInsight();
    });
}

function drawChart(list) {
  var wrap = $("chartWrap");
  var svg = $("mockChart");
  if (!wrap || !svg) return;
  wrap.hidden = false;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  var W = 640, H = 240, padL = 46, padR = 16, padT = 16, padB = 30;
  var innerW = W - padL - padR, innerH = H - padT - padB;
  var minY = 100, maxY = 1000;
  var NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]); }
    return n;
  }
  function y(v) { return padT + innerH * (1 - (v - minY) / (maxY - minY)); }
  function x(i) { return list.length <= 1 ? padL + innerW / 2 : padL + innerW * (i / (list.length - 1)); }

  [100, 300, 500, 720, 900, 1000].forEach(function (v) {
    svg.appendChild(svgEl("line", { x1: padL, y1: y(v), x2: W - padR, y2: y(v),
      stroke: v === 720 ? "var(--warn)" : "var(--border)", "stroke-width": v === 720 ? 1.5 : 1,
      "stroke-dasharray": v === 720 ? "5 4" : "" }));
    var lbl = svgEl("text", { x: 6, y: y(v) + 4, fill: "var(--text-muted)", "font-size": "10" });
    lbl.textContent = v === 720 ? "720 pass" : String(v);
    svg.appendChild(lbl);
  });

  var d = "";
  list.forEach(function (m, i) {
    var scaled = scaledFromRaw(m.raw, m.total);
    d += (i === 0 ? "M" : "L") + x(i) + " " + y(scaled) + " ";
  });
  svg.appendChild(svgEl("path", { d: d.trim(), fill: "none", stroke: "var(--accent)", "stroke-width": 2.5 }));

  list.forEach(function (m, i) {
    var scaled = scaledFromRaw(m.raw, m.total);
    svg.appendChild(svgEl("circle", { cx: x(i), cy: y(scaled), r: 4,
      fill: scaled >= PASS_SCALED ? "var(--success)" : "var(--danger)" }));
  });
}

/* ============================================================
   ==================  QUIZ / MOCK ENGINE  ====================
   ============================================================ */

/* Registry keyed by set.id. registerQuestionSet MUST exist
   before any data set file is injected. */
var QUESTION_SETS = {};
window.registerQuestionSet = function (set) {
  if (set && set.id) {
    QUESTION_SETS[set.id] = set;
    // If a loader is waiting on this set, resolve it.
    var waiter = PENDING_LOADS[set.id];
    if (waiter) { delete PENDING_LOADS[set.id]; waiter(set); }
  }
};

var PENDING_LOADS = {};       // setId -> resolve fn
var INJECTED_FILES = {};      // file path -> true (avoid double-injection)

/* Dynamically inject a data set file and resolve when registered. */
function loadSet(manifestEntry, onReady, onError) {
  var id = manifestEntry.id;
  if (QUESTION_SETS[id]) { onReady(QUESTION_SETS[id]); return; }

  PENDING_LOADS[id] = function (set) { onReady(set); };

  if (INJECTED_FILES[manifestEntry.file]) return; // already injecting; waiter handles it
  INJECTED_FILES[manifestEntry.file] = true;

  var s = document.createElement("script");
  s.src = manifestEntry.file;
  s.onload = function () {
    // If the file loaded but didn't register (fallback safety)
    if (!QUESTION_SETS[id] && PENDING_LOADS[id]) {
      // give the microtask queue a beat via requestAnimationFrame (no string setTimeout)
      requestAnimationFrame(function () {
        if (QUESTION_SETS[id]) { var w = PENDING_LOADS[id]; if (w) { delete PENDING_LOADS[id]; w(QUESTION_SETS[id]); } }
        else if (onError) { delete PENDING_LOADS[id]; onError(new Error("Set '" + id + "' did not register.")); }
      });
    }
  };
  s.onerror = function () {
    delete PENDING_LOADS[id];
    INJECTED_FILES[manifestEntry.file] = false;
    if (onError) onError(new Error("Failed to load " + manifestEntry.file));
  };
  document.body.appendChild(s);
}

/* ---------- Results persistence (keyed by set id) ---------- */
function uniqueResultKey(record) {
  if (!record) return "";
  return [record.setId || record.id || "unknown", record.mode || "quiz", String(record.date || ""), String(record.correct || 0), String(record.total || 0), String(record.pct || 0), String(record.scaled || 0), String(record.ts || 0)].join("|");
}

function mergeResultHistory(localResults, serverRecords) {
  var merged = {};
  function addRecord(setId, record) {
    if (!setId || !record) return;
    var bucket = merged[setId] || { history: [], best: null, latest: null };
    var seen = {};
    bucket.history.forEach(function (entry) { seen[uniqueResultKey(entry)] = true; });
    if (!seen[uniqueResultKey(record)]) bucket.history.push(record);
    if (bucket.history.length > 50) bucket.history = bucket.history.slice(-50);
    bucket.latest = bucket.history[0] || null;
    bucket.best = bucket.history[0] || null;
    bucket.history.forEach(function (entry) {
      if (!bucket.latest || (entry.ts || 0) > (bucket.latest.ts || 0)) bucket.latest = entry;
      if (!bucket.best || (entry.pct || 0) > (bucket.best.pct || 0)) bucket.best = entry;
    });
    merged[setId] = bucket;
  }

  Object.keys(localResults || {}).forEach(function (setId) {
    var bucket = localResults[setId];
    if (!bucket || !Array.isArray(bucket.history)) {
      if (bucket && bucket.latest) addRecord(setId, bucket.latest);
      return;
    }
    bucket.history.forEach(function (record) { addRecord(setId, record); });
    if (bucket.latest) addRecord(setId, bucket.latest);
    if (bucket.best) addRecord(setId, bucket.best);
  });

  (serverRecords || []).forEach(function (record) {
    if (!record) return;
    addRecord(record.setId || record.id || "server-record", record);
  });

  return merged;
}

function getAllResults() { return readJSON(getScopedStorageKey(LS_RESULTS), {}); }
function saveResult(setId, result) {
  var all = getAllResults();
  var bucket = all[setId] || { history: [], best: null, latest: null };
  if (result && result.setId == null) result.setId = setId;
  bucket.history.push(result);
  if (bucket.history.length > 50) bucket.history = bucket.history.slice(-50);
  bucket.latest = result;
  if (!bucket.best || result.pct > bucket.best.pct) bucket.best = result;
  all[setId] = bucket;
  writeJSON(getScopedStorageKey(LS_RESULTS), all);
  persistServerScore(result);
}

function persistServerScore(record) {
  if (!record || typeof record !== "object") return;
  var payload = {
    mode: record.mode || "quiz",
    setId: record.setId || "unknown",
    domainKey: record.domainKey || null,
    correct: Number(record.correct) || 0,
    total: Number(record.total) || 0,
    pct: Number(record.pct) || 0,
    pass: !!record.pass,
    scaled: Number(record.scaled) || null,
    autoSubmitted: !!record.autoSubmitted,
    ts: Number(record.ts) || Date.now(),
    date: record.date || new Date(Number(record.ts) || Date.now()).toISOString().slice(0, 10)
  };
  fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(function () {});
}

function loadServerScores() {
  return fetch("/api/scores").then(function (res) {
    if (!res.ok) throw new Error("Scores API failed");
    return res.json();
  }).then(function (records) {
    var merged = mergeResultHistory(getAllResults(), Array.isArray(records) ? records : []);
    writeJSON(LS_RESULTS, merged);
    return merged;
  }).catch(function () {
    return getAllResults();
  });
}

function latestResultFor(domainKey) {
  // Find the latest quiz result whose set.domainKey matches this domain.
  var all = getAllResults();
  var best = null;
  for (var setId in all) {
    if (!Object.prototype.hasOwnProperty.call(all, setId)) continue;
    var b = all[setId];
    if (b.latest && b.latest.domainKey === domainKey && b.latest.mode === "quiz") {
      if (!best || b.latest.ts > best.ts) best = b.latest;
    }
  }
  return best;
}

function normalizeDiscoveredSetEntry(entry, mode) {
  if (!entry || typeof entry !== "object") return null;
  var type = entry.type || mode;
  return {
    id: entry.id || entry.file || (type === "mock" ? "mock-generated" : "quiz-generated"),
    file: entry.file || "",
    title: entry.title || (type === "mock" ? "Generated Mock" : "Generated Quiz"),
    type: type,
    domain: entry.domain || "",
    domainKey: entry.domainKey || "ai",
    count: entry.count || 0
  };
}

function getMergedSetEntries(mode) {
  var manifest = window.CCAF_MANIFEST || { quizzes: [], mocks: [] };
  var baseKey = mode === "mock" ? "mocks" : "quizzes";
  var seen = {};
  var merged = [];
  function pushList(list) {
    if (!Array.isArray(list)) return;
    list.forEach(function (entry) {
      var normalized = normalizeDiscoveredSetEntry(entry, mode);
      if (!normalized) return;
      var key = normalized.id || normalized.file || normalized.title;
      if (!key || seen[key]) return;
      seen[key] = true;
      merged.push(normalized);
    });
  }
  pushList(manifest[baseKey] || []);
  pushList(DISCOVERED_SETS[baseKey] || []);
  return merged;
}

function refreshGeneratedSets() {
  return fetch("/api/question-sets").then(function (res) {
    if (!res.ok) throw new Error("Question-set API failed");
    return res.json();
  }).then(function (entries) {
    if (!Array.isArray(entries)) entries = [];
    var next = { quizzes: [], mocks: [] };
    entries.forEach(function (entry) {
      var mode = (entry.type === "mock" || /mock/i.test(entry.id || "") || /mock/i.test(entry.title || "")) ? "mock" : "quiz";
      var normalized = normalizeDiscoveredSetEntry(entry, mode);
      if (!normalized) return;
      next[mode === "mock" ? "mocks" : "quizzes"].push(normalized);
    });
    DISCOVERED_SETS = next;
    buildSetLists();
    return next;
  }).catch(function () {
    return DISCOVERED_SETS;
  });
}

/* ---------- Render available quizzes & mocks from manifest ---------- */
function buildSetLists() {
  renderSetList($("quizList"), $("quizEmpty"), getMergedSetEntries("quiz"), "quiz");
  renderSetList($("mockList"), $("mockListEmpty"), getMergedSetEntries("mock"), "mock");
}

function renderSetList(container, emptyNode, entries, mode) {
  if (!container) return;
  container.innerHTML = "";
  if (!entries.length) { if (emptyNode) emptyNode.hidden = false; return; }
  if (emptyNode) emptyNode.hidden = true;

  entries.forEach(function (entry) {
    var results = getAllResults()[entry.id];
    var stats = el("div", { class: "set-stats" });
    if (results && results.latest) {
      var r = results.latest;
      var passTag = el("span", { class: "tag " + (r.pass ? "pass" : "fail"), text: r.pass ? "PASS" : "FAIL" });
      stats.appendChild(document.createTextNode("Last: " + r.correct + "/" + r.total + " (" + r.pct + "%)"));
      stats.appendChild(passTag);
      if (results.best) {
        stats.appendChild(el("div", { text: "Best: " + results.best.correct + "/" + results.best.total + " (" + results.best.pct + "%) · attempts: " + results.history.length }));
      }
    } else {
      stats.textContent = "Not attempted yet.";
    }

    var startBtn = el("button", { class: "primary", text: results && results.latest ? "Retake" : "Start" });
    startBtn.addEventListener("click", function () {
      startBtn.disabled = true;
      startBtn.textContent = "Loading…";
      loadSet(entry, function (set) {
        startBtn.disabled = false;
        startBtn.textContent = results && results.latest ? "Retake" : "Start";
        openRunner(set, entry);
      }, function (err) {
        startBtn.disabled = false;
        startBtn.textContent = "Error — retry";
        stats.textContent = err.message;
      });
    });

    var generateBtn = el("button", { class: "btn ghost gen-set-btn", text: "Generate new questionnaire set" });
    generateBtn.addEventListener("click", function () {
      if (mode === "quiz") {
        aiGenerateQuiz(entry.domainKey || "d1", generateBtn);
      } else {
        aiGenerateMock(generateBtn);
      }
    });

    var metaBits = [];
    if (entry.domainKey && DOMAIN_NAME[entry.domainKey]) metaBits.push(DOMAIN_NAME[entry.domainKey]);
    metaBits.push(mode === "mock" ? "Timed mock" : "Section quiz");

    var item = el("div", { class: "set-item" }, [
      el("h3", { text: entry.title || entry.id }),
      el("div", { class: "set-meta", text: metaBits.join(" · ") }),
      stats,
      el("div", { class: "set-actions" }, [startBtn, generateBtn])
    ]);
    container.appendChild(item);
  });
}

/* ============================================================
   Runner — shared state + open/close
   ============================================================ */
var RUNNER = null; // active session state

function openRunner(set, manifestEntry) {
  var isMock = set.type === "mock";
  RUNNER = {
    set: set,
    entry: manifestEntry,
    isMock: isMock,
    idx: 0,
    answers: {},            // qIndex -> array of selected option indexes
    locked: {},             // qIndex -> true (quiz: after submit)
    finished: false,
    timerId: null,
    remaining: isMock ? (set.timeLimitMinutes || 120) * 60 : 0
  };
  $("runnerOverlay").hidden = false;
  document.body.style.overflow = "hidden";
  if (isMock && RUNNER.remaining > 0) startTimer();
  renderRunner();
}

function closeRunner() {
  stopTimer();
  RUNNER = null;
  $("runnerOverlay").hidden = true;
  document.body.style.overflow = "";
  // Refresh views that may have changed
  buildSetLists();
  refreshProgress();
  renderMocks();
}

/* ---------- Timer (mock) ---------- */
function startTimer() {
  stopTimer();
  RUNNER.timerId = window.setInterval(function () {
    if (!RUNNER) return;
    RUNNER.remaining--;
    updateTimerDisplay();
    if (RUNNER.remaining <= 0) {
      stopTimer();
      submitMock(true); // auto-submit
    }
  }, 1000);
}
function stopTimer() {
  if (RUNNER && RUNNER.timerId) { window.clearInterval(RUNNER.timerId); RUNNER.timerId = null; }
}
function fmtTime(sec) {
  if (sec < 0) sec = 0;
  var m = Math.floor(sec / 60), s = sec % 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}
function updateTimerDisplay() {
  var t = $("runnerTimer");
  if (!t || !RUNNER) return;
  t.textContent = "⏱ " + fmtTime(RUNNER.remaining);
  if (RUNNER.remaining <= 60) t.classList.add("warn"); else t.classList.remove("warn");
}

/* ============================================================
   Answer helpers
   ============================================================ */
function setAnswer(qIdx, optIdx, multi, checked) {
  var cur = RUNNER.answers[qIdx] || [];
  if (multi) {
    if (checked) { if (cur.indexOf(optIdx) === -1) cur.push(optIdx); }
    else { cur = cur.filter(function (v) { return v !== optIdx; }); }
  } else {
    cur = checked ? [optIdx] : [];
  }
  RUNNER.answers[qIdx] = cur;
}
function isCorrect(question, selected) {
  var correct = question.correct || [];
  if (selected.length !== correct.length) return false;
  var a = selected.slice().sort(function (x, y) { return x - y; });
  var b = correct.slice().sort(function (x, y) { return x - y; });
  for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return false; }
  return true;
}

/* ============================================================
   Reference link element
   ============================================================ */
function refLink(reference) {
  if (!reference || !reference.href) return null;
  var attrs = { href: reference.href, text: reference.text || reference.href };
  if (reference.external) { attrs.target = "_blank"; attrs.rel = "noopener"; }
  return el("a", attrs);
}

/* ============================================================
   Render runner (dispatch quiz vs mock)
   ============================================================ */
function renderRunner() {
  if (!RUNNER) return;
  if (RUNNER.finished) return; // results screen already rendered
  if (RUNNER.isMock) renderMockQuestion();
  else renderQuizQuestion();
}

/* ---------- QUIZ mode ---------- */
function renderQuizQuestion() {
  var panel = $("runnerPanel");
  var set = RUNNER.set;
  var q = set.questions[RUNNER.idx];
  var multi = q.type === "multi";
  var locked = !!RUNNER.locked[RUNNER.idx];
  var selected = RUNNER.answers[RUNNER.idx] || [];

  panel.innerHTML = "";

  panel.appendChild(el("div", { class: "runner-top" }, [
    el("h3", { text: set.title }),
    el("button", { class: "ghost", text: "Close", onclick: closeRunner })
  ]));
  panel.appendChild(el("div", { class: "runner-sub", text: (multi ? "Select all that apply" : "Select one") + " · pass mark " + (set.passPct || 70) + "%" }));
  panel.appendChild(el("div", { class: "q-progress", text: "Question " + (RUNNER.idx + 1) + " of " + set.questions.length }));
  panel.appendChild(el("p", { class: "q-stem", text: q.stem }));

  var optList = el("ul", { class: "q-options" });
  q.options.forEach(function (opt, oi) {
    var input = el("input", { type: multi ? "checkbox" : "radio", name: "qopt" });
    input.checked = selected.indexOf(oi) !== -1;
    input.disabled = locked;
    input.addEventListener("change", function () { setAnswer(RUNNER.idx, oi, multi, input.checked); });

    var li = el("label", { class: "q-option" + (locked ? " locked" : "") }, [input, el("span", { text: opt })]);
    if (locked) {
      var isRight = (q.correct || []).indexOf(oi) !== -1;
      var wasPicked = selected.indexOf(oi) !== -1;
      if (isRight) li.classList.add("correct");
      else if (wasPicked) li.classList.add("incorrect");
    }
    optList.appendChild(li);
  });
  panel.appendChild(optList);

  // Explanation (revealed after submit)
  var explain = el("div", { class: "q-explain", hidden: !locked });
  if (locked) {
    var correctNow = isCorrect(q, selected);
    explain.appendChild(el("div", { class: "verdict " + (correctNow ? "correct" : "incorrect"),
      text: correctNow ? "✓ Correct" : "✗ Incorrect" }));
    explain.appendChild(el("div", { text: q.explanation || "" }));
    var rl = refLink(q.reference);
    if (rl) {
      var refDiv = el("div"); refDiv.style.marginTop = "8px";
      refDiv.appendChild(document.createTextNode("Reference: "));
      refDiv.appendChild(rl);
      explain.appendChild(refDiv);
    }
  }
  panel.appendChild(explain);

  // Nav
  var nav = el("div", { class: "runner-nav" });
  if (!locked) {
    var submitBtn = el("button", { class: "primary", text: "Submit" });
    submitBtn.addEventListener("click", function () {
      RUNNER.locked[RUNNER.idx] = true;
      renderQuizQuestion();
    });
    nav.appendChild(submitBtn);
  } else {
    nav.appendChild(el("div", { class: "spacer" }));
    var isLast = RUNNER.idx === set.questions.length - 1;
    var nextBtn = el("button", { class: "primary", text: isLast ? "See results" : "Next" });
    nextBtn.addEventListener("click", function () {
      if (isLast) finishQuiz();
      else { RUNNER.idx++; renderQuizQuestion(); }
    });
    nav.appendChild(nextBtn);
  }
  panel.appendChild(nav);
}

function finishQuiz() {
  var set = RUNNER.set;
  var correct = 0;
  set.questions.forEach(function (q, i) {
    if (isCorrect(q, RUNNER.answers[i] || [])) correct++;
  });
  var total = set.questions.length;
  var pct = total ? Math.round((correct / total) * 100) : 0;
  var passPct = set.passPct || 70;
  var pass = pct >= passPct;

  var result = {
    mode: "quiz", setId: set.id, domainKey: set.domainKey || null,
    correct: correct, total: total, pct: pct, pass: pass,
    ts: Date.now(), date: new Date().toISOString().slice(0, 10)
  };
  saveResult(set.id, result);
  RUNNER.finished = true;
  renderQuizResults(result);
}

function renderQuizResults(result) {
  var panel = $("runnerPanel");
  var set = RUNNER.set;
  panel.innerHTML = "";
  panel.appendChild(el("div", { class: "runner-top" }, [
    el("h3", { text: set.title + " · Results" }),
    el("button", { class: "ghost", text: "Close", onclick: closeRunner })
  ]));

  var heroQ = el("div", { class: "result-hero" }, [
    el("div", { class: "score-big", text: result.correct + " / " + result.total }),
    el("div", { class: "score-sub", text: result.pct + "%  ·  pass mark " + (set.passPct || 70) + "%" }),
    el("span", { class: "tag " + (result.pass ? "pass" : "fail"), text: result.pass ? "PASS" : "FAIL" })
  ]);
  panel.appendChild(heroQ);

  // Review
  panel.appendChild(buildReview(set));

  var quizNav = [
    el("button", { class: "ghost", text: "Retake", onclick: function () {
      openRunner(set, RUNNER.entry);
    }})
  ];
  // AI-generated quizzes offer regenerating a fresh set of the same kind.
  if (typeof set.id === "string" && set.id.indexOf("ai-") === 0 && window.aiGenerateAnother) {
    quizNav.push(el("button", { class: "ghost", text: "Generate another set", onclick: function () { window.aiGenerateAnother(); } }));
  }
  quizNav.push(el("div", { class: "spacer" }));
  quizNav.push(el("button", { class: "primary", text: "Done", onclick: closeRunner }));
  var nav = el("div", { class: "runner-nav" }, quizNav);
  panel.appendChild(nav);
}

/* ---------- MOCK mode ---------- */
function renderMockQuestion() {
  var panel = $("runnerPanel");
  var set = RUNNER.set;
  var q = set.questions[RUNNER.idx];
  var multi = q.type === "multi";
  var selected = RUNNER.answers[RUNNER.idx] || [];

  panel.innerHTML = "";

  var top = el("div", { class: "runner-top" }, [ el("h3", { text: set.title }) ]);
  var rightWrap = el("div", null, []);
  if (RUNNER.remaining > 0 || RUNNER.set.timeLimitMinutes) {
    rightWrap.appendChild(el("span", { class: "runner-timer", id: "runnerTimer", text: "⏱ " + fmtTime(RUNNER.remaining) }));
  }
  rightWrap.appendChild(el("button", { class: "ghost", text: "Close", onclick: closeRunner }));
  rightWrap.style.display = "flex";
  rightWrap.style.gap = "8px";
  rightWrap.style.alignItems = "center";
  top.appendChild(rightWrap);
  panel.appendChild(top);
  updateTimerDisplay();

  panel.appendChild(el("div", { class: "runner-sub", text: (multi ? "Select all that apply" : "Select one") + " · answers are graded only when you submit the whole mock" }));

  // Palette
  var palette = el("div", { class: "palette" });
  set.questions.forEach(function (_, i) {
    var b = el("button", { text: String(i + 1) });
    if ((RUNNER.answers[i] || []).length) b.classList.add("answered");
    if (i === RUNNER.idx) b.classList.add("current");
    b.addEventListener("click", function () { RUNNER.idx = i; renderMockQuestion(); });
    palette.appendChild(b);
  });
  panel.appendChild(palette);

  panel.appendChild(el("div", { class: "q-progress", text: "Question " + (RUNNER.idx + 1) + " of " + set.questions.length }));
  panel.appendChild(el("p", { class: "q-stem", text: q.stem }));

  var optList = el("ul", { class: "q-options" });
  q.options.forEach(function (opt, oi) {
    var input = el("input", { type: multi ? "checkbox" : "radio", name: "mopt" });
    input.checked = selected.indexOf(oi) !== -1;
    input.addEventListener("change", function () {
      setAnswer(RUNNER.idx, oi, multi, input.checked);
      renderMockQuestion(); // refresh palette answered-state
    });
    optList.appendChild(el("label", { class: "q-option" }, [input, el("span", { text: opt })]));
  });
  panel.appendChild(optList);

  var nav = el("div", { class: "runner-nav" });
  var prevBtn = el("button", { class: "ghost", text: "‹ Prev" });
  prevBtn.disabled = RUNNER.idx === 0;
  prevBtn.addEventListener("click", function () { if (RUNNER.idx > 0) { RUNNER.idx--; renderMockQuestion(); } });
  nav.appendChild(prevBtn);
  nav.appendChild(el("div", { class: "spacer" }));

  var isLast = RUNNER.idx === set.questions.length - 1;
  if (!isLast) {
    var nextBtn = el("button", { class: "primary", text: "Next ›" });
    nextBtn.addEventListener("click", function () { RUNNER.idx++; renderMockQuestion(); });
    nav.appendChild(nextBtn);
  }
  var submitBtn = el("button", { class: isLast ? "primary" : "ghost", text: "Submit mock" });
  submitBtn.addEventListener("click", function () { submitMock(false); });
  nav.appendChild(submitBtn);
  panel.appendChild(nav);
}

function submitMock(auto) {
  if (!RUNNER || RUNNER.finished) return;
  stopTimer();
  var set = RUNNER.set;
  var correct = 0;
  set.questions.forEach(function (q, i) {
    if (isCorrect(q, RUNNER.answers[i] || [])) correct++;
  });
  var total = set.questions.length;
  var pct = total ? Math.round((correct / total) * 100) : 0;
  var scaled = Math.round(100 + (correct / total) * 900);
  var pass = scaled >= PASS_SCALED;

  var result = {
    mode: "mock", setId: set.id, domainKey: set.domainKey || null,
    correct: correct, total: total, pct: pct, scaled: scaled, pass: pass,
    autoSubmitted: !!auto,
    ts: Date.now(), date: new Date().toISOString().slice(0, 10)
  };
  saveResult(set.id, result);

  // Feed the existing mock-score chart/table (date, score/60, scaled, pass?)
  addMock(result.date, correct, total, "engine");

  RUNNER.finished = true;
  renderMockResults(result, auto);
}

function renderMockResults(result, auto) {
  var panel = $("runnerPanel");
  var set = RUNNER.set;
  panel.innerHTML = "";
  panel.appendChild(el("div", { class: "runner-top" }, [
    el("h3", { text: set.title + " · Results" }),
    el("button", { class: "ghost", text: "Close", onclick: closeRunner })
  ]));

  if (auto) panel.appendChild(el("div", { class: "runner-sub", text: "⏱ Time expired — the mock was auto-submitted." }));

  var heroElements = [];
  if (result.pass) {
    heroElements.push(el("img", {
      src: "/assets/certifications/cca_foundations_master_badge.png",
      alt: "Master Certification Emblem",
      style: "width: 80px; height: 80px; object-fit: contain; border-radius: 50%; margin: 0 auto 12px; display: block; filter: drop-shadow(0 6px 16px rgba(40,82,255,0.35));"
    }));
    heroElements.push(el("div", { style: "font-size: 0.85rem; font-weight: 800; color: #10b981; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 4px;" }, "🎉 Passing Standard Achieved!"));
  }
  heroElements.push(el("div", { class: "score-big", text: String(result.scaled) }));
  heroElements.push(el("div", { class: "score-sub", text: "estimated scaled score  ·  " + result.correct + " / " + result.total + " correct (" + result.pct + "%)  ·  pass mark " + PASS_SCALED }));
  heroElements.push(el("span", { class: "tag " + (result.pass ? "pass" : "fail"), text: result.pass ? "PASS" : "FAIL" }));

  var heroM = el("div", { class: "result-hero" }, heroElements);
  panel.appendChild(heroM);

  panel.appendChild(buildReview(set));

  var mockNav = [
    el("button", { class: "ghost", text: "Retake", onclick: function () { openRunner(set, RUNNER.entry); } })
  ];
  // AI-generated mocks offer regenerating a fresh set of the same kind.
  if (typeof set.id === "string" && set.id.indexOf("ai-") === 0 && window.aiGenerateAnother) {
    mockNav.push(el("button", { class: "ghost", text: "Generate another set", onclick: function () { window.aiGenerateAnother(); } }));
  }
  mockNav.push(el("div", { class: "spacer" }));
  mockNav.push(el("button", { class: "primary", text: "Done", onclick: closeRunner }));
  var nav = el("div", { class: "runner-nav" }, mockNav);
  panel.appendChild(nav);
}

/* ---------- Shared full review of every question ---------- */
function buildReview(set) {
  var list = el("div", { class: "review-list" });
  set.questions.forEach(function (q, i) {
    var selected = RUNNER.answers[i] || [];
    var right = isCorrect(q, selected);

    var userAns = selected.length ? selected.map(function (oi) { return q.options[oi]; }).join("; ") : "(no answer)";
    var correctAns = (q.correct || []).map(function (oi) { return q.options[oi]; }).join("; ");

    var item = el("div", { class: "review-item" }, [
      el("div", { class: "r-stem", text: (i + 1) + ". " + q.stem }),
      el("div", { class: "r-line " + (right ? "correct" : "incorrect"), text: (right ? "✓ " : "✗ ") + "Your answer: " + userAns }),
      el("div", { class: "r-line correct", text: "Correct answer: " + correctAns })
    ]);
    var ex = el("div", { class: "r-explain" });
    ex.appendChild(document.createTextNode(q.explanation || ""));
    var rl = refLink(q.reference);
    if (rl) {
      var refDiv = el("div"); refDiv.style.marginTop = "6px";
      refDiv.appendChild(document.createTextNode("Reference: "));
      refDiv.appendChild(rl);
      ex.appendChild(refDiv);
    }
    item.appendChild(ex);
    list.appendChild(item);
  });
  return list;
}

/* ============================================================
   Mock log form + global reset
   ============================================================ */
function wireMockForm() {
  var form = $("mockForm");
  if (!form) return;
  var dateInput = $("mDate");
  if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var date = $("mDate").value;
    var raw = parseInt($("mScore").value, 10);
    if (!date || isNaN(raw)) return;
    if (raw < 0) raw = 0; if (raw > QUESTIONS) raw = QUESTIONS;
    addMock(date, raw, QUESTIONS, "manual");
    $("mScore").value = "";
  });
}

function wireReset() {
  var btn = $("resetBtn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    if (!window.confirm("Reset ALL progress? This clears checklists, quiz/mock results and logged scores stored in this browser.")) return;
    // Clear every ccaf_ prefixed key
    var toRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(LS_PREFIX) === 0) toRemove.push(key);
    }
    toRemove.forEach(function (k) { localStorage.removeItem(k); });

    // Rebuild everything
    buildDomains();
    refreshProgress();
    renderMocks();
    buildSetLists();
  });
}

/* ============================================================
   ==================  AI QUESTION GENERATOR  ================
   Generates fresh section quizzes / full mocks, validates them,
   registers them with the existing engine (window.registerQuestionSet)
   and launches them via openRunner — exactly like the built-in sets.

   All provider/model/API-key handling is delegated to the shared
   module (/shared/ai-config.js), which keeps the configuration
   server-side per user. NOTHING here changes existing scoring,
   the timer, storage keys, the manifest, or the data files.
   ============================================================ */

/* Per-domain question counts for a generated mock (60 total). */
var AI_MOCK_DIST = { d1: 16, d2: 12, d3: 12, d4: 11, d5: 9 };

/* Knowledge file per domain — matches the reference.href convention
   used in quiz_domain1.js / mock_01.js (../Knowledge/0X_*.md). */
var AI_KNOWLEDGE_HREF = {
  d1: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
  d2: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
  d3: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
  d4: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
  d5: "../Knowledge/05_Context_Management_and_Reliability.md"
};

/* Tracks the most recent generation so "Generate another set" can repeat it. */
var AI_LAST_GEN = null; // { kind: "quiz"|"mock", domainKey?: "d1".. }

/* ---------- Shared AI configuration helpers ---------- */
function aiConfigured() {
  return !!(window.CCAF_AI && window.CCAF_AI.isConfigured());
}

function openSageProviderModal() {
  if (window.CCAF_AI) window.CCAF_AI.openModal();
}

/* ---------- Message area (visible, differentiated) ----------
   The generator status line (#aiMsg) only exists in some layouts; when it
   is absent, errors are surfaced with an alert so a failed generation is
   never silent, while info/success stay in the console. */
function setAiMsg(kind, text) {
  var node = $("aiMsg");
  if (node) {
    node.className = "ai-msg " + (kind || "info");
    node.textContent = text || "";
    node.hidden = !text;
    return;
  }
  if (!text) return;
  if (kind === "error") window.alert(text);
  else { try { console.info("[AI] " + text); } catch (e) {} }
}

function appendChatMessage(role, text) {
  var log = $("chatLog");
  if (!log) return;
  var row = el("div", { class: "chat-message " + role });
  row.appendChild(el("div", { class: "chat-label", text: role === "user" ? "You" : "AI Coach" }));
  row.appendChild(el("div", { class: "chat-text", text: text }));
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function openChatWidget() {
  var widget = $("chatWidget");
  if (!widget) return;
  widget.classList.remove("hidden");
  if (!$("chatLog").children.length) {
    appendChatMessage("assistant", "Ask anything about a question, concept, or exam strategy and I’ll help you reason through it.");
  }
}

function closeChatWidget() {
  var widget = $("chatWidget");
  if (widget) widget.classList.add("hidden");
}

/* If the model returned JSON like {"response": "..."} or
   {"answer": "..."} or {"text": "..."} or {"message": "..."},
   pull the inner string out so the chat shows plain text. */
function unwrapAiContent(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    var bits = [];
    value.forEach(function (item) {
      var chunk = unwrapAiContent(item);
      if (chunk) bits.push(chunk);
    });
    return bits.join("\n\n");
  }
  if (value && typeof value === "object") {
    if (typeof value.text === "string") return value.text.trim();
    if (typeof value.content === "string") return value.content.trim();
    if (Array.isArray(value.content)) return unwrapAiContent(value.content);
    if (typeof value.message === "string") return value.message.trim();
    if (Array.isArray(value.parts)) return unwrapAiContent(value.parts);
  }
  return "";
}

function unwrapJsonResponseField(text) {
  if (!text) return text;
  var trimmed = String(text).trim();
  if (trimmed.charAt(0) !== "{" || trimmed.charAt(trimmed.length - 1) !== "}") return text;
  try {
    var obj = JSON.parse(trimmed);
    if (!obj || typeof obj !== "object") return text;
    var keys = ["response", "answer", "text", "message", "reply", "content"];
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      var extracted = unwrapAiContent(v);
      if (extracted) return extracted;
    }
  } catch (e) { /* not JSON, leave as-is */ }
  return text;
}

/* System prompt for the free-form chat assistant.
   Unlike aiSystemPrompt(), this does NOT force JSON output and does
   NOT mention question generation — it is a study coach. */
function chatSystemPrompt() {
  return [
    "You are a friendly, concise study coach for the certification \"Claude Certified Architect – Foundations\".",
    "Answer the user's question in plain English. You may reference domains, concepts, exam strategy, or the current quiz/mock question if one is provided as context.",
    "Keep responses focused and practical (typically 2-8 short paragraphs or a short bullet list).",
    "Do NOT wrap replies in JSON or code fences unless the user explicitly asks for code or structured output.",
    "If you do not know something, say so rather than inventing facts."
  ].join("\n");
}

function sendChatRequest() {
  var input = $("chatInput");
  if (!input) return;
  if (!aiConfigured()) {
    appendChatMessage("assistant", "Select a provider and model in the AI Provider window before using the assistant.");
    openSageProviderModal();
    return;
  }
  var text = input.value.trim();
  if (!text) return;
  appendChatMessage("user", text);
  input.value = "";

  var userMessage = text;
  if (RUNNER && RUNNER.set && RUNNER.set.questions && RUNNER.set.questions[RUNNER.idx]) {
    var q = RUNNER.set.questions[RUNNER.idx];
    userMessage =
      "Context — the user is currently looking at this exam question:\n" +
      "Stem: " + q.stem + "\n" +
      "Options: " + q.options.join(" | ") + "\n\n" +
      "User question: " + text;
  }

  window.CCAF_AI.chat({
    messages: [
      { role: "system", content: chatSystemPrompt() },
      { role: "user",   content: userMessage }
    ],
    temperature: 0.7,
    maxTokens: 800
  }).then(function (reply) {
    var summary = String(reply || "").replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    /* Some models still wrap the answer as {"response": "..."} even when
       not asked to. Unwrap that to keep the chat clean. */
    summary = unwrapJsonResponseField(summary);
    appendChatMessage("assistant", summary || "I’m not able to answer that right now.");
  }).catch(function (err) {
    appendChatMessage("assistant", "The AI assistant couldn’t answer that request. " +
      ((err && err.message) ? "(" + err.message + ")" : "Please re-check the provider configuration and API key."));
  });
}

/* ---------- Prompt builders ---------- */
function aiSystemPrompt() {
  return [
    "You are a Principal Exam Author and Psychometrician specializing in Anthropic certification exams, specifically the \"Claude Certified Architect – Foundations\" certification.",
    "Your objective is to author authentic, rigorous, scenario-based certification questions modeled after leading enterprise cloud & AI architect exams (e.g., Anthropic, AWS, GCP, and ExamTopics scenario question standards).",
    "",
    "CRITICAL QUESTION DESIGN REQUIREMENTS:",
    "1. SCENARIO-FIRST ARCHITECTURE (80%+ OF QUESTIONS):",
    "   - Do NOT ask trivial definition or keyword-recall questions (e.g., avoid 'What is MCP?' or 'Define prompt caching').",
    "   - Frame questions around realistic enterprise engineering scenarios, e.g.:",
    "     * 'A fintech startup is architecting a multi-turn customer support agent with Claude...'",
    "     * 'An enterprise engineering team is deploying Claude Code in a CI/CD pipeline and needs to restrict tool permissions while maintaining automated review quality...'",
    "     * 'An architect is optimizing multi-turn agent latency where 85% of input tokens are static system prompts and tool schemas...'",
    "     * 'A financial intelligence agent exhausts its 200k context window after 15 turns of data analysis...'",
    "     * 'A distributed system requires connecting Claude Desktop to internal PostgreSQL and Jira via Model Context Protocol (MCP)...'",
    "   - Stems must describe the business or architectural goal, technical constraints (latency SLAs, token budgets, cost ceilings, security boundaries, failure modes), and ask for the BEST architectural decision or troubleshooting step.",
    "",
    "2. DIFFICULTY SPECTRUM:",
    "   - Provide a realistic blend: ~20% Easy (direct scenario application), ~50% Medium (trade-offs and architectural choices), and ~30% Hard (edge cases, multi-factor trade-offs, debugging complex failure modes).",
    "",
    "3. HIGH-QUALITY DISTRACTORS:",
    "   - All 4 options must be plausible, syntactically correct engineering choices.",
    "   - Distractors must represent common anti-patterns, real-world misconceptions, or solutions that violate one of the stated constraints (e.g., violates security, excessive token overhead, unhandled latency).",
    "",
    "4. MULTI-SELECT QUESTIONS:",
    "   - Include roughly 2 to 3 'multi' questions per 10 questions (the rest are 'single').",
    "   - For 'multi' questions, explicitly state in the stem e.g., '(Select TWO)' or '(Select all that apply)'.",
    "",
    "5. IN-DEPTH EXPLANATIONS:",
    "   - Provide a comprehensive, pedagogical explanation explaining WHY the correct option(s) is optimal according to Anthropic best practices and WHY the alternative options are flawed or sub-optimal.",
    "",
    "6. STRICT JSON OUTPUT FORMAT:",
    "   - Output ONLY a single valid JSON object of the form {\"questions\": [ ... ]}. No markdown, no prose, no backticks, no code fences.",
    "   - Each question object MUST use exactly this schema:",
    "     id: string (e.g. \"q1\", \"q2\"),",
    "     type: \"single\" or \"multi\",",
    "     stem: string (scenario and question text),",
    "     options: array of at least 4 distinct string choices,",
    "     correct: array of ZERO-BASED INDEXES into options array (e.g. [1] for single, [0, 2] for multi),",
    "     explanation: string (detailed reasoning).",
    "   - All indexes in 'correct' must be strictly valid 0-based integers pointing to real items in the 'options' array.",
    "   - Return valid, parseable JSON only."
  ].join("\n");
}

function aiUserPromptQuiz(domainKey, count, existingStems) {
  var dObj = (typeof DOMAINS !== "undefined" && Array.isArray(DOMAINS)) ? DOMAINS.find(function (d) { return d.id === domainKey; }) : null;
  var name = (dObj && dObj.name) || DOMAIN_NAME[domainKey] || domainKey;
  var topics = (dObj && dObj.topics) || [];

  var lines = [
    "Generate " + count + " realistic, scenario-based certification exam questions for Domain: \"" + name + "\".",
    "",
    "Syllabus Topics to Cover in Scenarios:"
  ];
  if (topics.length) {
    topics.forEach(function (t) { lines.push("  - " + t); });
  } else {
    lines.push("  - Core architectural concepts, patterns, trade-offs, and failure recovery in " + name);
  }
  lines.push("");
  lines.push("Scenario Guidelines:");
  lines.push("- 80%+ of questions must present a specific enterprise architecture, developer workflow, or production challenge with clear requirements and constraints (cost, latency, safety, or scalability).");
  lines.push("- Draw upon realistic real-world exam question patterns (similar to ExamTopics certification scenario banks for enterprise AI & cloud architects).");
  lines.push("- Balance difficulty: include ~2 Easy, ~5-6 Medium, and ~2-3 Hard scenario questions.");
  lines.push("- Include 2 to 3 multi-select questions (mark with '(Select TWO)' or '(Select all that apply)') with 2+ correct answers.");
  lines.push("- Provide clear, in-depth explanations breaking down the correct architectural choice and why distractors fail.");

  if (existingStems && existingStems.length) {
    lines.push("");
    lines.push("Do not duplicate or closely paraphrase these existing question stems:");
    existingStems.slice(0, 4).forEach(function (s) { lines.push("- " + s); });
  }
  return lines.join("\n");
}

function aiUserPromptMock(existingStems) {
  var lines = [
    "Generate a complete 60-question realistic scenario-based mock exam for the \"Claude Certified Architect – Foundations\" certification across all 5 domains:",
    "- Domain 1: Agentic Architecture & Orchestration (16 questions)",
    "- Domain 2: Claude Code Configuration & Workflows (12 questions)",
    "- Domain 3: Prompt Engineering & Structured Output (12 questions)",
    "- Domain 4: Tool Design & MCP Integration (11 questions)",
    "- Domain 5: Context Management & Reliability (9 questions)",
    "",
    "Requirements:",
    "- 80%+ of questions MUST be scenario-based (real-world enterprise architectures, production troubleshooting, and trade-offs).",
    "- Draw on authentic certification question styles found in enterprise exam banks like ExamTopics.",
    "- Difficulty mix: ~20% Easy, ~50% Medium, ~30% Hard.",
    "- Mix single-choice and multi-select questions (~2-3 multi per 10 questions).",
    "- Include comprehensive, pedagogical explanations for all questions."
  ];
  if (existingStems && existingStems.length) {
    lines.push("");
    lines.push("Avoid duplicating these existing question stems:");
    existingStems.slice(0, 4).forEach(function (s) { lines.push("- " + s); });
  }
  return lines.join("\n");
}

/* ---------- Response parsing ----------
   Strip ```json / ``` fences, trim, JSON.parse. Accept either a
   top-level array or an object with a `questions` array. */
function aiParseContent(content) {
  var text = (content || "").trim();
  // Remove leading/trailing code fences if present.
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  var data = JSON.parse(text); // may throw — caller handles
  var arr = Array.isArray(data) ? data : (data && Array.isArray(data.questions) ? data.questions : null);
  if (!arr) throw new Error("No questions array in response.");
  return arr;
}

/* ---------- Validation ----------
   Keep only well-formed questions matching the engine schema
   (correct = array of valid zero-based option indexes). */
function aiValidateQuestions(rawList, domainKey) {
  var out = [];
  var href = AI_KNOWLEDGE_HREF[domainKey] || null;
  (rawList || []).forEach(function (q, i) {
    if (!q || typeof q !== "object") return;
    var stem = typeof q.stem === "string" ? q.stem.trim() : "";
    if (!stem) return;
    var type = (q.type === "multi") ? "multi" : (q.type === "single" ? "single" : null);
    if (!type) return;
    if (!Array.isArray(q.options)) return;
    var options = q.options.filter(function (o) { return typeof o === "string" && o.trim() !== ""; });
    if (options.length < 2 || options.length !== q.options.length) return;
    if (!Array.isArray(q.correct) || !q.correct.length) return;
    var correct = [];
    var ok = true;
    q.correct.forEach(function (c) {
      var idx = c;
      // Accept an option string as well, mapping it back to its index.
      if (typeof c === "string") { idx = options.indexOf(c); }
      idx = Number(idx);
      if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) { ok = false; return; }
      if (correct.indexOf(idx) === -1) correct.push(idx);
    });
    if (!ok || !correct.length) return;
    if (type === "single" && correct.length !== 1) return;
    var explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";
    if (!explanation) return;

    var ref = { text: "Knowledge — " + (DOMAIN_NAME[domainKey] || "Reference") };
    if (href) ref.href = href;
    out.push({
      id: (typeof q.id === "string" && q.id) ? q.id : ("ai-q" + (i + 1)),
      type: type,
      stem: stem,
      options: options,
      correct: correct,
      explanation: explanation,
      reference: ref
    });
  });
  return out;
}

/* ---------- Network: question generation through the shared module ----------
   Returns the raw model content for a single generation request. Errors
   carry a message that aiReportError() surfaces to the user. */
function aiChatCompletion(userPrompt, maxTokens) {
  return window.CCAF_AI.chat({
    messages: [
      { role: "system", content: aiSystemPrompt() },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.7,
    maxTokens: maxTokens,
    jsonMode: true
  }).then(function (content) {
    if (!content) { var ce = new Error("parse"); ce.kind = "parse"; throw ce; }
    return content;
  });
}

/* ---------- Error surfacing (differentiated + visible) ---------- */
function aiReportError(err) {
  if (err && err.kind === "parse") {
    setAiMsg("error", "The model returned malformed data — try again or use a stronger model.");
    return;
  }
  var message = (err && err.message) ? String(err.message) : "";
  var normalized = message.toLowerCase();
  if (err && err.needsConfig) {
    setAiMsg("error", message || "Configure an AI provider, model, and API key first.");
    return;
  }
  if (normalized.indexOf("http 401") !== -1 || normalized.indexOf("http 403") !== -1) {
    if (normalized.indexOf("payment") !== -1 || normalized.indexOf("credit") !== -1 || normalized.indexOf("billing") !== -1) {
      setAiMsg("error", "This provider key is valid, but billing or credits are not active. Add billing/credits or switch provider.");
    } else {
      setAiMsg("error", "API key or access rejected — check your key, model, and provider permissions.");
    }
    return;
  }
  if (normalized.indexOf("http 404") !== -1) {
    setAiMsg("error", "The provider rejected the model — pick a different model in the AI Provider window.");
    return;
  }
  if (normalized.indexOf("http 429") !== -1) {
    setAiMsg("error", "Rate limited — wait and retry.");
    return;
  }
  setAiMsg("error", message || "AI generation is currently unavailable. Verify the provider, API key, and model, then retry.");
  if (err) { try { console.error("AI generation error:", err); } catch (e) {} }
}

/* ---------- Launch a generated set into the existing runner ---------- */
function persistGeneratedSet(set) {
  if (!set || !set.questions || !set.questions.length) return Promise.resolve(null);
  var payload = {
    id: set.id,
    type: set.type,
    title: set.title,
    domainKey: set.domainKey || null,
    passPct: set.passPct || 70,
    questions: set.questions
  };
  if (set.type === "mock") payload.timeLimitMinutes = set.timeLimitMinutes || 120;
  return fetch("/api/question-sets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(function (res) {
    if (!res.ok) {
      return res.json().then(function (obj) {
        throw new Error((obj && obj.error) || "Failed to save generated set");
      });
    }
    return res.json();
  }).then(function () {
    return refreshGeneratedSets();
  }).catch(function () {
    return null;
  });
}

function aiRegisterAndLaunch(set) {
  window.registerQuestionSet(set);
  persistGeneratedSet(set);
  // Reuse the exact engine launch path used by the built-in sets.
  openRunner(set, { id: set.id, title: set.title, domainKey: set.domainKey });
}

/* Collect a few existing stems (to nudge the model away from duplicates). */
function aiExistingStems(domainKey) {
  var stems = [];
  for (var id in QUESTION_SETS) {
    if (!Object.prototype.hasOwnProperty.call(QUESTION_SETS, id)) continue;
    var s = QUESTION_SETS[id];
    if (domainKey && s.domainKey !== domainKey) continue;
    (s.questions || []).forEach(function (q) { if (q && q.stem) stems.push(q.stem); });
  }
  return stems.slice(0, 4);
}

/* ---------- Loading-state helper ---------- */
function aiSetBusy(button, busy, idleLabel) {
  if (!button) return;
  if (busy) {
    button.setAttribute("data-ai-idle", idleLabel || button.textContent);
    button.disabled = true;
    button.textContent = "Generating…";
  } else {
    button.disabled = false;
    button.textContent = button.getAttribute("data-ai-idle") || idleLabel || button.textContent;
  }
  // Disable both generate buttons while any request is in flight.
  var other = button.id === "aiGenQuiz" ? $("aiGenMock") : $("aiGenQuiz");
  if (other) other.disabled = busy;
}

/* ---------- Generate a single-domain quiz (10 questions) ---------- */
function aiGenerateQuiz(domainKey, button) {
  if (!aiConfigured()) {
    alert("Please configure an AI provider, model, and API key first.");
    openSageProviderModal();
    return;
  }
  AI_LAST_GEN = { kind: "quiz", domainKey: domainKey };
  aiSetBusy(button, true, "Generate AI quiz");
  setAiMsg("info", "Generating a 10-question quiz for " + (DOMAIN_NAME[domainKey] || domainKey) + "…");

  aiChatCompletion(aiUserPromptQuiz(domainKey, 10, aiExistingStems(domainKey)), 3500)
    .then(function (content) {
      var parsed = aiParseContent(content); // may throw -> caught as parse below
      var valid = aiValidateQuestions(parsed, domainKey);
      if (valid.length < 5) {
        setAiMsg("error", "The model returned too few valid questions (" + valid.length + "). Please try again or use a stronger model.");
        aiSetBusy(button, false, "Generate AI quiz");
        return;
      }
      aiSetBusy(button, false, "Generate AI quiz");
      setAiMsg("success", "Generated " + valid.length + " questions — launching the quiz.");
      aiRegisterAndLaunch({
        id: "ai-quiz-" + domainKey + "-" + Date.now(),
        type: "quiz",
        title: "AI Quiz — " + (DOMAIN_NAME[domainKey] || domainKey),
        questions: valid,
        passPct: 70,
        domainKey: domainKey
      });
    })
    .catch(function (err) {
      aiSetBusy(button, false, "Generate AI quiz");
      if (err instanceof SyntaxError) { setAiMsg("error", "The model returned malformed data — try again or use a stronger model."); return; }
      aiReportError(err);
    });
}

/* ---------- Generate a full mock (60 questions, 16/12/12/11/9) ----------
   Requests each domain chunk in parallel, then combines. */
function aiGenerateMock(button) {
  if (!aiConfigured()) {
    alert("Please configure an AI provider, model, and API key first.");
    openSageProviderModal();
    return;
  }
  AI_LAST_GEN = { kind: "mock" };
  aiSetBusy(button, true, "Generate AI mock");
  setAiMsg("info", "Generating a full 60-question mock across all domains… this can take a moment.");

  var order = ["d1", "d2", "d3", "d4", "d5"];
  var jobs = order.map(function (dk) {
    return aiChatCompletion(aiUserPromptQuiz(dk, AI_MOCK_DIST[dk], aiExistingStems(dk)), 4500)
      .then(function (content) { return aiValidateQuestions(aiParseContent(content), dk); });
  });

  Promise.all(jobs)
    .then(function (chunks) {
      var all = [];
      chunks.forEach(function (c) { all = all.concat(c); });
      if (all.length < 30) {
        setAiMsg("error", "The model returned too few valid questions (" + all.length + "). Please try again or use a stronger model.");
        aiSetBusy(button, false, "Generate AI mock");
        return;
      }
      aiSetBusy(button, false, "Generate AI mock");
      setAiMsg("success", "Generated " + all.length + " questions — launching the mock.");
      aiRegisterAndLaunch({
        id: "ai-mock-" + Date.now(),
        type: "mock",
        title: "AI Mock — " + all.length + " questions",
        questions: all,
        passPct: 70,
        timeLimitMinutes: 120,
        domainKey: "mock"
      });
    })
    .catch(function (err) {
      aiSetBusy(button, false, "Generate AI mock");
      if (err instanceof SyntaxError) { setAiMsg("error", "The model returned malformed data — try again or use a stronger model."); return; }
      aiReportError(err);
    });
}

/* ---------- Regenerate the same kind as the last generation ----------
   Called from the results screen ("Generate another set"). */
function aiGenerateAnother() {
  if (!AI_LAST_GEN) return;
  closeRunner();
  if (AI_LAST_GEN.kind === "mock") {
    aiGenerateMock(null);
  } else {
    aiGenerateQuiz(AI_LAST_GEN.domainKey, null);
  }
}

/* Expose the "generate another" hook so the results screens can call it. */
window.aiGenerateAnother = aiGenerateAnother;

/* ============================================================
   Init
   ============================================================ */
function initThemeToggle() {
  var toggle = $("themeToggle");
  if (!toggle) return;

  var icon = toggle.querySelector(".theme-icon");
  var label = toggle.querySelector(".theme-label");
  var savedTheme = localStorage.getItem("ccaf_theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (icon) icon.textContent = "🌙";
    if (label) label.textContent = "Dark";
  } else if (icon) {
    icon.textContent = "☀️";
  }

  toggle.addEventListener("click", function () {
    var dark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("ccaf_theme", dark ? "dark" : "light");
    var activeIcon = toggle.querySelector(".theme-icon");
    var activeLabel = toggle.querySelector(".theme-label");
    if (activeIcon) activeIcon.textContent = dark ? "🌙" : "☀️";
    if (activeLabel) activeLabel.textContent = dark ? "Dark" : "Light";
  });
}

function initAuthModal() {
  var modal = $("authModal");
  var closeBtn = $("authClose");
  var signInBtn = $("signinProfileBtn");
  var saveBtn = $("saveProfileBtn");
  var logoutBtn = $("logoutProfileBtn");
  if (!modal) return;

  if (closeBtn) closeBtn.addEventListener("click", function () { hideAuthModal(); });
  if (logoutBtn) logoutBtn.addEventListener("click", function () { logoutCurrentProfile(); });

  function handleProfileAction(createIfMissing) {
    var nameInput = $("profileNameInput") || $("authName");
    var passInput = $("profilePasswordInput") || $("authPass");
    if (!nameInput || !passInput) return;
    var name = nameInput.value.trim();
    var password = passInput.value.trim();
    if (!name || !password) {
      alert("Please enter both a name and password.");
      return;
    }
    loginProfile(name, password, createIfMissing).then(function (payload) {
      if (!payload || !payload.user) return;
      saveProfile(payload.user.name, password);
      ensureProfileSession();
      hideAuthModal();
      updateAccountMenu();
      renderPerformanceInsight();
      /* Load the provider/model this user saved previously (if any). */
      if (window.CCAF_AI) window.CCAF_AI.refresh();
      /* …and this user's own exam date. */
      if (window.CCAF_EXAM) window.CCAF_EXAM.refresh(true).then(function () { refreshCountdown(); });
      var msg = $("profileStatus");
      if (msg) msg.textContent = payload.status === "created" ? "Profile created and signed in." : "Signed in as " + payload.user.name;
    }).catch(function (err) {
      alert(err && err.message ? err.message : "Profile sign-in failed.");
    });
  }

  if (signInBtn) signInBtn.addEventListener("click", function () { handleProfileAction(false); });
  if (saveBtn) saveBtn.addEventListener("click", function () { handleProfileAction(true); });

  var passInput = $("profilePasswordInput") || $("authPass");
  var nameInput = $("profileNameInput") || $("authName");
  if (passInput) {
    passInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleProfileAction(false);
    });
  }
  if (nameInput) {
    nameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && passInput) passInput.focus();
    });
  }
}

function initChatWidget() {
  var launcher = $("chatLauncher");
  var closeBtn = $("chatClose");
  var sendBtn = $("chatSend");
  var input = $("chatInput");
  if (launcher) launcher.addEventListener("click", openChatWidget);
  if (closeBtn) closeBtn.addEventListener("click", closeChatWidget);
  if (sendBtn) sendBtn.addEventListener("click", sendChatRequest);
  if (input) input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatRequest();
    }
  });
}

/* ---------- AI provider window (shared module) ---------- */
function initAiProvider() {
  if (!window.CCAF_AI) return;
  window.CCAF_AI.init({
    modal: "sageProviderModal",
    providerSelect: "sageProvSel",
    modelSelect: "sageModelSel",
    modelOverrideInput: "sageModelOverride",
    apiKeyInput: "sageApiKey",
    saveButton: "sageProvSave",
    cancelButton: "sageProvCancel",
    openButtons: ["aiProviderBtn", "openProviderBtn"],
    badge: "sageProviderInfo"
  });
}

/* ---------- Exam date (shared module) ---------- */
function initExamDate() {
  if (!window.CCAF_EXAM) return;
  /* Re-render the countdown/phase cards whenever the date changes,
     including changes made in the Study Hub tab. */
  window.CCAF_EXAM.onChange(function () {
    refreshCountdown();
  });
  window.CCAF_EXAM.init();
}

function restoreSessionProfile() {
  return fetch("/api/me", { credentials: "include" })
    .then(function (res) {
      if (!res.ok) throw new Error("401");
      return res.json();
    })
    .then(function (me) {
      if (!me || !me.slug) throw new Error("no user");
      var current = getActiveProfile();
      var persisted = { name: me.name || me.slug, password: (current && current.password) ? current.password : "" };
      writeJSON(LS_PROFILE, persisted);
      ensureProfileSession();
      hideAuthModal();
      updateAccountMenu();
      return me;
    })
    .catch(function () {
      localStorage.removeItem(LS_PROFILE);
      try { localStorage.removeItem("ccaf_learn_active_slug"); } catch (e) {}
      try { localStorage.removeItem("ccaf_active_profile"); } catch (e) {}
      ensureProfileSession();
      updateAccountMenu();
      showAuthModal();
      return null;
    });
}

function init() {
  initThemeToggle();
  initAuthModal();
  initAuthBroadcast();
  initChatWidget();
  initAiProvider();
  initExamDate();
  // Restore profile first, then initialize remaining features that
  // depend on the active profile.
  restoreSessionProfile().then(function () {
    buildDomains();
    refreshProgress();
    refreshCountdown();
    renderMocks();
    renderPerformanceInsight();
    buildSetLists();
    wireMockForm();
    wireReset();
    loadServerScores();
    refreshGeneratedSets();
  }).catch(function () {
    // Even if restoring profile fails, continue with non-AI features.
    buildDomains();
    refreshProgress();
    refreshCountdown();
    renderMocks();
    renderPerformanceInsight();
    buildSetLists();
    wireMockForm();
    wireReset();
    loadServerScores();
    refreshGeneratedSets();
  });
  initLearnPortalLink();
  initLearnPortalSync();

  var overlay = $("runnerOverlay");
  if (overlay) {
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeRunner(); });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && RUNNER) closeRunner();
  });
  $("generateInsightBtn") && $("generateInsightBtn").addEventListener("click", generateAIPerformanceInsight);
}

/* When the Learn portal signs out in another tab, also sign out here. */
function initAuthBroadcast() {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    var ch = new BroadcastChannel("ccaf_auth");
    ch.onmessage = function (ev) {
      if (!ev || !ev.data || ev.data.type !== "logout") return;
      /* Idempotent: only react if we are currently signed in, to
         avoid an infinite postMessage loop if some other code path
         is also broadcasting. */
      if (getActiveProfile()) {
        logoutCurrentProfile();
      }
    };
  } catch (e) {}
}

/* ============================================================
   Learn portal integration
   ============================================================ */

/* Map Dashboard's positional topic key (e.g. "d1:0") to the
   Learn portal's module id (e.g. "1-1-agentic-loops"). The order
   matches the 5+7+5+6+6+6 module layout in the Learn syllabus. */
var DASH_TO_MODULE = (function () {
  var map = {};
  var groups = [
    ["d1", 7], ["d2", 5], ["d3", 6], ["d4", 6], ["d5", 6]
  ];
  /* The module ids, in domain order, as defined in server.js. */
  var idsByDomain = {
    d1: ["1-1-agentic-loops", "1-2-orchestration-patterns", "1-3-subagent-invocation-context", "1-4-workflow-enforcement-handoff", "1-5-agent-sdk-hooks", "1-6-task-decomposition", "1-7-session-state-resumption"],
    d2: ["2-1-tool-schema-design", "2-2-structured-error-responses", "2-3-tool-distribution-choice", "2-4-mcp-server-integration", "2-5-built-in-tools"],
    d3: ["3-1-claude-md-hierarchy", "3-2-slash-commands-skills", "3-3-path-specific-rules", "3-4-plan-mode-execution", "3-5-iterative-refinement", "3-6-cicd-integration"],
    d4: ["4-1-system-prompts", "4-2-few-shot-prompting", "4-3-structured-output", "4-4-validation-retry-loops", "4-5-batch-processing", "4-6-multi-pass-review"],
    d5: ["5-1-context-window-management", "5-2-escalation-ambiguity", "5-3-error-propagation", "5-4-codebase-exploration", "5-5-human-review-calibration", "5-6-information-provenance"]
  };
  Object.keys(idsByDomain).forEach(function (dId) {
    var arr = idsByDomain[dId];
    for (var i = 0; i < arr.length; i++) {
      map[dId + ":" + i] = arr[i];
    }
  });
  return map;
})();

function dashboardKeyToModuleId(key) { return DASH_TO_MODULE[key] || null; }

function initLearnPortalLink() {
  /* Add a small "Study Hub ↗" link to the topbar hero actions if not present. */
  var heroActions = document.querySelector(".hero-actions");
  if (!heroActions) return;
  if ($("learnPortalLink")) return;
  var link = el("a", { id: "learnPortalLink", href: "/", target: "_blank", rel: "noopener", class: "learn-portal-link" }, "Study Hub ↗");
  /* Inline minimal styling so we don't touch styles.css. */
  link.style.cssText = "background:rgba(255,255,255,.10); color:#fff; border:1px solid rgba(255,255,255,.24); border-radius:999px; padding:7px 12px; font-size:.78rem; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;";
  heroActions.appendChild(link);
}

function initLearnPortalSync() {
  /* Add a "Sync to Study Hub" button to the toolbar. */
  var toolbar = document.querySelector(".toolbar");
  if (!toolbar || $("syncLearnBtn")) return;
  var btn = el("button", { id: "syncLearnBtn", class: "ghost", style: "margin-right:10px;" }, "Sync to Study Hub");
  toolbar.insertBefore(btn, toolbar.firstChild);

  btn.addEventListener("click", function () {
    var profile = getActiveProfile();
    if (!profile || !profile.name) {
      if (window.confirm("You need a study profile to sync progress to the Study Hub. Create one now?")) {
        var modal = $("authModal");
        if (modal) modal.classList.remove("hidden");
      }
      return;
    }
    btn.disabled = true;
    btn.textContent = "Syncing…";
    var checks = getChecks();
    var moduleFlags = {};
    Object.keys(checks).forEach(function (k) {
      if (!checks[k]) return;
      var mid = dashboardKeyToModuleId(k);
      if (mid) moduleFlags[mid] = true;
    });
    var body = {
      schemaVersion: 1,
      phase: "Phase 1 - Foundations Learning",
      lastCompletedModuleId: null,
      nextUpModuleId: null,
      lastSessionAt: new Date().toISOString(),
      currentStreak: 0,
      modules: {},
      checkpointScores: [],
      mockScores: [],
      weakTopics: [],
      notes: []
    };
    Object.keys(moduleFlags).forEach(function (mid) {
      body.modules[mid] = { done: true, readAt: new Date().toISOString(), checkpointScore: null };
    });
    /* Preserve any mock scores the server already has. */
    fetch("/api/progress", { credentials: "include" }).then(function (r) { return r.json(); }).then(function (existing) {
      if (existing && Array.isArray(existing.mockScores)) body.mockScores = existing.mockScores;
      if (existing && Array.isArray(existing.checkpointScores)) body.checkpointScores = existing.checkpointScores;
      Object.keys(existing && existing.modules || {}).forEach(function (mid) {
        if (existing.modules[mid] && existing.modules[mid].done && !body.modules[mid]) {
          body.modules[mid] = existing.modules[mid];
        }
      });
      return fetch("/api/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      btn.textContent = "Synced ✓";
      setTimeout(function () { btn.textContent = "Sync to Study Hub"; btn.disabled = false; }, 2500);
    }).catch(function (err) {
      btn.textContent = "Sync failed: " + (err.message || "");
      setTimeout(function () { btn.textContent = "Sync to Study Hub"; btn.disabled = false; }, 3500);
    });
  });
}

/* The original init() invocation is now at the bottom of this file,
   combined with the new layout init. */

/* ============================================================
   NEW: Sectioned SPA layout
   Router, 7 renderers, Sage sidebar, account dropdown, sync UI
   ============================================================ */

/* ---- Router ---- */
var ROUTES = {
  home:        { label: "Home",          render: null /* set later */ },
  domains:     { label: "Domains",       render: null },
  quizzes:     { label: "Quizzes",       render: null },
  mocks:       { label: "Mock Tests",    render: null },
  plan:        { label: "Plan",          render: null },
  performance: { label: "Performance",   render: null },
  sessions:    { label: "Sage Sessions", render: null },
  resources:   { label: "Resources",     render: null }
};

function setActiveNav(route) {
  var items = document.querySelectorAll("#leftNav .nav-item");
  items.forEach(function (i) { i.classList.toggle("active", i.getAttribute("data-route") === route); });
}

function setBreadcrumb(text) {
  var bc = document.getElementById("breadcrumb");
  if (bc) bc.textContent = text;
}

var SECTION_TEMPLATES = {};
function cacheSectionTemplates() {
  var bank = document.getElementById("sectionBank");
  if (!bank) return;
  bank.querySelectorAll("[data-section]").forEach(function (sec) {
    var key = sec.getAttribute("data-section");
    if (key && !SECTION_TEMPLATES[key]) {
      SECTION_TEMPLATES[key] = sec.innerHTML;
    }
  });
  bank.innerHTML = "";
}

function setMain(html) {
  var target = document.getElementById("mainContent") || document.getElementById("mainPane");
  if (!target) return;
  if (typeof html === "string") target.innerHTML = html;
  else if (html instanceof Node) { target.innerHTML = ""; target.appendChild(html); }
  else target.innerHTML = "";
}

/* ---- Generic section renderer: mounts the matching section from
   cached templates into #mainContent and wires its live event listeners. */
function renderBankSection(key, label) {
  setActiveNav(key);
  setBreadcrumb(label);
  cacheSectionTemplates();
  var inner = SECTION_TEMPLATES[key] || "";
  setMain('<section data-section="' + key + '">' + inner + '</section>');

  if (key === "domains") {
    buildDomains();
    refreshProgress();
  } else if (key === "quizzes" || key === "mocks") {
    buildSetLists();
  } else if (key === "sessions") {
    renderSageSessionsSection();
  } else if (key === "performance") {
    renderMocks();
    renderPerformanceInsight();
    wireMockForm();
    var gib = document.getElementById("generateInsightBtn");
    if (gib && !gib._wired) {
      gib._wired = true;
      gib.addEventListener("click", generateAIPerformanceInsight);
    }
  }

  /* Wire reset button */
  var rb = document.getElementById("resetBtn");
  if (rb && !rb._wired) {
    rb._wired = true;
    rb.addEventListener("click", function () {
      if (window.confirm("Reset all your local progress (checklists, scores)?")) {
        try { localStorage.removeItem(LS_PROFILE); } catch (e) {}
        try {
          /* The AI provider configuration is stored server-side per user,
             so clearing local progress never wipes it. */
          for (var k in localStorage) {
            if (k.indexOf("ccaf_") === 0 && k !== "ccaf_active_profile" && k !== "ccaf_theme") {
              try { localStorage.removeItem(k); } catch (e) {}
            }
          }
        } catch (e) {}
        location.reload();
      }
    });
  }
}

/* ---- Home renderer (custom sci-fi hero + rich content) ---- */
function getGreeting() {
  var h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
function getFirstName(name) {
  return String(name || "there").split(/[_\s]+/)[0] || (name || "there");
}
function getActiveProfileName() {
  try {
    var p = getActiveProfile ? getActiveProfile() : null;
    return p && p.name ? p.name : null;
  } catch (e) { return null; }
}
function getHeroStatValues() {
  /* Compute from the same sources the Domains section uses, instead of
     scraping #daysLeft / #phaseBadge / #heroPct. Those nodes only exist
     inside section templates that are not mounted while Home is on
     screen, which is why these cards used to render as "–". */
  var stats = examStats();

  var checks = (typeof getChecks === "function") ? getChecks() : {};
  var done = 0, total = 0;
  DOMAINS.forEach(function (domain) {
    total += domain.topics.length;
    for (var i = 0; i < domain.topics.length; i++) {
      if (checks[topicKey(domain.id, i)]) done++;
    }
  });
  var pct = total ? Math.round((done / total) * 100) : 0;

  return {
    days: stats.daysLabel,
    daysPct: stats.progressPct,
    phase: stats.phase,
    phaseLabel: stats.phaseLabel,
    phaseDetail: stats.phaseDetail,
    phasePct: stats.phase === "Phase 1" ? 50 : (stats.phase === "Phase 2" ? 100 : 5),
    examDateLong: stats.examDateLong,
    pct: pct + "%",
    pctValue: pct,
    done: done,
    total: total
  };
}
function getDomainDataForHome() {
  /* Derive from DOMAINS + stored checks. Reading #domainGrid does not
     work here: cacheSectionTemplates() empties the section bank, so the
     grid only exists while the Domains route is mounted. */
  var checks = (typeof getChecks === "function") ? getChecks() : {};
  return DOMAINS.map(function (domain) {
    var done = 0;
    for (var i = 0; i < domain.topics.length; i++) {
      if (checks[topicKey(domain.id, i)]) done++;
    }
    return {
      id: domain.id,
      name: domain.name,
      weight: domain.weight + "%",
      done: done,
      total: domain.topics.length
    };
  });
}
function getRecentScores() {
  /* Same reason as above: read the stored mock log rather than the
     #mockTbody rows, which only exist on the Performance route. */
  var list = (typeof getMocks === "function") ? getMocks() : [];
  return list.slice().sort(function (a, b) {
    return (a.date < b.date) ? 1 : ((a.date > b.date) ? -1 : 0);
  }).map(function (m) {
    var total = m.total || QUESTIONS;
    var scaled = scaledFromRaw(m.raw, total);
    return {
      date: m.date + (m.source === "engine" ? " · mock" : ""),
      raw: m.raw + " / " + total,
      scaled: String(scaled),
      result: scaled >= PASS_SCALED ? "PASS" : "FAIL"
    };
  });
}
function getNextUpFromPlan() {
  /* Walk the plan DOM or cached template and pick the first "next" item. */
  var planHtml = SECTION_TEMPLATES["plan"] || "";
  var temp = document.createElement("div");
  temp.innerHTML = planHtml;
  var task = temp.querySelector(".timeline-tasks li");
  if (task && task.textContent) return task.textContent.trim();
  var li = temp.querySelector(".phase-bullet-list li");
  if (li && li.textContent) return li.textContent.trim();
  return "Week 1: Agentic Core & Orchestration deep-dive";
}

function renderHome() {
  setActiveNav("home");
  setBreadcrumb("Home");
  cacheSectionTemplates();

  var stats = getHeroStatValues();
  var domains = getDomainDataForHome();
  var recent = getRecentScores().slice(0, 3);
  var nextUp = getNextUpFromPlan();
  var profileName = getActiveProfileName() || "there";
  var firstName = getFirstName(profileName);
  var greeting = getGreeting();

  var html = '';
  /* Sci-fi hero */
  html += '<section class="hero sci-fi">';
  html += '<div class="hero-grid"></div>';
  html += '<div class="hero-scan"></div>';
  html += '<div class="hero-orb"></div>';
  html += '<div class="hero-content">';
  html += '  <div class="hero-eyebrow">// certification_dashboard.v1</div>';
  html += '  <h1 class="hero-title"><span class="title-prefix">&gt;_</span> ' + greeting + ', <span class="hero-name">' + escapeHtml(firstName) + '</span></h1>';
  html += '  <p class="hero-tagline">Architecting your path to <span class="accent">Claude certification</span>. <span class="mono">// 5 domains · 60 questions · 1 mission</span></p>';
  html += '  <div class="hero-stats sci">';
  html += '    <div class="hero-stat sci" data-hero-stat="days" title="' + escapeHtml("Exam date: " + stats.examDateLong) + '"><div class="big">' + escapeHtml(stats.days) + '</div><div class="lbl">days to exam</div><div class="bar-mini"><span style="width:' + stats.daysPct + '%"></span></div></div>';
  html += '    <div class="hero-stat sci" data-hero-stat="phase" title="' + escapeHtml(stats.phaseDetail) + '"><div class="big">' + escapeHtml(stats.phase) + '</div><div class="lbl">current phase</div><div class="bar-mini"><span style="width:' + stats.phasePct + '%"></span></div></div>';
  html += '    <div class="hero-stat sci" data-hero-stat="pct"><div class="big">' + escapeHtml(stats.pct) + '</div><div class="lbl">overall progress</div><div class="bar-mini"><span style="width:' + stats.pctValue + '%"></span></div></div>';
  html += '    <div class="hero-stat sci" data-hero-stat="topics"><div class="big">' + stats.done + ' / ' + stats.total + '</div><div class="lbl">sub-topics done</div><div class="bar-mini"><span style="width:' + (stats.total ? Math.round(stats.done / stats.total * 100) : 0) + '%"></span></div></div>';
  html += '  </div>';
  html += '</div>';
  html += '<div class="hero-corner tl"></div><div class="hero-corner tr"></div><div class="hero-corner bl"></div><div class="hero-corner br"></div>';
  html += '</section>';

  /* 3 CTA cards */
  html += '<div class="cta-grid sci">';
  html += '  <div class="cta-card sci" data-cta="domains"><div class="cta-icon">≡</div><h3>Resume Domains</h3><p>Continue ticking sub-topics across the 5 weighted domains.</p><div class="cta-action">Open →</div></div>';
  html += '  <div class="cta-card sci" data-cta="quizzes"><div class="cta-icon">?</div><h3>Take a Quiz</h3><p>Practice with instant-feedback quizzes on any section.</p><div class="cta-action">Open →</div></div>';
  html += '  <div class="cta-card sci" data-cta="mocks"><div class="cta-icon">⌚</div><h3>Take a Mock</h3><p>Full timed 60-question practice exam. Submit to reveal results.</p><div class="cta-action">Open →</div></div>';
  html += '</div>';

  /* Sync indicator */
  html += '<div class="sync-indicator">';
  html += '  <div class="sync-status" id="syncStatusText">' + escapeHtml(lastSyncText) + '</div>';
  html += '  <button id="syncNowBtn" type="button">Sync now</button>';
  html += '</div>';

  /* Domain strip */
  if (domains.length) {
    html += '<div class="domain-strip">';
    domains.forEach(function (d) {
      var pct = d.total ? Math.round(d.done / d.total * 100) : 0;
      html += '<div class="domain-strip-card" data-domain-strip="' + escapeHtml(d.name) + '">';
      html += '  <div class="ds-weight">' + escapeHtml(d.weight || "") + '</div>';
      html += '  <div class="ds-name">' + escapeHtml(d.name) + '</div>';
      html += '  <div class="ds-pct">' + pct + '%</div>';
      html += '  <div class="ds-bar"><span style="width:' + pct + '%"></span></div>';
      html += '</div>';
    });
    html += '</div>';
  }

  /* Next-up callout */
  if (nextUp) {
    html += '<div class="next-up-card">';
    html += '  <div class="next-up-kicker">// next up in your study plan</div>';
    html += '  <div class="next-up-domain">From the Study Plan</div>';
    html += '  <h2 class="next-up-title">' + escapeHtml(nextUp.slice(0, 120)) + '</h2>';
    html += '  <button class="btn primary" data-cta="plan">Open plan →</button>';
    html += '</div>';
  }

  /* Recent activity */
  html += '<div class="recent-activity"><h3>Recent activity</h3><div class="recent-activity-list">';
  if (recent.length === 0) {
    html += '<div class="recent-activity-empty">No mock attempts yet. Take your first mock to start tracking your trend.</div>';
  } else {
    recent.forEach(function (r) {
      html += '<div class="recent-activity-item">';
      html += '  <span class="ra-date">' + escapeHtml(r.date) + '</span>';
      html += '  <span class="ra-score">' + escapeHtml(r.raw) + '</span>';
      html += '  <span>' + escapeHtml(r.scaled) + '</span>';
      html += '  <span>' + escapeHtml(r.result) + '</span>';
      html += '</div>';
    });
  }
  html += '</div></div>';

  setMain(html);

  /* Wire up the sync button after injection */
  wireHomeCtas();
  wireSyncNowButton();
}

/* Update the hero stat cards in place. Cheaper than re-rendering the
   whole Home route, and keeps scroll position when the exam date is
   changed from the profile menu. */
function refreshHeroStats() {
  var wrap = document.querySelector('.hero.sci-fi .hero-stats.sci');
  if (!wrap) return;
  var stats = getHeroStatValues();

  function paint(key, value, pct, tooltip) {
    var card = wrap.querySelector('[data-hero-stat="' + key + '"]');
    if (!card) return;
    var big = card.querySelector(".big");
    var bar = card.querySelector(".bar-mini span");
    if (big) big.textContent = value;
    if (bar) bar.style.width = pct + "%";
    if (tooltip) card.setAttribute("title", tooltip);
  }

  paint("days", stats.days, stats.daysPct, "Exam date: " + stats.examDateLong);
  paint("phase", stats.phase, stats.phasePct, stats.phaseDetail);
  paint("pct", stats.pct, stats.pctValue, null);
  paint("topics", stats.done + " / " + stats.total,
    stats.total ? Math.round(stats.done / stats.total * 100) : 0, null);
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}

function wireHomeCtas() {
  var mp = document.getElementById("mainPane");
  if (!mp) return;
  mp.querySelectorAll("[data-cta]").forEach(function (el) {
    el.addEventListener("click", function () {
      var target = el.getAttribute("data-cta");
      location.hash = "#/" + target;
    });
  });
  mp.querySelectorAll("[data-domain-strip]").forEach(function (el) {
    el.addEventListener("click", function () { location.hash = "#/domains"; });
  });
}

/* ---- Sync now button ---- */
var lastSyncText = "Sync not yet run";
function wireSyncNowButton() {
  var btn = document.getElementById("syncNowBtn");
  var txt = document.getElementById("syncStatusText");
  if (!btn) return;
  /* Read cached sync info */
  try {
    var saved = localStorage.getItem("ccaf_dash_last_sync");
    if (saved) lastSyncText = "Last synced: " + saved;
  } catch (e) {}
  if (txt) txt.textContent = lastSyncText;
  btn.addEventListener("click", function () {
    btn.disabled = true;
    btn.textContent = "Syncing…";
    if (txt) txt.textContent = "Syncing with Study Hub…";
    var profile = getActiveProfile ? getActiveProfile() : null;
    if (!profile || !profile.name) {
      if (txt) txt.textContent = "Sign in to sync";
      btn.textContent = "Sync now"; btn.disabled = false;
      return;
    }
    var checks = getChecks ? getChecks() : {};
    var moduleFlags = {};
    Object.keys(checks).forEach(function (k) {
      if (!checks[k]) return;
      var mid = dashboardKeyToModuleId ? dashboardKeyToModuleId(k) : null;
      if (mid) moduleFlags[mid] = true;
    });
    var body = {
      schemaVersion: 1,
      phase: "Phase 1 - Foundations Learning",
      lastCompletedModuleId: null,
      nextUpModuleId: null,
      lastSessionAt: new Date().toISOString(),
      currentStreak: 0,
      modules: {},
      checkpointScores: [],
      mockScores: [],
      weakTopics: [],
      notes: []
    };
    Object.keys(moduleFlags).forEach(function (mid) {
      body.modules[mid] = { done: true, readAt: new Date().toISOString(), checkpointScore: null };
    });
    fetch("/api/progress", { credentials: "include" }).then(function (r) { return r.json(); }).then(function (existing) {
      if (existing && Array.isArray(existing.mockScores)) body.mockScores = existing.mockScores;
      if (existing && Array.isArray(existing.checkpointScores)) body.checkpointScores = existing.checkpointScores;
      Object.keys((existing && existing.modules) || {}).forEach(function (mid) {
        if (existing.modules[mid] && existing.modules[mid].done && !body.modules[mid]) {
          body.modules[mid] = existing.modules[mid];
        }
      });
      return fetch("/api/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      var stamp = new Date().toLocaleString();
      try { localStorage.setItem("ccaf_dash_last_sync", stamp); } catch (e) {}
      if (txt) txt.textContent = "Last synced: " + stamp;
      btn.textContent = "Synced ✓";
      setTimeout(function () { btn.textContent = "Sync now"; btn.disabled = false; }, 2500);
    }).catch(function (err) {
      if (txt) txt.textContent = "Sync failed: " + (err.message || "");
      btn.textContent = "Sync now"; btn.disabled = false;
    });
  });
}

/* ---- Route resolution ---- */
var HAS_RESOLVED_ONCE = false;
function resolveRoute() {
  var hash = (location.hash || "#/home").replace(/^#/, "").replace(/^\/+/, "");
  var route = hash.split("/")[0] || "home";
  if (!ROUTES[route]) route = "home";
  if (route === "home") {
    renderHome();
  } else {
    renderBankSection(route, ROUTES[route].label);
  }
  HAS_RESOLVED_ONCE = true;
}

/* ---- Sage sidebar ---- */
function appendSageBubble(role, text) {
  var log = document.getElementById("sageLog");
  if (!log) return;
  var empty = log.querySelector(".sage-empty");
  if (empty) empty.remove();
  var row = document.createElement("div");
  row.className = "sage-msg " + (role === "user" ? "user" : "assistant");
  var roleEl = document.createElement("div");
  roleEl.className = "role-tag";
  roleEl.textContent = role === "user" ? "👤 You" : "🦉 Sage · AI Coach";
  var bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.appendChild(roleEl);
  row.appendChild(bubble);
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

var activeSageSessionId = null;

function renderSageSessionsSection() {
  var container = document.getElementById("sessionsListContainer");
  if (!container) return;
  container.innerHTML = '<p class="empty-note">Loading sessions…</p>';
  var newBtn = document.getElementById("sessionsNewBtn");
  if (newBtn && !newBtn._wired) {
    newBtn._wired = true;
    newBtn.addEventListener("click", function () {
      createSageSession(null);
      document.body.classList.remove("sage-collapsed");
      document.body.classList.add("sage-open");
    });
  }
  fetch("/api/chat/sessions", { credentials: "include" })
    .then(function (r) { return r.json(); })
    .then(function (list) {
      if (!Array.isArray(list) || !list.length) {
        container.innerHTML = '<p class="empty-note">No Sage chat sessions yet. Click "+ New Session" above or chat with Sage in the sidebar to start one.</p>';
        return;
      }
      var ul = document.createElement("div");
      ul.className = "sessions-list";
      list.forEach(function (s) {
        var card = document.createElement("div");
        card.className = "session-card";
        var main = document.createElement("div");
        main.className = "session-card-main";
        var title = document.createElement("div");
        title.className = "session-card-title";
        title.textContent = s.title || "Untitled coaching session";
        var meta = document.createElement("div");
        meta.className = "session-card-meta";
        meta.textContent = (s.lastMessageAt ? new Date(s.lastMessageAt).toLocaleString() : "") + " · " + (s.messageCount || 0) + " msgs";
        main.appendChild(title);
        main.appendChild(meta);

        var actions = document.createElement("div");
        actions.className = "session-card-actions";
        var resumeBtn = document.createElement("button");
        resumeBtn.className = "primary";
        resumeBtn.textContent = "Resume in Sage →";
        resumeBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          loadSageSession(s.id);
          document.body.classList.remove("sage-collapsed");
          document.body.classList.add("sage-open");
        });

        var delBtn = document.createElement("button");
        delBtn.className = "ghost";
        delBtn.textContent = "🗑";
        delBtn.title = "Delete session";
        delBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!window.confirm("Delete this session permanently?")) return;
          delBtn.disabled = true;
          fetch("/api/chat/sessions/" + encodeURIComponent(s.id), { method: "DELETE", credentials: "include" })
            .then(function () { renderSageSessionsSection(); })
            .catch(function (err) { alert("Delete failed: " + err.message); delBtn.disabled = false; });
        });

        actions.appendChild(resumeBtn);
        actions.appendChild(delBtn);
        card.appendChild(main);
        card.appendChild(actions);
        card.addEventListener("click", function () {
          loadSageSession(s.id);
          document.body.classList.remove("sage-collapsed");
          document.body.classList.add("sage-open");
        });
        ul.appendChild(card);
      });
      container.innerHTML = "";
      container.appendChild(ul);
    }).catch(function () {
      container.innerHTML = '<p class="empty-note">Sign in to view and save Sage AI coaching sessions.</p>';
    });
}

function createSageSession(title) {
  var t = title || ("Coaching session " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  fetch("/api/chat/sessions", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: t, focus: { kind: "exam_coach" } })
  }).then(function (r) { return r.json(); }).then(function (sess) {
    if (sess && sess.id) {
      activeSageSessionId = sess.id;
      var log = document.getElementById("sageLog");
      if (log) log.innerHTML = '<div class="sage-msg assistant"><div class="role-tag">🦉 Sage · AI Coach</div><div class="bubble">Started a fresh coaching session: <strong>' + escapeHtml(sess.title) + '</strong>. How can I help you ace your certification today?</div></div>';
      var input = document.getElementById("sageInput");
      if (input) input.focus();
    }
  }).catch(function () {
    activeSageSessionId = null;
    var log = document.getElementById("sageLog");
    if (log) {
      log.innerHTML = '<div class="sage-empty"><div class="sage-empty-icon">🦉</div><h4>Hello! I\'m Sage</h4><p>Your dedicated AI coach for the Claude Certified Architect certification. Ask me anything or try a prompt below:</p><div class="sage-prompt-chips"><button type="button" class="sage-chip" data-prompt="What is the core agent loop and its main stages?">🚀 Agent Loop Stages</button><button type="button" class="sage-chip" data-prompt="Explain single-agent vs multi-agent orchestration trade-offs.">⚖️ Single vs Multi-agent</button><button type="button" class="sage-chip" data-prompt="What are MCP tools and resources in Claude architectures?">🔌 MCP Architecture</button><button type="button" class="sage-chip" data-prompt="Give me 3 actionable tips to score 720+ on the Foundations exam.">🎯 Exam Strategy &amp; Scoring</button></div></div>';
      wireSagePromptChips();
    }
  });
}

function loadSageSession(sessionId) {
  if (!sessionId) return;
  activeSageSessionId = sessionId;
  fetch("/api/chat/sessions/" + encodeURIComponent(sessionId), { credentials: "include" })
    .then(function (r) { return r.json(); })
    .then(function (sess) {
      var log = document.getElementById("sageLog");
      if (!log) return;
      log.innerHTML = "";
      var msgs = (sess && sess.messages) || [];
      if (!msgs.length) {
        log.innerHTML = '<div class="sage-msg assistant"><div class="role-tag">🦉 Sage · AI Coach</div><div class="bubble">Session loaded: <strong>' + escapeHtml(sess.title || "Coaching session") + '</strong>. Ask anything to continue!</div></div>';
      } else {
        msgs.filter(function (m) { return m.role !== "system"; }).forEach(function (m) {
          appendSageBubble(m.role === "user" ? "user" : "assistant", m.content);
        });
      }
    });
}

function sendSageMessage() {
  var input = document.getElementById("sageInput");
  if (!input) return;
  var text = (input.value || "").trim();
  if (!text) return;
  /* The provider/model/key are stored server-side for this user; we only
     need to know a configuration exists before sending. */
  if (!aiConfigured()) {
    alert("Configure your AI provider (⚡ AI Provider) first.");
    openSageProviderModal();
    return;
  }
  appendSageBubble("user", text);
  input.value = "";
  var sendBtn = document.getElementById("sageSend");
  if (sendBtn) sendBtn.disabled = true;
  var placeholder = document.createElement("div");
  placeholder.className = "sage-msg assistant";
  var pRole = document.createElement("div"); pRole.className = "role-tag"; pRole.textContent = "🦉 Sage · AI Coach";
  var pBubble = document.createElement("div"); pBubble.className = "bubble";
  pBubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  placeholder.appendChild(pRole); placeholder.appendChild(pBubble);
  var log = document.getElementById("sageLog");
  if (log) { log.appendChild(placeholder); log.scrollTop = log.scrollHeight; }

  function finish() {
    if (sendBtn) sendBtn.disabled = false;
    if (log) log.scrollTop = log.scrollHeight;
  }

  /* Context: if a quiz/mock question is on screen, pass it along. */
  var context = "";
  if (RUNNER && RUNNER.set && RUNNER.set.questions && RUNNER.set.questions[RUNNER.idx]) {
    var q = RUNNER.set.questions[RUNNER.idx];
    context = "The user is currently looking at this exam question:\nStem: " + q.stem +
      "\nOptions: " + (q.options || []).join(" | ");
  }

  /* One request handles the AI call AND persists both messages in the
     session transcript, so sessions survive refresh on both portals. */
  function postMessage(sessionId) {
    return fetch("/api/chat/sessions/" + encodeURIComponent(sessionId) + "/messages", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, context: context })
    }).then(function (res) {
      return res.text().then(function (raw) {
        var data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
        if (!res.ok) {
          var err = new Error((data && data.error) || ("HTTP " + res.status));
          err.needsConfig = !!(data && data.needsConfig);
          throw err;
        }
        return data;
      });
    }).then(function (data) {
      var reply = unwrapJsonResponseField((data && data.reply) || "");
      pBubble.textContent = reply || "Empty response.";
    }).catch(function (err) {
      pBubble.textContent = "Error: " + ((err && err.message) || "Network error");
      if (err && err.needsConfig) openSageProviderModal();
    }).then(finish);
  }

  if (activeSageSessionId) {
    postMessage(activeSageSessionId);
    return;
  }
  fetch("/api/chat/sessions", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: text.slice(0, 60), focus: { kind: "exam_coach" } })
  }).then(function (r) { return r.json(); }).then(function (sess) {
    if (!sess || !sess.id) throw new Error("Could not start a session");
    activeSageSessionId = sess.id;
    return postMessage(sess.id);
  }).catch(function (err) {
    pBubble.textContent = "Error: " + ((err && err.message) || "Could not start a session");
    finish();
  });
}

function wireSagePromptChips() {
  document.querySelectorAll(".sage-chip").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var prompt = btn.getAttribute("data-prompt") || btn.textContent;
      var input = document.getElementById("sageInput");
      if (input) {
        input.value = prompt;
        sendSageMessage();
      }
    });
  });
}

function wireSage() {
  var sendBtn = document.getElementById("sageSend");
  if (sendBtn) sendBtn.addEventListener("click", sendSageMessage);
  var input = document.getElementById("sageInput");
  if (input) input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendSageMessage(); }
  });
  var toggle = document.getElementById("sageToggle");
  if (toggle) toggle.addEventListener("click", function () {
    document.body.classList.toggle("sage-collapsed");
    document.body.classList.toggle("sage-open");
  });
  var collapse = document.getElementById("sageCollapse");
  if (collapse) collapse.addEventListener("click", function () {
    document.body.classList.add("sage-collapsed");
    document.body.classList.remove("sage-open");
  });
  var newBtn = document.getElementById("sageNewBtn");
  if (newBtn) newBtn.addEventListener("click", function () { createSageSession(null); });
  var listBtn = document.getElementById("sageListBtn");
  if (listBtn) listBtn.addEventListener("click", function () { location.hash = "#/sessions"; });
  wireSagePromptChips();
}

/* ---- Account dropdown ---- */
function mountExamDateEditor() {
  if (!window.CCAF_EXAM) return;
  window.CCAF_EXAM.mountEditor({
    host: "examDateEditor",
    onSaved: function () { refreshCountdown(); }
  });
}

function wireAccountMenu() {
  var btn = document.getElementById("accountBtn");
  var dd = document.getElementById("accountDropdown");
  if (!btn || !dd) return;
  mountExamDateEditor();
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    var hidden = dd.classList.contains("hidden");
    dd.classList.toggle("hidden");
    btn.setAttribute("aria-expanded", hidden ? "true" : "false");
    if (hidden && window.CCAF_EXAM) window.CCAF_EXAM.refresh(false);
  });
  document.addEventListener("click", function (e) {
    if (!dd.contains(e.target) && e.target !== btn) dd.classList.add("hidden");
  });
  var signOut = document.getElementById("signOutBtn");
  if (signOut) signOut.addEventListener("click", function () {
    dd.classList.add("hidden");
    if (typeof logoutCurrentProfile === "function") logoutCurrentProfile();
  });
}
function updateAccountMenu() {
  var profile = getActiveProfile ? getActiveProfile() : null;
  var btn = document.getElementById("accountBtn");
  var dd = document.getElementById("accountDropdown");
  var ai = document.getElementById("avatarInitial");
  var an = document.getElementById("avatarName");
  var aun = document.getElementById("accountUserName");
  var auh = document.getElementById("accountUserHandle");
  var da = document.getElementById("dropdownAvatar");
  if (profile && profile.name) {
    if (btn) btn.style.display = "inline-flex";
    var name = profile.name;
    var initial = name.charAt(0).toUpperCase();
    var handle = "@" + ((profile.slug || profile.name) || "user").toLowerCase().replace(/\s+/g, "");
    if (ai) ai.textContent = initial;
    if (da) da.textContent = initial;
    if (an) an.textContent = name;
    if (aun) aun.textContent = name;
    if (auh) auh.textContent = handle;
  } else {
    if (btn) btn.style.display = "none";
    if (dd) dd.classList.add("hidden");
  }
}

/* ---- Boot the new layout ---- */
function initNewLayout() {
  cacheSectionTemplates();
  wireSage();
  wireAccountMenu();
  updateAccountMenu();

  document.querySelectorAll("#leftNav .nav-item").forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      var route = this.getAttribute("data-route");
      if (route) {
        location.hash = "#/" + route;
      }
    });
  });

  var navBurgerBtn = document.getElementById("navBurgerBtn");
  if (navBurgerBtn) {
    navBurgerBtn.addEventListener("click", function () {
      document.body.classList.toggle("nav-collapsed");
    });
  }

  var navClose = document.getElementById("navClose");
  if (navClose) {
    navClose.addEventListener("click", function () {
      document.body.classList.toggle("nav-collapsed");
    });
  }

  var navOpen = document.getElementById("navOpen");
  if (navOpen) {
    navOpen.addEventListener("click", function () {
      document.body.classList.remove("nav-collapsed");
    });
  }

  var brandLink = document.getElementById("brandLink");
  if (brandLink) {
    brandLink.addEventListener("click", function (e) {
      e.preventDefault();
      location.hash = "#/home";
    });
  }

  if (!window.__ccafHashReady) {
    window.__ccafHashReady = true;
    window.addEventListener("hashchange", resolveRoute);
  }

  if (!location.hash) {
    location.hash = "#/home";
  }
  resolveRoute();
}

/* The existing init() (defined earlier in this file) calls all the
   old init functions (buildDomains, refreshProgress, etc.) which
   populate the hidden #sectionBank. After it runs, we wire the
   new layout. */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    init();
    initNewLayout();
  });
} else {
  init();
  initNewLayout();
}
