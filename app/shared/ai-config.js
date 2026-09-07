"use strict";
/* ============================================================
   Claude Certified Architect – Foundations
   Shared AI provider configuration client (both portals)
   ------------------------------------------------------------
   Single source of truth for "which provider / model / API key
   should this signed-in user's AI features use?".

   Design:
     - The configuration lives SERVER-SIDE, per user, in
       data/users/<slug>/ai-config.json. Nothing is cached in
       localStorage, so:
         * it survives refresh / close / reopen,
         * it is identical on Study Hub and Exam Center,
         * a different user signing in on the same browser can
           never inherit or see the previous user's provider,
       and the API key is never sent back to the browser.
     - Model lists are fetched live from the provider (through the
       server) and auto-populate the model dropdown as soon as a
       provider is selected.
     - Every AI feature (Sage, Nyx, course content, quiz and mock
       generation, performance summaries) calls CCAF_AI.chat().

   Public API (window.CCAF_AI):
     init(options)         wire the portal's existing modal + badge
     refresh()             re-read the saved config from the server
     reset()               forget in-memory state (called on sign-out)
     getConfig()           { configured, providerId, providerName, model, ... }
     isConfigured()
     describe()            "OpenAI · gpt-4o" style label
     requireConfigured()   true, or opens the modal and returns false
     openModal() / closeModal()
     onChange(fn)          subscribe to configuration changes
     chat(options)         run a chat completion, resolves to text
     ready                 Promise resolved after the first load
   ============================================================ */

(function () {
  var BROADCAST_NAME = "ccaf_ai_config";
  var REFRESH_THROTTLE_MS = 4000;

  /* Legacy per-browser storage that used to hold provider names and
     API keys. It is removed on load so old keys cannot leak between
     users on a shared browser. */
  var LEGACY_KEY_PATTERNS = [
    /^ccaf_key_/,
    /^ccaf_ai_provider/,
    /^ccaf_ai_model/,
    /^ccaf_sel_provider/,
    /^ccaf_sel_model/,
    /^ccaf_learn_provider/,
    /^ccaf_learn_model/,
    /^ccaf_ai_cfg_v1/,
    /^ccaf_user_[a-z0-9_]+_ccaf_key_/,
    /^ccaf_user_[a-z0-9_]+_ccaf_ai_/,
    /^ccaf_user_[a-z0-9_]+_ccaf_sel_/,
    /^ccaf_user_[a-z0-9_]+_ccaf_learn_/
  ];

  var state = {
    providers: [],
    config: emptyConfig(),
    loaded: false,
    opts: null,
    listeners: [],
    modelRequestToken: 0,
    lastRefreshAt: 0,
    channel: null,
    readyResolve: null
  };

  function emptyConfig() {
    return {
      configured: false,
      providerId: null,
      providerName: null,
      model: null,
      hasApiKey: false,
      updatedAt: null
    };
  }

  function $(id) { return id ? document.getElementById(id) : null; }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function purgeLegacyStorage() {
    try {
      var doomed = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;
        for (var p = 0; p < LEGACY_KEY_PATTERNS.length; p++) {
          if (LEGACY_KEY_PATTERNS[p].test(key)) { doomed.push(key); break; }
        }
      }
      doomed.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    } catch (e) { /* private mode / quota */ }
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
          err.needsConfig = !!(data && data.needsConfig);
          err.payload = data;
          throw err;
        }
        return data;
      });
    });
  }

  function notify() {
    var snapshot = getConfig();
    state.listeners.forEach(function (fn) {
      try { fn(snapshot); } catch (e) {}
    });
    updateBadge();
  }

  function broadcastChange() {
    try {
      if (state.channel) state.channel.postMessage({ type: "changed", at: Date.now() });
    } catch (e) {}
  }

  /* ---------- Loading ---------- */
  function loadProviders() {
    if (state.providers.length) return Promise.resolve(state.providers);
    return api("/api/ai/providers").then(function (data) {
      state.providers = (data && Array.isArray(data.providers)) ? data.providers : [];
      return state.providers;
    }).catch(function () {
      state.providers = [];
      return state.providers;
    });
  }

  function loadConfig() {
    return api("/api/ai/config").then(function (data) {
      state.config = data && typeof data === "object" ? data : emptyConfig();
      state.loaded = true;
      return state.config;
    }).catch(function (err) {
      /* 401 = signed out: treat as "nothing configured". */
      state.config = emptyConfig();
      state.loaded = (err && err.status === 401) ? true : state.loaded;
      return state.config;
    });
  }

  function refresh(force) {
    var now = Date.now();
    if (!force && (now - state.lastRefreshAt) < REFRESH_THROTTLE_MS) {
      return Promise.resolve(getConfig());
    }
    state.lastRefreshAt = now;
    return loadProviders().then(loadConfig).then(function () {
      notify();
      return getConfig();
    });
  }

  /* ---------- Public state ---------- */
  function getConfig() {
    return {
      configured: !!state.config.configured,
      providerId: state.config.providerId || null,
      providerName: state.config.providerName || null,
      model: state.config.model || null,
      hasApiKey: !!state.config.hasApiKey,
      updatedAt: state.config.updatedAt || null
    };
  }

  function isConfigured() { return !!state.config.configured; }

  function describe() {
    if (!state.config.providerName) return "";
    return state.config.providerName + (state.config.model ? " · " + state.config.model : "");
  }

  function providerById(id) {
    for (var i = 0; i < state.providers.length; i++) {
      if (state.providers[i].id === id) return state.providers[i];
    }
    return null;
  }

  /* ---------- Provider badge in the portal chrome ---------- */
  function updateBadge() {
    var o = state.opts;
    if (!o || !o.badge) return;
    var badge = $(o.badge);
    if (!badge) return;
    if (state.config.providerName) {
      var label = escapeHtml(state.config.providerName);
      var model = state.config.model ? escapeHtml(state.config.model) : "";
      badge.innerHTML = "⚡ <strong>" + label + "</strong>" + (model ? " (" + model + ")" : "");
      badge.title = state.config.providerName + (state.config.model ? " (" + state.config.model + ")" : "") +
        (state.config.configured ? "" : " — configuration incomplete");
      return;
    }
    badge.innerHTML = "⚡ Provider: <span style=\"color:var(--warn); font-weight:700;\">Not set</span>";
    badge.title = "Configure AI Provider";
  }

  /* ---------- Modal ---------- */
  function setOption(select, value, label, disabled) {
    var opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (disabled) opt.disabled = true;
    select.appendChild(opt);
    return opt;
  }

  function populateProviderSelect() {
    var o = state.opts;
    var sel = $(o.providerSelect);
    if (!sel) return;
    var previous = sel.value;
    sel.innerHTML = "";
    if (!state.providers.length) {
      setOption(sel, "", "(no providers available)", true);
      return;
    }
    state.providers.forEach(function (p) { setOption(sel, p.id, p.name); });
    var target = state.config.providerId || previous || state.providers[0].id;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === target) { sel.value = target; return; }
    }
    sel.value = state.providers[0].id;
  }

  /* Fetch and render the model list for the selected provider. This is
     what makes the model dropdown auto-populate. `preferred` is selected
     when present; when the saved model is missing from the live list (for
     example a custom id) it is added so the user is never silently
     switched to a different model. */
  function loadModels(providerId, preferred) {
    var o = state.opts;
    var modelSel = $(o.modelSelect);
    if (!modelSel || !providerId) return Promise.resolve([]);
    var token = ++state.modelRequestToken;
    modelSel.innerHTML = "";
    setOption(modelSel, "", "Loading models…", true);
    modelSel.disabled = true;

    var typedKey = "";
    var keyEl = $(o.apiKeyInput);
    if (keyEl && keyEl.value) typedKey = keyEl.value.trim();

    var want = preferred || (state.config.providerId === providerId ? state.config.model : null);

    return api("/api/ai/models", "POST", { providerId: providerId, apiKey: typedKey })
      .then(function (data) {
        if (token !== state.modelRequestToken) return [];
        var models = (data && Array.isArray(data.models)) ? data.models : [];
        modelSel.innerHTML = "";
        modelSel.disabled = false;
        if (data && data.warning) { try { console.warn("Model list:", data.warning); } catch (e) {} }
        if (!models.length && !want) {
          var hint = (data && data.needsApiKey)
            ? "Paste your API key to load models"
            : "No models returned — use Custom model id";
          setOption(modelSel, "", hint, true);
          return models;
        }
        var known = {};
        models.forEach(function (m) { known[m.id] = true; setOption(modelSel, m.id, m.label || m.id); });
        if (want && !known[want]) setOption(modelSel, want, want + " (saved)");
        if (want) {
          for (var i = 0; i < modelSel.options.length; i++) {
            if (modelSel.options[i].value === want) { modelSel.value = want; break; }
          }
        }
        if (!modelSel.value && modelSel.options.length) modelSel.value = modelSel.options[0].value;
        return models;
      })
      .catch(function (err) {
        if (token !== state.modelRequestToken) return [];
        modelSel.innerHTML = "";
        modelSel.disabled = false;
        if (want) {
          setOption(modelSel, want, want + " (saved)");
          modelSel.value = want;
        } else {
          setOption(modelSel, "", "Could not load models", true);
        }
        try { console.warn("Model list failed:", err && err.message); } catch (e) {}
        return [];
      });
  }

  function applyApiKeyPlaceholder(providerId) {
    var o = state.opts;
    var keyEl = $(o.apiKeyInput);
    if (!keyEl) return;
    var provider = providerById(providerId);
    var savedForThisProvider = state.config.hasApiKey && state.config.providerId === providerId;
    if (savedForThisProvider) {
      keyEl.placeholder = "Saved — leave blank to keep the current key";
    } else if (provider && provider.requiresApiKey === false) {
      keyEl.placeholder = "Not required for this provider";
    } else {
      keyEl.placeholder = "sk-...";
    }
  }

  function openModal() {
    var o = state.opts;
    if (!o) return;
    var modal = $(o.modal);
    if (!modal) return;

    var open = function () {
      modal.classList.remove("hidden");
      modal.hidden = false;
      modal.removeAttribute("hidden");
      populateProviderSelect();
      var sel = $(o.providerSelect);
      var providerId = sel ? sel.value : state.config.providerId;
      var overrideEl = $(o.modelOverrideInput);
      var keyEl = $(o.apiKeyInput);
      if (keyEl) keyEl.value = "";
      if (overrideEl) overrideEl.value = "";
      applyApiKeyPlaceholder(providerId);
      loadModels(providerId, state.config.providerId === providerId ? state.config.model : null);
    };

    if (state.loaded) open();
    else refresh(true).then(open);
  }

  function closeModal() {
    var o = state.opts;
    if (!o) return;
    var modal = $(o.modal);
    if (!modal) return;
    modal.classList.add("hidden");
  }

  function saveFromModal() {
    var o = state.opts;
    var sel = $(o.providerSelect);
    var modelSel = $(o.modelSelect);
    var overrideEl = $(o.modelOverrideInput);
    var keyEl = $(o.apiKeyInput);
    var saveBtn = $(o.saveButton);

    var providerId = sel ? sel.value : "";
    if (!providerId) { window.alert("Pick a provider first."); return; }
    var override = (overrideEl && overrideEl.value) ? overrideEl.value.trim() : "";
    var model = override || (modelSel ? modelSel.value : "");
    if (!model) {
      window.alert("Pick a model, or type a model id in \"Custom model id\".");
      return;
    }
    var apiKey = (keyEl && keyEl.value) ? keyEl.value.trim() : "";

    var originalLabel = saveBtn ? saveBtn.textContent : "";
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }

    api("/api/ai/config", "PUT", { providerId: providerId, model: model, apiKey: apiKey })
      .then(function (saved) {
        state.config = saved && typeof saved === "object" ? saved : emptyConfig();
        state.loaded = true;
        if (keyEl) keyEl.value = "";
        if (overrideEl) overrideEl.value = "";
        closeModal();
        notify();
        broadcastChange();
      })
      .catch(function (err) {
        if (err && err.status === 401) {
          window.alert("Please sign in again before saving the AI provider.");
        } else {
          window.alert("Could not save the AI provider: " + ((err && err.message) || "unknown error"));
        }
      })
      .then(function () {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = originalLabel || "Save"; }
      });
  }

  function wireModal() {
    var o = state.opts;
    var sel = $(o.providerSelect);
    if (sel && !sel._ccafWired) {
      sel._ccafWired = true;
      sel.addEventListener("change", function () {
        var overrideEl = $(o.modelOverrideInput);
        if (overrideEl) overrideEl.value = "";
        applyApiKeyPlaceholder(sel.value);
        loadModels(sel.value, null);
      });
    }

    /* Typing a key re-lists models for providers that need it. */
    var keyEl = $(o.apiKeyInput);
    if (keyEl && !keyEl._ccafWired) {
      keyEl._ccafWired = true;
      var debounce = null;
      keyEl.addEventListener("input", function () {
        var providerId = sel ? sel.value : state.config.providerId;
        var provider = providerById(providerId);
        if (!provider || !provider.keyForModels) return;
        if (debounce) window.clearTimeout(debounce);
        debounce = window.setTimeout(function () {
          var modelSel = $(o.modelSelect);
          var keep = modelSel ? modelSel.value : null;
          loadModels(providerId, keep);
        }, 600);
      });
    }

    var saveBtn = $(o.saveButton);
    if (saveBtn && !saveBtn._ccafWired) {
      saveBtn._ccafWired = true;
      saveBtn.addEventListener("click", function (e) { e.preventDefault(); saveFromModal(); });
    }

    var cancelBtn = $(o.cancelButton);
    if (cancelBtn && !cancelBtn._ccafWired) {
      cancelBtn._ccafWired = true;
      cancelBtn.addEventListener("click", function (e) { e.preventDefault(); closeModal(); });
    }

    (o.openButtons || []).forEach(function (id) {
      var btn = $(id);
      if (btn && !btn._ccafWired) {
        btn._ccafWired = true;
        btn.addEventListener("click", function (e) { e.preventDefault(); openModal(); });
      }
    });
  }

  /* ---------- Chat ---------- */
  /* options: { messages, temperature, maxTokens, jsonMode, promptOnMissing } */
  function chat(options) {
    options = options || {};
    var body = {
      messages: options.messages || [],
      temperature: typeof options.temperature === "number" ? options.temperature : 0.7,
      maxTokens: typeof options.maxTokens === "number" ? options.maxTokens : 1200,
      jsonMode: !!options.jsonMode
    };
    return api("/api/ai/chat", "POST", body).then(function (data) {
      /* The saved model may differ from what this tab last saw. */
      if (data && data.providerId && data.providerId !== state.config.providerId) refresh(true);
      return (data && data.reply) || "";
    }).catch(function (err) {
      if (err && err.needsConfig && options.promptOnMissing !== false) {
        refresh(true).then(openModal);
      }
      throw err;
    });
  }

  function requireConfigured() {
    if (isConfigured()) return true;
    openModal();
    return false;
  }

  function reset() {
    state.config = emptyConfig();
    state.loaded = true;
    state.modelRequestToken++;
    purgeLegacyStorage();
    notify();
  }

  function onChange(fn) {
    if (typeof fn === "function") {
      state.listeners.push(fn);
      if (state.loaded) { try { fn(getConfig()); } catch (e) {} }
    }
  }

  /* ---------- Init ---------- */
  var readyPromise = new Promise(function (resolve) { state.readyResolve = resolve; });

  function init(options) {
    options = options || {};
    state.opts = {
      modal: options.modal,
      providerSelect: options.providerSelect,
      modelSelect: options.modelSelect,
      modelOverrideInput: options.modelOverrideInput,
      apiKeyInput: options.apiKeyInput,
      saveButton: options.saveButton,
      cancelButton: options.cancelButton,
      openButtons: options.openButtons || [],
      badge: options.badge
    };

    purgeLegacyStorage();
    wireModal();

    /* Cross-portal / cross-tab sync: any save in one window updates the
       other one immediately; focus and visibility changes re-read the
       server copy so a portal opened later is never stale. */
    try {
      if (typeof BroadcastChannel !== "undefined" && !state.channel) {
        state.channel = new BroadcastChannel(BROADCAST_NAME);
        state.channel.onmessage = function (ev) {
          if (!ev || !ev.data) return;
          if (ev.data.type === "changed") refresh(true);
          if (ev.data.type === "signout") reset();
        };
      }
    } catch (e) {}

    if (!window.__ccafAiVisibilityWired) {
      window.__ccafAiVisibilityWired = true;
      window.addEventListener("focus", function () { refresh(false); });
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") refresh(false);
      });
    }

    return refresh(true).then(function (cfg) {
      if (state.readyResolve) { state.readyResolve(cfg); state.readyResolve = null; }
      return cfg;
    });
  }

  function signalSignOut() {
    reset();
    try {
      if (state.channel) state.channel.postMessage({ type: "signout", at: Date.now() });
    } catch (e) {}
  }

  window.CCAF_AI = {
    init: init,
    refresh: function () { return refresh(true); },
    reset: reset,
    signalSignOut: signalSignOut,
    getConfig: getConfig,
    isConfigured: isConfigured,
    describe: describe,
    requireConfigured: requireConfigured,
    openModal: openModal,
    closeModal: closeModal,
    onChange: onChange,
    chat: chat,
    ready: readyPromise
  };
})();
