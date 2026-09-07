"use strict";
/* ============================================================
   Claude Certified Architect – Foundations
   Shared exam-date client (both portals)
   ------------------------------------------------------------
   Single source of truth for "when is the real certification exam?"
   and everything derived from it: days remaining, current phase,
   and the Phase 1 / Phase 2 boundary.

   Design mirrors /shared/ai-config.js:
     - The date lives SERVER-SIDE per user in
       data/users/<slug>/settings.json, so it survives refresh and
       is identical on Study Hub and Exam Center.
     - GET works while signed out and then yields the built-in
       default, so a fresh visitor sees real numbers, never a dash.
     - Saves broadcast to the other portal/tab, so both heroes
       update without a reload.

   Public API (window.CCAF_EXAM):
     init()                 load once and start cross-tab sync
     refresh(force)         re-read the saved date from the server
     reset()                forget state (call on sign-out)
     get()                  { examDate, source, phase1End, ... }
     getExamDate()          "YYYY-MM-DD"
     getStats()             { days, daysLabel, phase, phaseLabel, ... }
     save(isoDate)          persist (pass null to restore default)
     onChange(fn)           subscribe to changes
     mountEditor(options)   render the profile-menu date editor
     formatLong(iso)        "Sep 30, 2026"
     ready                  Promise resolved after the first load
   ============================================================ */

(function () {
  var BROADCAST_NAME = "ccaf_exam_date";
  var REFRESH_THROTTLE_MS = 4000;
  var DEFAULT_EXAM_DATE = "2026-09-30";
  var DEFAULT_PHASE2_DAYS = 17;
  var MS_PER_DAY = 86400000;

  var state = {
    settings: defaultSettings(),
    loaded: false,
    listeners: [],
    lastRefreshAt: 0,
    channel: null,
    readyResolve: null,
    editors: []
  };

  function defaultSettings() {
    return {
      examDate: DEFAULT_EXAM_DATE,
      source: "default",
      defaultExamDate: DEFAULT_EXAM_DATE,
      phase2LengthDays: DEFAULT_PHASE2_DAYS,
      updatedAt: null,
      signedIn: false
    };
  }

  function $(id) { return id ? document.getElementById(id) : null; }

  /* ---------- Date helpers (all local-midnight, no timezone drift) ---------- */
  function isIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var p = value.split("-");
    var y = Number(p[0]), m = Number(p[1]), d = Number(p[2]);
    if (y < 2020 || y > 2100) return false;
    var probe = new Date(y, m - 1, d);
    return probe.getFullYear() === y && probe.getMonth() === (m - 1) && probe.getDate() === d;
  }

  /* Parse as LOCAL midnight. new Date("2026-09-30") would parse as UTC
     and can land on the previous day west of Greenwich. */
  function parseIso(value) {
    if (!isIsoDate(value)) return null;
    var p = value.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function toIso(date) {
    if (!date || isNaN(date.getTime())) return null;
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return date.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
  }

  function todayLocal() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  function formatLong(iso) {
    var d = parseIso(iso);
    if (!d) return "Not set";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatShort(iso) {
    var d = parseIso(iso);
    if (!d) return "Not set";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  /* ---------- API plumbing ---------- */
  function api(path, method, body) {
    var init = { method: method || "GET", credentials: "include", headers: {} };
    if (body !== undefined && body !== null) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    return fetch(path, init).then(function (res) {
      return res.text().then(function (raw) {
        var data = null;
        if (raw) { try { data = JSON.parse(raw); } catch (e) { data = { error: raw }; } }
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

  function normalize(payload) {
    var next = defaultSettings();
    if (payload && typeof payload === "object") {
      if (isIsoDate(payload.examDate)) next.examDate = payload.examDate;
      if (payload.source === "user" || payload.source === "default") next.source = payload.source;
      if (isIsoDate(payload.defaultExamDate)) next.defaultExamDate = payload.defaultExamDate;
      if (typeof payload.phase2LengthDays === "number" && payload.phase2LengthDays > 0) {
        next.phase2LengthDays = Math.floor(payload.phase2LengthDays);
      }
      next.updatedAt = payload.updatedAt || null;
      next.signedIn = !!payload.signedIn;
    }
    return next;
  }

  /* ---------- Derived values ---------- */
  function get() {
    var examIso = state.settings.examDate;
    var exam = parseIso(examIso) || parseIso(DEFAULT_EXAM_DATE);
    var phase1End = addDays(exam, -state.settings.phase2LengthDays);
    var phase2Start = addDays(phase1End, 1);
    return {
      examDate: examIso,
      examDateLong: formatLong(examIso),
      source: state.settings.source,
      isCustom: state.settings.source === "user",
      defaultExamDate: state.settings.defaultExamDate,
      phase2LengthDays: state.settings.phase2LengthDays,
      phase1EndDate: toIso(phase1End),
      phase2StartDate: toIso(phase2Start),
      updatedAt: state.settings.updatedAt,
      signedIn: state.settings.signedIn,
      loaded: state.loaded
    };
  }

  function getExamDate() { return state.settings.examDate; }

  /* Everything the hero cards need, already formatted. */
  function getStats() {
    var info = get();
    var exam = parseIso(info.examDate);
    var today = todayLocal();
    var days = Math.max(0, Math.round((exam - today) / MS_PER_DAY));
    var isPast = exam < today;

    var phase1End = parseIso(info.phase1EndDate);
    var phase2Start = parseIso(info.phase2StartDate);

    var phase, phaseLabel, phaseDetail;
    if (isPast) {
      phase = "Done";
      phaseLabel = "Exam date passed";
      phaseDetail = "Exam date has passed — set a new date";
    } else if (today <= phase1End) {
      phase = "Phase 1";
      phaseLabel = "Foundations Learning";
      phaseDetail = "Learning (until " + formatShort(info.phase1EndDate) + ")";
    } else {
      phase = "Phase 2";
      phaseLabel = "Timed Mock Drilling";
      phaseDetail = "Mock tests (from " + formatShort(info.phase2StartDate) + ")";
    }

    /* Countdown bar: fills as the exam approaches, capped so a date far
       in the future still shows a visible sliver. */
    var progressPct = days >= 100 ? 5 : Math.min(100, Math.max(5, 100 - days));

    return {
      days: days,
      daysLabel: isPast ? "Passed" : (days === 0 ? "Today" : String(days)),
      isPast: isPast,
      isToday: !isPast && days === 0,
      phase: phase,
      phaseLabel: phaseLabel,
      phaseDetail: phaseDetail,
      progressPct: progressPct,
      examDate: info.examDate,
      examDateLong: info.examDateLong,
      phase1EndDate: info.phase1EndDate,
      phase2StartDate: info.phase2StartDate,
      isCustom: info.isCustom
    };
  }

  /* ---------- Load / save ---------- */
  function notify() {
    var snapshot = get();
    state.listeners.forEach(function (fn) {
      try { fn(snapshot); } catch (e) {}
    });
    state.editors.forEach(function (editor) {
      try { editor.sync(); } catch (e) {}
    });
  }

  function refresh(force) {
    var now = Date.now();
    if (!force && (now - state.lastRefreshAt) < REFRESH_THROTTLE_MS) {
      return Promise.resolve(get());
    }
    state.lastRefreshAt = now;
    return api("/api/settings").then(function (data) {
      state.settings = normalize(data);
      state.loaded = true;
      notify();
      return get();
    }).catch(function () {
      /* Server unreachable: keep the built-in default so the cards
         still show a real number. */
      state.loaded = true;
      notify();
      return get();
    });
  }

  function save(isoDate) {
    var payload = (isoDate === null || isoDate === "" || isoDate === undefined)
      ? { examDate: null }
      : { examDate: String(isoDate) };
    if (payload.examDate && !isIsoDate(payload.examDate)) {
      return Promise.reject(new Error("Pick a valid date."));
    }
    return api("/api/settings", "PUT", payload).then(function (data) {
      state.settings = normalize(data);
      state.loaded = true;
      notify();
      broadcastChange();
      return get();
    });
  }

  function broadcastChange() {
    try {
      if (state.channel) state.channel.postMessage({ type: "changed", at: Date.now() });
    } catch (e) {}
  }

  function reset() {
    state.settings = defaultSettings();
    state.loaded = true;
    state.lastRefreshAt = 0;
    notify();
  }

  function onChange(fn) {
    if (typeof fn !== "function") return;
    state.listeners.push(fn);
    if (state.loaded) { try { fn(get()); } catch (e) {} }
  }

  /* ============================================================
     Profile-menu editor
     ------------------------------------------------------------
     Renders into a host element (a row inside the account dropdown).
     Each portal supplies its own class prefix so it inherits that
     portal's palette; the markup is identical.
     ============================================================ */
  function mountEditor(options) {
    options = options || {};
    var host = typeof options.host === "string" ? $(options.host) : options.host;
    if (!host) return null;
    if (host._ccafExamEditor) {
      host._ccafExamEditor.sync();
      return host._ccafExamEditor;
    }

    host.innerHTML = "";
    host.classList.add("exam-date-editor");

    var summary = document.createElement("button");
    summary.type = "button";
    summary.className = "exam-date-summary";
    summary.setAttribute("aria-expanded", "false");

    var summaryLabel = document.createElement("span");
    summaryLabel.className = "exam-date-label";
    summaryLabel.textContent = "Exam Date";

    var summaryValue = document.createElement("span");
    summaryValue.className = "exam-date-value";

    var summaryCaret = document.createElement("span");
    summaryCaret.className = "exam-date-caret";
    summaryCaret.textContent = "✎";

    summary.appendChild(summaryLabel);
    summary.appendChild(summaryValue);
    summary.appendChild(summaryCaret);

    var panel = document.createElement("div");
    panel.className = "exam-date-panel";
    panel.hidden = true;

    var hint = document.createElement("div");
    hint.className = "exam-date-hint";
    hint.textContent = "Set the day you sit the real certification exam. Both portals count down to it.";

    var input = document.createElement("input");
    input.type = "date";
    input.className = "exam-date-input";
    input.min = "2020-01-01";
    input.max = "2100-12-31";
    input.setAttribute("aria-label", "Certification exam date");

    var row = document.createElement("div");
    row.className = "exam-date-actions";

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "exam-date-save";
    saveBtn.textContent = "Save";

    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "exam-date-reset";
    resetBtn.textContent = "Reset";
    resetBtn.title = "Restore the default exam date";

    row.appendChild(saveBtn);
    row.appendChild(resetBtn);

    var status = document.createElement("div");
    status.className = "exam-date-status";

    panel.appendChild(hint);
    panel.appendChild(input);
    panel.appendChild(row);
    panel.appendChild(status);

    host.appendChild(summary);
    host.appendChild(panel);

    function setStatus(text, kind) {
      status.textContent = text || "";
      status.className = "exam-date-status" + (kind ? " " + kind : "");
    }

    function sync() {
      var info = get();
      var stats = getStats();
      summaryValue.textContent = info.examDateLong;
      input.value = info.examDate || "";
      resetBtn.hidden = !info.isCustom;
      if (!panel.hidden && !status.textContent) {
        setStatus(stats.daysLabel === "Passed"
          ? "That date has passed."
          : stats.days + " day" + (stats.days === 1 ? "" : "s") + " to go · " + stats.phase, "");
      }
    }

    function open() {
      panel.hidden = false;
      summary.setAttribute("aria-expanded", "true");
      setStatus("", "");
      sync();
      try { input.focus(); } catch (e) {}
    }

    function close() {
      panel.hidden = true;
      summary.setAttribute("aria-expanded", "false");
      setStatus("", "");
    }

    summary.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (panel.hidden) open(); else close();
    });

    /* Keep clicks inside the panel from closing the account dropdown. */
    panel.addEventListener("click", function (e) { e.stopPropagation(); });

    function commit(value) {
      saveBtn.disabled = true;
      resetBtn.disabled = true;
      setStatus("Saving…", "");
      save(value).then(function () {
        var stats = getStats();
        /* Stay open so the confirmation is actually readable; the
           collapsed summary already shows the new date. */
        setStatus(value === null
          ? "Restored the default date · " + stats.examDateLong
          : "Saved · " + (stats.isPast
              ? "that date has passed"
              : (stats.isToday ? "the exam is today" : stats.days + " day" + (stats.days === 1 ? "" : "s") + " to go")), "ok");
        if (typeof options.onSaved === "function") {
          try { options.onSaved(get()); } catch (e) {}
        }
      }).catch(function (err) {
        var msg = (err && err.message) || "Could not save.";
        if (err && err.status === 401) msg = "Sign in to save your exam date.";
        setStatus(msg, "err");
      }).then(function () {
        saveBtn.disabled = false;
        resetBtn.disabled = false;
      });
    }

    saveBtn.addEventListener("click", function (e) {
      e.preventDefault();
      var value = (input.value || "").trim();
      if (!isIsoDate(value)) { setStatus("Pick a valid date.", "err"); return; }
      commit(value);
    });

    resetBtn.addEventListener("click", function (e) {
      e.preventDefault();
      commit(null);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); saveBtn.click(); }
      if (e.key === "Escape") { e.preventDefault(); close(); }
    });

    var editor = { sync: sync, open: open, close: close, host: host };
    host._ccafExamEditor = editor;
    state.editors.push(editor);
    sync();
    return editor;
  }

  /* ---------- Init ---------- */
  var readyPromise = new Promise(function (resolve) { state.readyResolve = resolve; });

  function init() {
    try {
      if (typeof BroadcastChannel !== "undefined" && !state.channel) {
        state.channel = new BroadcastChannel(BROADCAST_NAME);
        state.channel.onmessage = function (ev) {
          if (!ev || !ev.data) return;
          if (ev.data.type === "changed") refresh(true);
        };
      }
    } catch (e) {}

    if (!window.__ccafExamVisibilityWired) {
      window.__ccafExamVisibilityWired = true;
      window.addEventListener("focus", function () { refresh(false); });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") refresh(false);
      });
    }

    return refresh(true).then(function (info) {
      if (state.readyResolve) { state.readyResolve(info); state.readyResolve = null; }
      return info;
    });
  }

  window.CCAF_EXAM = {
    init: init,
    refresh: function (force) { return refresh(force !== false); },
    reset: reset,
    get: get,
    getExamDate: getExamDate,
    getStats: getStats,
    save: save,
    onChange: onChange,
    mountEditor: mountEditor,
    isIsoDate: isIsoDate,
    parseIso: parseIso,
    formatLong: formatLong,
    formatShort: formatShort,
    ready: readyPromise
  };
})();
