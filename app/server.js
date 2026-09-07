"use strict";
/* ============================================================
   Claude Certified Architect – Foundations · Local Server
   Self-contained Node.js server using ONLY built-in modules.
   No npm dependencies.

     - Serves the Study Hub portal at "/" (root).
     - Serves the Exam Center portal at "/exam-center/".
       (Also aliases /study/ and /learn/ -> Study Hub).
     - Exposes a JSON API under /api (CORS enabled) shared by both portals.

   Keep this window open; close it to stop the server.
   ============================================================ */

var http = require("http");
var https = require("https");
var fs   = require("fs");
var path = require("path");
var url  = require("url");
var crypto = require("crypto");

/* ---------- Paths ---------- */
var PROJECT_ROOT    = path.join(__dirname, "..");                              // project root
var EXAM_CENTER_DIR = path.join(__dirname, "portals", "exam-center");           // app/portals/exam-center/
var STUDY_HUB_DIR   = path.join(__dirname, "portals", "study-hub");             // app/portals/study-hub/
var DATA_ROOT       = path.join(PROJECT_ROOT, "data");                         // data/
var SHARED_DIR      = path.join(__dirname, "shared");                          // app/shared/ (cross-portal client JS)
var GENERATED_DIR   = path.join(DATA_ROOT, "generated");                       // data/generated/
var SCORES_FILE     = path.join(DATA_ROOT, "scores.json");                     // data/scores.json
var PROGRESS_TRACKER_FILE = path.join(PROJECT_ROOT, "content", "context", "Progress_Tracker.md");
var LABS_FILE       = path.join(PROJECT_ROOT, "content", "labs", "Hands_On_Labs.md");
var SYLLABUS_FILE   = path.join(DATA_ROOT, "syllabus.json");
var ASSETS_DIR      = path.join(PROJECT_ROOT, "assets");                       // assets/ (brand, certs, domains, hero)

/* Ensure base directories exist at startup. */
try { fs.mkdirSync(DATA_ROOT, { recursive: true }); } catch (e) {}
try { fs.mkdirSync(path.join(DATA_ROOT, "users"), { recursive: true }); } catch (e) {}

/* ---------- Content types ---------- */
var CONTENT_TYPES = {
  ".html":  "text/html; charset=utf-8",
  ".js":    "application/javascript; charset=utf-8",
  ".mjs":   "application/javascript; charset=utf-8",
  ".css":   "text/css; charset=utf-8",
  ".json":  "application/json; charset=utf-8",
  ".svg":   "image/svg+xml",
  ".png":   "image/png",
  ".jpg":   "image/jpeg",
  ".jpeg":  "image/jpeg",
  ".gif":   "image/gif",
  ".ico":   "image/x-icon",
  ".webp":  "image/webp",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
  ".ttf":   "font/ttf",
  ".txt":   "text/plain; charset=utf-8",
  ".map":   "application/json; charset=utf-8"
};

function contentTypeFor(filePath) {
  var ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

/* ---------- JSON response helpers (CORS always on) ---------- */
function sendJSON(res, statusCode, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function sendText(res, statusCode, text, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType || "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(text);
}

/* Read the raw JSON body of a request, capped to a sane size. */
function readBody(req, cb) {
  var chunks = [];
  var size = 0;
  var LIMIT = 5 * 1024 * 1024; // 5 MB
  var aborted = false;
  req.on("data", function (chunk) {
    if (aborted) return;
    size += chunk.length;
    if (size > LIMIT) {
      aborted = true;
      cb(new Error("Request body too large"));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", function () {
    if (aborted) return;
    var raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) { cb(null, {}); return; }
    try {
      cb(null, JSON.parse(raw));
    } catch (e) {
      cb(new Error("Invalid JSON body"));
    }
  });
  req.on("error", function (e) { if (!aborted) cb(e); });
}

/* ============================================================
   AI provider catalog (static) + per-user AI configuration
   ------------------------------------------------------------
   The catalog lives in app/config/ai_providers.js and holds NO
   secrets. Each user's chosen provider/model/API key is stored
   server-side in data/users/<slug>/ai-config.json so it survives
   refreshes, is shared by both portals, and is never visible to a
   different user signed in on the same browser. The API key is
   never returned to the client.
   ============================================================ */

var AI_CATALOG = (function () {
  try {
    var mod = require("./config/ai_providers.js");
    return {
      providers: Array.isArray(mod.providers) ? mod.providers : [],
      aliases: (mod.aliases && typeof mod.aliases === "object") ? mod.aliases : {}
    };
  } catch (e) {
    console.error("Failed to load AI provider catalog:", e && e.message);
    return { providers: [], aliases: {} };
  }
})();

var AI_CONFIG_FILE = "ai-config.json";

/* Public (safe) view of the catalog for the browser: no keys involved. */
function publicProviderCatalog() {
  return AI_CATALOG.providers.map(function (p) {
    return {
      id: p.id,
      name: p.name,
      style: p.style,
      baseUrl: p.baseUrl,
      requiresApiKey: p.requiresApiKey !== false,
      keyForModels: !!p.keyForModels,
      canListModels: !!p.modelsPath
    };
  });
}

/* Resolve a provider by id, or by a legacy display name. */
function findProvider(idOrName) {
  var needle = String(idOrName || "").trim();
  if (!needle) return null;
  for (var i = 0; i < AI_CATALOG.providers.length; i++) {
    if (AI_CATALOG.providers[i].id === needle) return AI_CATALOG.providers[i];
  }
  var aliasId = AI_CATALOG.aliases[needle];
  if (aliasId) {
    for (var j = 0; j < AI_CATALOG.providers.length; j++) {
      if (AI_CATALOG.providers[j].id === aliasId) return AI_CATALOG.providers[j];
    }
  }
  var lower = needle.toLowerCase();
  for (var k = 0; k < AI_CATALOG.providers.length; k++) {
    if (String(AI_CATALOG.providers[k].name || "").toLowerCase() === lower) return AI_CATALOG.providers[k];
  }
  return null;
}

/* Raw stored config for a user (may include the apiKey). Internal use. */
function readUserAiConfig(slug) {
  var cfg = readUser(slug, AI_CONFIG_FILE, null);
  if (!cfg || typeof cfg !== "object") return null;
  var provider = findProvider(cfg.providerId || cfg.provider);
  if (!provider) return null;
  var model = String(cfg.model || "").trim();
  if (!model) return null;
  return {
    providerId: provider.id,
    providerName: provider.name,
    model: model,
    apiKey: typeof cfg.apiKey === "string" ? cfg.apiKey : "",
    updatedAt: cfg.updatedAt || null
  };
}

/* Client-safe view: reports whether a key is on file, never the key. */
function publicUserAiConfig(slug) {
  var cfg = readUserAiConfig(slug);
  if (!cfg) return { configured: false, providerId: null, providerName: null, model: null, hasApiKey: false, updatedAt: null };
  var provider = findProvider(cfg.providerId);
  var needsKey = !provider || provider.requiresApiKey !== false;
  return {
    configured: !!(cfg.model && (!needsKey || cfg.apiKey)),
    providerId: cfg.providerId,
    providerName: cfg.providerName,
    model: cfg.model,
    hasApiKey: !!cfg.apiKey,
    updatedAt: cfg.updatedAt
  };
}

function writeUserAiConfig(slug, cfg) {
  return writeUser(slug, AI_CONFIG_FILE, cfg);
}

function clearUserAiConfig(slug) {
  try {
    var file = path.join(userDir(slug), AI_CONFIG_FILE);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return true;
  } catch (e) { return false; }
}

/* The effective config used for an outbound call: the user's stored
   config, optionally with a one-off provider/model/key override that a
   caller supplied explicitly in the request body. */
function resolveAiConfig(slug, override) {
  var stored = readUserAiConfig(slug);
  var o = override && typeof override === "object" ? override : {};
  var provider = findProvider(o.providerId || o.provider) || (stored ? findProvider(stored.providerId) : null);
  if (!provider) return { error: "No AI provider configured. Open the AI Provider window and save a provider, model, and API key." };
  var sameProvider = stored && stored.providerId === provider.id;
  var model = String(o.model || (sameProvider ? stored.model : "") || "").trim();
  if (!model) return { error: "No model selected for " + provider.name + ". Open the AI Provider window and pick a model." };
  var apiKey = String(o.apiKey || (sameProvider ? stored.apiKey : "") || "").trim();
  if (provider.requiresApiKey !== false && !apiKey) {
    return { error: "No API key saved for " + provider.name + ". Open the AI Provider window and paste your key." };
  }
  return { provider: provider, model: model, apiKey: apiKey };
}

/* ============================================================
   Sandbox evaluators (used only for local, trusted files)
   ============================================================ */

/* Evaluate a generated question-set file inside a window sandbox that
   provides a fake registerQuestionSet, capturing its metadata. */
function inspectQuestionSet(fileText) {
  var captured = null;
  var sandbox = {
    registerQuestionSet: function (set) { captured = set || {}; }
  };
  /* eslint-disable-next-line no-new-func */
  new Function("window", "with (window) { " + fileText + " }")(sandbox);
  return captured;
}

/* Ensure the generated data directory exists. */
function ensureGeneratedDir() {
  try {
    if (!fs.existsSync(GENERATED_DIR)) {
      fs.mkdirSync(GENERATED_DIR, { recursive: true });
    }
  } catch (e) { /* ignore; handlers report errors */ }
}

/* ============================================================
   NEW: Shared utilities for the Learn portal
   ============================================================ */

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

function userDir(slug) {
  return path.join(DATA_ROOT, "users", slug);
}

function readUser(slug, file, fallback) {
  try {
    var filePath = path.join(userDir(slug), file);
    if (!fs.existsSync(filePath)) return fallback;
    var raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (e) { return fallback; }
}

function writeUser(slug, file, obj) {
  try {
    var dir = userDir(slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    var filePath = path.join(dir, file);
    var tmp = filePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, filePath);
    return true;
  } catch (e) { return false; }
}

/* Password hashing: scrypt via Node's built-in crypto (no npm deps).
   Format: scrypt$N$r$p$saltHex$hashHex */
function hashPassword(pw) {
  var salt = crypto.randomBytes(16);
  var N = 16384, r = 8, p = 1, keylen = 64;
  var hash = crypto.scryptSync(String(pw), salt, keylen, { N: N, r: r, p: p });
  return "scrypt$" + N + "$" + r + "$" + p + "$" + salt.toString("hex") + "$" + hash.toString("hex");
}

function verifyPassword(pw, stored) {
  if (!stored) return false;
  try {
    if (typeof stored === "string" && stored.indexOf("scrypt$") === 0) {
      var parts = stored.split("$");
      if (parts.length !== 6) return false;
      var N = parseInt(parts[1], 10);
      var r = parseInt(parts[2], 10);
      var p = parseInt(parts[3], 10);
      var salt = Buffer.from(parts[4], "hex");
      var expected = Buffer.from(parts[5], "hex");
      var actual = crypto.scryptSync(String(pw), salt, expected.length, { N: N, r: r, p: p });
      return crypto.timingSafeEqual(expected, actual);
    }
    /* Legacy plaintext support — constant-time compare. */
    var a = Buffer.from(String(pw));
    var b = Buffer.from(String(stored));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) { return false; }
}

/* Parse a cookie header into a map. */
function parseCookies(req) {
  var map = {};
  var header = req.headers && req.headers.cookie;
  if (!header) return map;
  header.split(";").forEach(function (pair) {
    var idx = pair.indexOf("=");
    if (idx < 0) return;
    var k = pair.slice(0, idx).trim();
    var v = pair.slice(idx + 1).trim();
    if (k) map[k] = decodeURIComponent(v);
  });
  return map;
}

function requireUser(req, res) {
  var cookies = parseCookies(req);
  var slug = cookies.ccaf_session || "";
  if (slug && /^[a-z0-9_]{1,40}$/.test(slug)) return slug;
  sendJSON(res, 401, { error: "Not signed in" });
  return null;
}

/* Minimal, safe markdown -> HTML. No raw HTML allowed; escapes by default. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
  });
}
function mdInline(s) {
  s = s.replace(/`([^`]+)`/g, function (_, c) { return "<code>" + escapeHtml(c) + "</code>"; });
  s = s.replace(/\*\*([^*]+)\*\*/g, function (_, c) { return "<strong>" + escapeHtml(c) + "</strong>"; });
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, function (_, p, c) { return p + "<em>" + escapeHtml(c) + "</em>"; });
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, t, u) {
    var safe = /^(https?:\/\/|\.\.?\/|#)/i.test(u) ? u : "#";
    return '<a href="' + escapeHtml(safe) + '" target="_blank" rel="noopener">' + escapeHtml(t) + '</a>';
  });
  return s;
}
/* Parse the body of a ```check fenced block into Q/A pairs.
   Accepts answers that wrap onto continuation lines (any non-Q-line
   that follows an A-line until the next Q or end). */
function parseCheckQA(body) {
  var pairs = [];
  var current = null;
  body.split(/\r?\n/).forEach(function (line) {
    var qm = line.match(/^Q\s*(\d+)\s*[:.\)]\s*(.*)$/i);
    var am = line.match(/^A\s*(\d+)\s*[:.\)]\s*(.*)$/i);
    if (qm) {
      if (current) pairs.push(current);
      current = { q: qm[2].trim(), a: "" };
    } else if (am) {
      if (!current) current = { q: "", a: "" };
      current.a = am[2].trim();
    } else if (current && line.trim()) {
      current.a += (current.a ? " " : "") + line.trim();
    }
  });
  if (current) pairs.push(current);
  return pairs.filter(function (p) { return p.q || p.a; });
}

function buildCheckBlockHtml(pairs) {
  if (!pairs || !pairs.length) return "";
  var cards = pairs.map(function (p) {
    return '<div class="check-card" data-check-card>' +
      '<div class="check-q">Q: ' + escapeHtml(p.q) + '</div>' +
      '<button type="button" class="check-toggle" data-check-toggle aria-expanded="false">Show answer</button>' +
      '<div class="check-answer" hidden>A: ' + escapeHtml(p.a) + '</div>' +
      '</div>';
  }).join("");
  return '<section class="check-block"><h3>Check yourself</h3>' + cards + '</section>';
}

function readMarkdownToHtml(md) {
  var lines = String(md || "").split(/\r?\n/);
  var html = [];
  var inCode = false, codeBuf = [], codeLang = "";
  var inCheck = false, checkBuf = [];
  var inList = false, listType = null;
  function closeList() { if (inList) { html.push("</" + listType + ">"); inList = false; listType = null; } }
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var fenceOpen = line.match(/^```\s*([a-zA-Z0-9_-]*)\s*$/);
    if (fenceOpen) {
      var lang = (fenceOpen[1] || "").toLowerCase();
      if (inCheck) {
        html.push(buildCheckBlockHtml(parseCheckQA(checkBuf.join("\n"))));
        checkBuf = []; inCheck = false;
        continue;
      }
      if (inCode) {
        html.push("<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>");
        codeBuf = []; inCode = false; codeLang = "";
        continue;
      }
      if (lang === "check") {
        closeList();
        inCheck = true;
        checkBuf = [];
      } else {
        closeList();
        inCode = true;
        codeLang = lang;
      }
      continue;
    }
    if (inCheck) { checkBuf.push(line); continue; }
    if (inCode) { codeBuf.push(line); continue; }
    if (!line.trim()) { closeList(); html.push(""); continue; }
    var h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList();
      var level = h[1].length;
      var text = h[2].trim();
      var id = slugify(text);
      html.push("<h" + level + " id=\"" + id + "\">" + mdInline(text) + "</h" + level + ">");
      continue;
    }
    var taskOpen = line.match(/^(\s*)[-*]\s+\[ \]\s+(.*)$/);
    var taskDone = line.match(/^(\s*)[-*]\s+\[x\]\s+(.*)$/i);
    if (taskOpen || taskDone) {
      if (!inList || listType !== "ul") { closeList(); html.push("<ul class=\"task-list\">"); inList = true; listType = "ul"; }
      var done = !!taskDone;
      var content = (taskOpen ? taskOpen[2] : taskDone[2]);
      html.push("<li><label><input type=\"checkbox\" disabled" + (done ? " checked" : "") + "> " + mdInline(content) + "</label></li>");
      continue;
    }
    var ul = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (ul) {
      if (!inList || listType !== "ul") { closeList(); html.push("<ul>"); inList = true; listType = "ul"; }
      html.push("<li>" + mdInline(ul[2]) + "</li>");
      continue;
    }
    var ol = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (ol) {
      if (!inList || listType !== "ol") { closeList(); html.push("<ol>"); inList = true; listType = "ol"; }
      html.push("<li>" + mdInline(ol[2]) + "</li>");
      continue;
    }
    var bq = line.match(/^>\s?(.*)$/);
    if (bq) { closeList(); html.push("<blockquote>" + mdInline(bq[1]) + "</blockquote>"); continue; }
    closeList();
    html.push("<p>" + mdInline(line) + "</p>");
  }
  closeList();
  if (inCode) html.push("<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>");
  if (inCheck) html.push(buildCheckBlockHtml(parseCheckQA(checkBuf.join("\n"))));
  return html.join("\n");
}

/* ============================================================
   NEW: Syllabus (hardcoded fallback + live fetch + cache)
   ============================================================ */

var HARDCODED_SYLLABUS = [
  { id: 1, name: "Agentic Architecture & Orchestration", weight: 27, modules: [
    { id: "1-1-agentic-loops", title: "Agentic Loops" },
    { id: "1-2-orchestration-patterns", title: "Multi-Agent Orchestration" },
    { id: "1-3-subagent-invocation-context", title: "Subagent Invocation and Context Passing" },
    { id: "1-4-workflow-enforcement-handoff", title: "Workflow Enforcement and Handoff" },
    { id: "1-5-agent-sdk-hooks", title: "Agent SDK Hooks" },
    { id: "1-6-task-decomposition", title: "Task Decomposition Strategies" },
    { id: "1-7-session-state-resumption", title: "Session State and Resumption" }
  ]},
  { id: 2, name: "Tool Design & MCP Integration", weight: 18, modules: [
    { id: "2-1-tool-schema-design", title: "Tool Interface Design" },
    { id: "2-2-structured-error-responses", title: "Structured Error Responses" },
    { id: "2-3-tool-distribution-choice", title: "Tool Distribution & Tool Choice" },
    { id: "2-4-mcp-server-integration", title: "MCP Server Integration" },
    { id: "2-5-built-in-tools", title: "Built-in Tools" }
  ]},
  { id: 3, name: "Claude Code Configuration & Workflows", weight: 20, modules: [
    { id: "3-1-claude-md-hierarchy", title: "CLAUDE.md Hierarchy, Scoping, and Modular Organisation" },
    { id: "3-2-slash-commands-skills", title: "Custom Slash Commands and Skills" },
    { id: "3-3-path-specific-rules", title: "Path-Specific Rules for Conditional Convention Loading" },
    { id: "3-4-plan-mode-execution", title: "Plan Mode vs Direct Execution" },
    { id: "3-5-iterative-refinement", title: "Iterative Refinement Techniques" },
    { id: "3-6-cicd-integration", title: "CI/CD Integration" }
  ]},
  { id: 4, name: "Prompt Engineering & Structured Output", weight: 20, modules: [
    { id: "4-1-system-prompts", title: "System Prompts with Explicit Criteria" },
    { id: "4-2-few-shot-prompting", title: "Few-Shot Prompting" },
    { id: "4-3-structured-output", title: "Structured Output with Tool Use" },
    { id: "4-4-validation-retry-loops", title: "Validation, Retry, and Feedback Loops" },
    { id: "4-5-batch-processing", title: "Batch Processing Strategies" },
    { id: "4-6-multi-pass-review", title: "Multi-Instance and Multi-Pass Review" }
  ]},
  { id: 5, name: "Context Management & Reliability", weight: 15, modules: [
    { id: "5-1-context-window-management", title: "Context Window Management" },
    { id: "5-2-escalation-ambiguity", title: "Escalation & Ambiguity Resolution" },
    { id: "5-3-error-propagation", title: "Error Propagation in Multi-Agent Systems" },
    { id: "5-4-codebase-exploration", title: "Codebase Exploration & Context Degradation" },
    { id: "5-5-human-review-calibration", title: "Human Review & Confidence Calibration" },
    { id: "5-6-information-provenance", title: "Information Provenance & Multi-Source Synthesis" }
  ]}
];

/* Live-fetch: best-effort GET to a URL returning JSON-friendly string data. */
function fetchRemoteText(targetUrl, timeoutMs) {
  return new Promise(function (resolve, reject) {
    var parsed = url.parse(targetUrl);
    var client = parsed.protocol === "https:" ? https : http;
    var req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.path,
      method: "GET",
      headers: { "User-Agent": "CCA-Learn/1.0" },
      timeout: timeoutMs || 8000
    }, function (r) {
      var chunks = [];
      r.on("data", function (c) { chunks.push(c); });
      r.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    });
    req.on("error", reject);
    req.on("timeout", function () { req.destroy(new Error("timeout")); });
    req.end();
  });
}

/* Try to refresh the cached syllabus from claudecertificationguide.com.
   On any failure, keep the existing cache (or fallback). */
function refreshSyllabusFromNetwork() {
  var sources = [
    "https://claudecertificationguide.com/learn",
    "https://claudecertificationguide.com/learn/1-agentic-architecture",
    "https://claudecertificationguide.com/learn/2-tool-design-mcp",
    "https://claudecertificationguide.com/learn/3-claude-code-config",
    "https://claudecertificationguide.com/learn/4-prompt-engineering",
    "https://claudecertificationguide.com/learn/5-context-management"
  ];
  return Promise.all(sources.map(function (u) {
    return fetchRemoteText(u, 6000).catch(function () { return ""; });
  })).then(function (results) {
    /* Heuristic parse: extract module links and titles from the HTML. */
    var titlesBySlug = {};
    var slugToTitle = {};
    var domainRe = /\/learn\/(\d-[a-z-]+)\/(\d-\d-[a-z0-9-]+)/g;
    var titleRe = /<h2[^>]*>([^<]+)<\/h2>/g;
    for (var i = 0; i < results.length; i++) {
      var html = results[i] || "";
      var m;
      while ((m = domainRe.exec(html)) !== null) {
        var domSlug = m[1], modSlug = m[2];
        if (!slugToTitle[modSlug]) slugToTitle[modSlug] = modSlug.replace(/^\d-\d-/, "").replace(/-/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      }
      while ((m = titleRe.exec(html)) !== null) {
        /* First <h2> on a domain page is the module title if it looks like one. */
        var t = m[1].trim();
        if (t.length > 4 && t.length < 120 && /[A-Z]/.test(t[0])) {
          var s = slugify(t);
          if (s) slugToTitle[s] = t;
        }
      }
    }
    if (Object.keys(slugToTitle).length < 25) return null; /* sanity check */
    var out = [];
    HARDCODED_SYLLABUS.forEach(function (dom) {
      var newDom = { id: dom.id, name: dom.name, weight: dom.weight, modules: [] };
      dom.modules.forEach(function (mod) {
        var title = slugToTitle[mod.id] || mod.title;
        newDom.modules.push({ id: mod.id, title: title });
      });
      out.push(newDom);
    });
    return out;
  }).catch(function () { return null; });
}

function loadSyllabus() {
  /* Cache file: { source: "live" | "fallback", fetchedAt: ISO, syllabus: [...] } */
  var cache = null;
  try {
    if (fs.existsSync(SYLLABUS_FILE)) {
      var raw = fs.readFileSync(SYLLABUS_FILE, "utf8");
      if (raw.trim()) cache = JSON.parse(raw);
    }
  } catch (e) {}
  var ttl = 7 * 24 * 60 * 60 * 1000;
  if (cache && cache.syllabus && cache.fetchedAt && (Date.now() - new Date(cache.fetchedAt).getTime()) < ttl) {
    return { source: cache.source || "cache", syllabus: cache.syllabus };
  }
  /* Try network refresh (best-effort, sync wrapper that returns the cache either way). */
  try {
    refreshSyllabusFromNetwork().then(function (fresh) {
      if (fresh) {
        var payload = { source: "live", fetchedAt: new Date().toISOString(), syllabus: fresh };
        try { fs.writeFileSync(SYLLABUS_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8"); } catch (e) {}
      }
    }).catch(function () {});
  } catch (e) {}
  if (cache && cache.syllabus) return { source: "cache", syllabus: cache.syllabus };
  return { source: "fallback", syllabus: HARDCODED_SYLLABUS };
}

function findModule(syllabus, moduleId) {
  if (!syllabus || !Array.isArray(syllabus)) return null;
  for (var i = 0; i < syllabus.length; i++) {
    var dom = syllabus[i];
    if (!dom || !dom.modules) continue;
    for (var j = 0; j < dom.modules.length; j++) {
      if (dom.modules[j].id === moduleId) {
        return { module: dom.modules[j], domain: dom };
      }
    }
  }
  return null;
}

/* ============================================================
   NEW: Per-user progress (server-authoritative)
   ============================================================ */

function buildEmptyProgress() {
  var syl = loadSyllabus().syllabus;
  var modules = {};
  syl.forEach(function (dom) {
    dom.modules.forEach(function (m) { modules[m.id] = { done: false, readAt: null, checkpointScore: null }; });
  });
  return {
    schemaVersion: 1,
    phase: "Phase 1 - Foundations Learning",
    lastCompletedModuleId: null,
    nextUpModuleId: syl[0] && syl[0].modules[0] ? syl[0].modules[0].id : null,
    lastSessionAt: null,
    currentStreak: 0,
    modules: modules,
    checkpointScores: [],
    mockScores: [],
    weakTopics: [],
    notes: []
  };
}

function readProgress(slug) {
  var p = readUser(slug, "progress.json", null);
  if (!p || !p.modules) {
    var fresh = buildEmptyProgress();
    writeUser(slug, "progress.json", fresh);
    return fresh;
  }
  /* Make sure new modules from a refreshed syllabus appear. */
  var syl = loadSyllabus().syllabus;
  var changed = false;
  syl.forEach(function (dom) {
    dom.modules.forEach(function (m) {
      if (!p.modules[m.id]) { p.modules[m.id] = { done: false, readAt: null, checkpointScore: null }; changed = true; }
    });
  });
  if (changed) writeUser(slug, "progress.json", p);
  return p;
}

function readLabs(slug) {
  return readUser(slug, "labs.json", { schemaVersion: 1, labs: [] });
}

/* ============================================================
   Per-user portal settings (exam date)
   ------------------------------------------------------------
   One value, read by both portals, so the "days to exam" and
   "current phase" cards can never disagree. Stored per user in
   data/users/<slug>/settings.json.

   GET is intentionally readable without a session: it then returns
   only the built-in default (no user data), so a signed-out or
   brand-new visitor still sees a populated countdown instead of a
   dash. Writing always requires a session.
   ============================================================ */

var DEFAULT_EXAM_DATE  = "2026-09-30";
var PHASE2_LENGTH_DAYS = 17;   /* final stretch reserved for timed mocks */

/* True only for a real calendar date in YYYY-MM-DD form (rejects
   2026-02-30, 2026-13-01, and anything outside a sane range). */
function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  var parts = value.split("-");
  var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
  if (y < 2020 || y > 2100) return false;
  var probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y &&
         (probe.getUTCMonth() + 1) === m &&
         probe.getUTCDate() === d;
}

function settingsPayload(examDate, source, updatedAt) {
  return {
    schemaVersion: 1,
    examDate: examDate,
    source: source,                        /* "user" | "default" */
    defaultExamDate: DEFAULT_EXAM_DATE,
    phase2LengthDays: PHASE2_LENGTH_DAYS,
    updatedAt: updatedAt || null
  };
}

function readSettings(slug) {
  var s = readUser(slug, "settings.json", null);
  if (s && isIsoDate(s.examDate)) return settingsPayload(s.examDate, "user", s.updatedAt || null);
  return settingsPayload(DEFAULT_EXAM_DATE, "default", null);
}

function handleGetSettings(req, res) {
  var cookies = parseCookies(req);
  var slug = cookies.ccaf_session || "";
  var payload;
  if (slug && /^[a-z0-9_]{1,40}$/.test(slug)) {
    payload = readSettings(slug);
    payload.signedIn = true;
  } else {
    payload = settingsPayload(DEFAULT_EXAM_DATE, "default", null);
    payload.signedIn = false;
  }
  return sendJSON(res, 200, payload);
}

function handleSaveSettings(req, res) {
  var slug = requireUser(req, res);
  if (!slug) return;
  readBody(req, function (err, body) {
    if (err) return sendJSON(res, 400, { error: err.message });
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return sendJSON(res, 400, { error: "Body must be an object" });
    }

    /* null / "" clears the override and restores the built-in default. */
    var raw = body.examDate;
    if (raw === null || raw === undefined || raw === "") {
      try {
        var file = path.join(userDir(slug), "settings.json");
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (e) { /* leaving a stale file only means the old date stays */ }
      var cleared = settingsPayload(DEFAULT_EXAM_DATE, "default", null);
      cleared.signedIn = true;
      return sendJSON(res, 200, cleared);
    }

    if (!isIsoDate(raw)) {
      return sendJSON(res, 400, {
        error: "examDate must be a real calendar date as YYYY-MM-DD between 2020 and 2100."
      });
    }

    var stamp = new Date().toISOString();
    if (!writeUser(slug, "settings.json", { schemaVersion: 1, examDate: raw, updatedAt: stamp })) {
      return sendJSON(res, 500, { error: "Failed to save settings" });
    }
    var saved = settingsPayload(raw, "user", stamp);
    saved.signedIn = true;
    return sendJSON(res, 200, saved);
  });
}

function readSessionsDir(slug) {
  var dir = path.join(userDir(slug), "sessions");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f); });
}

/* ============================================================
   Outbound AI provider layer
   ------------------------------------------------------------
   One implementation for every provider style ("openai",
   "anthropic", "google"), used by every AI feature on both
   portals: Sage/Nyx chat, module content generation, quiz and
   mock generation, and performance summaries.
   ============================================================ */

function providerErrorMessage(data, raw, statusCode) {
  var msg = "";
  try {
    if (data && data.error) msg = (typeof data.error === "string") ? data.error : String(data.error.message || "");
    if (!msg && data && data.message) msg = String(data.message);
    if (!msg && Array.isArray(data) && data[0] && data[0].error) msg = String(data[0].error.message || "");
  } catch (e) {}
  if (!msg) msg = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 300);
  return "Provider returned HTTP " + statusCode + (msg ? ": " + msg : "");
}

/* Minimal JSON HTTP client for provider calls. */
function providerRequest(targetUrl, options) {
  options = options || {};
  return new Promise(function (resolve, reject) {
    var parsed;
    try { parsed = url.parse(targetUrl); } catch (e) { parsed = null; }
    if (!parsed || !parsed.hostname) { reject(new Error("The provider endpoint URL is invalid: " + targetUrl)); return; }
    var client = parsed.protocol === "https:" ? https : http;
    var payload = options.body ? JSON.stringify(options.body) : null;
    var headers = { "Accept": "application/json" };
    Object.keys(options.headers || {}).forEach(function (k) { headers[k] = options.headers[k]; });
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    var req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.path,
      method: options.method || "GET",
      headers: headers,
      timeout: options.timeoutMs || 180000
    }, function (res) {
      var chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () {
        var raw = Buffer.concat(chunks).toString("utf8");
        var data = null;
        if (raw) { try { data = JSON.parse(raw); } catch (e) { data = null; } }
        if (res.statusCode >= 400) {
          var err = new Error(providerErrorMessage(data, raw, res.statusCode));
          err.statusCode = res.statusCode;
          err.raw = raw;
          reject(err);
          return;
        }
        if (data === null) {
          reject(new Error("The provider returned a response that was not valid JSON."));
          return;
        }
        resolve(data);
      });
    });
    req.on("error", function (e) {
      reject(new Error("Could not reach the provider: " + (e && e.message ? e.message : "network error")));
    });
    req.on("timeout", function () { req.destroy(new Error("The provider request timed out.")); });
    if (payload) req.write(payload);
    req.end();
  });
}

function joinUrl(base, suffix) {
  var b = String(base || "").replace(/\/+$/, "");
  var s = String(suffix || "");
  if (!s) return b;
  if (s.charAt(0) !== "/") s = "/" + s;
  return b + s;
}

function appendQuery(target, key, value) {
  return target + (target.indexOf("?") >= 0 ? "&" : "?") + key + "=" + encodeURIComponent(value);
}

function normalizeModelId(raw) {
  return String(raw || "").trim().replace(/^models\//i, "");
}

function providerAuthHeaders(provider, apiKey) {
  var headers = {};
  if (!provider) return headers;
  if (provider.style === "anthropic") {
    if (apiKey) headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = provider.apiVersion || "2023-06-01";
  } else if (provider.style === "google") {
    /* Google AI Studio authenticates with a ?key= query parameter. */
  } else if (apiKey) {
    headers["Authorization"] = "Bearer " + apiKey;
  }
  return headers;
}

/* ---------- Model discovery ---------- */
function catalogFallbackModels(provider) {
  if (!provider || !Array.isArray(provider.fallbackModels)) return [];
  return provider.fallbackModels.map(function (m) {
    return { id: normalizeModelId(m.id), label: m.label || m.id };
  }).filter(function (m) { return !!m.id; });
}

function parseModelList(provider, payload) {
  var bucket = [];
  if (Array.isArray(payload)) bucket = payload;
  else if (payload && Array.isArray(payload.data)) bucket = payload.data;
  else if (payload && Array.isArray(payload.models)) bucket = payload.models;
  var seen = {};
  var out = [];
  bucket.forEach(function (item) {
    if (!item) return;
    var rawId = (typeof item === "string") ? item : (item.id || item.name || item.model || "");
    var id = normalizeModelId(rawId);
    if (!id || seen[id]) return;
    if (provider && provider.style === "google" && Array.isArray(item.supportedGenerationMethods)) {
      if (item.supportedGenerationMethods.indexOf("generateContent") === -1) return;
    }
    seen[id] = true;
    var display = normalizeModelId(item.display_name || item.displayName || item.label || "");
    out.push({ id: id, label: (display && display !== id) ? (display + " · " + id) : id });
  });
  out.sort(function (a, b) { return a.id.localeCompare(b.id); });
  return out;
}

/* Resolves to { models: [{id,label}], source: "live"|"catalog"|"none", warning? }.
   Never rejects: a failed live lookup falls back to the catalog list so the
   model dropdown always has something usable. */
function listProviderModels(provider, apiKey) {
  var fallback = catalogFallbackModels(provider);
  if (!provider || !provider.modelsPath) {
    return Promise.resolve({ models: fallback, source: fallback.length ? "catalog" : "none" });
  }
  var target = joinUrl(provider.baseUrl, provider.modelsPath);
  if (provider.style === "google") {
    if (apiKey) target = appendQuery(target, "key", apiKey);
    target = appendQuery(target, "pageSize", "1000");
  }
  return providerRequest(target, {
    method: "GET",
    headers: providerAuthHeaders(provider, apiKey),
    timeoutMs: 20000
  }).then(function (payload) {
    var models = parseModelList(provider, payload);
    if (models.length) return { models: models, source: "live" };
    return { models: fallback, source: fallback.length ? "catalog" : "none" };
  }).catch(function (err) {
    return {
      models: fallback,
      source: fallback.length ? "catalog" : "none",
      warning: err && err.message ? err.message : "Could not list models from the provider."
    };
  });
}

/* ---------- Chat completion ---------- */
function splitSystemMessages(messages) {
  var system = [];
  var turns = [];
  (Array.isArray(messages) ? messages : []).forEach(function (m) {
    var role = String((m && m.role) || "").toLowerCase();
    var content = String((m && m.content) || "");
    if (!content) return;
    if (role === "system") { system.push(content); return; }
    turns.push({ role: role === "assistant" ? "assistant" : "user", content: content });
  });
  if (!turns.length) turns.push({ role: "user", content: "Hello" });
  return { system: system.join("\n\n"), turns: turns };
}

function openAiChat(provider, apiKey, model, opts, variant) {
  var split = splitSystemMessages(opts.messages);
  var messages = [];
  if (split.system) messages.push({ role: "system", content: split.system });
  split.turns.forEach(function (t) { messages.push(t); });
  var body = { model: model, messages: messages };
  if (variant.tokenField === "max_completion_tokens") body.max_completion_tokens = opts.maxTokens;
  else body.max_tokens = opts.maxTokens;
  if (!variant.dropTemperature) body.temperature = opts.temperature;
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  return providerRequest(joinUrl(provider.baseUrl, "/chat/completions"), {
    method: "POST",
    headers: providerAuthHeaders(provider, apiKey),
    body: body
  }).then(function (data) {
    var choice = data && Array.isArray(data.choices) ? data.choices[0] : null;
    var content = choice && choice.message ? choice.message.content : null;
    if (Array.isArray(content)) {
      content = content.map(function (part) { return (part && (part.text || part.content)) || ""; }).join("");
    }
    if (typeof content !== "string" || !content.trim()) throw new Error("The provider returned an empty response.");
    return content;
  }).catch(function (err) {
    /* Newer OpenAI reasoning models reject max_tokens and/or a custom
       temperature. Retry once with the shapes they accept. */
    var msg = String((err && err.message) || "");
    if (err && err.statusCode === 400 && !variant.tokenField && /max_completion_tokens/i.test(msg)) {
      return openAiChat(provider, apiKey, model, opts, { tokenField: "max_completion_tokens", dropTemperature: variant.dropTemperature });
    }
    if (err && err.statusCode === 400 && !variant.dropTemperature && /temperature/i.test(msg)) {
      return openAiChat(provider, apiKey, model, opts, { tokenField: variant.tokenField, dropTemperature: true });
    }
    throw err;
  });
}

function anthropicChat(provider, apiKey, model, opts) {
  var split = splitSystemMessages(opts.messages);
  var body = {
    model: model,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    messages: split.turns.map(function (t) {
      return { role: t.role, content: [{ type: "text", text: t.content }] };
    })
  };
  if (split.system) body.system = split.system;
  return providerRequest(joinUrl(provider.baseUrl, "/messages"), {
    method: "POST",
    headers: providerAuthHeaders(provider, apiKey),
    body: body
  }).then(function (data) {
    var text = "";
    if (data && Array.isArray(data.content)) {
      data.content.forEach(function (part) {
        if (part && typeof part.text === "string") text += part.text;
      });
    }
    if (!text.trim()) throw new Error("The provider returned an empty response.");
    return text;
  });
}

function googleChat(provider, apiKey, model, opts) {
  var split = splitSystemMessages(opts.messages);
  var body = {
    contents: split.turns.map(function (t) {
      return { role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] };
    }),
    generationConfig: {
      temperature: opts.temperature,
      maxOutputTokens: opts.maxTokens
    }
  };
  if (split.system) body.systemInstruction = { parts: [{ text: split.system }] };
  if (opts.jsonMode) body.generationConfig.responseMimeType = "application/json";
  var target = joinUrl(provider.baseUrl, "/models/" + encodeURIComponent(normalizeModelId(model)) + ":generateContent");
  if (apiKey) target = appendQuery(target, "key", apiKey);
  return providerRequest(target, { method: "POST", body: body }).then(function (data) {
    var text = "";
    var candidates = (data && Array.isArray(data.candidates)) ? data.candidates : [];
    for (var i = 0; i < candidates.length && !text; i++) {
      var parts = (candidates[i] && candidates[i].content && Array.isArray(candidates[i].content.parts)) ? candidates[i].content.parts : [];
      for (var j = 0; j < parts.length; j++) {
        if (typeof parts[j].text === "string") text += parts[j].text;
      }
    }
    if (!text.trim() && data && typeof data.text === "string") text = data.text;
    if (!text.trim()) throw new Error("The provider returned an empty response.");
    return text;
  });
}

/* Single entry point for every AI call.
   cfg = { provider, model, apiKey } from resolveAiConfig().
   opts = { messages, temperature, maxTokens, jsonMode } */
function providerChat(cfg, opts) {
  if (!cfg || !cfg.provider) return Promise.reject(new Error("No AI provider configured."));
  var normalized = {
    messages: (opts && opts.messages) || [],
    temperature: (opts && typeof opts.temperature === "number") ? opts.temperature : 0.7,
    maxTokens: (opts && typeof opts.maxTokens === "number") ? opts.maxTokens : 1200,
    jsonMode: !!(opts && opts.jsonMode)
  };
  var style = cfg.provider.style;
  if (style === "anthropic") return anthropicChat(cfg.provider, cfg.apiKey, cfg.model, normalized);
  if (style === "google") return googleChat(cfg.provider, cfg.apiKey, cfg.model, normalized);
  return openAiChat(cfg.provider, cfg.apiKey, cfg.model, normalized, {});
}

/* ============================================================
   NEW: AI-generated module content
   ============================================================ */

/* Strip AI-leaked meta-instructions, system-reminder blocks, and
   trailing "verify against …" lines from generated module content.
   Idempotent. Never modifies the actual body of the study page. */
function cleanGeneratedMarkdown(raw) {
  if (!raw) return "";
  var text = String(raw);

  // 1. Strip any <system-reminder>…</system-reminder> blocks (the
  //    model occasionally echoes the system prompt scaffolding).
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, "");

  // 2. Find a horizontal-rule line ("---") that separates the real
  //    content from a trailing meta-instruction. We only consider
  //    the LAST "---" so we don't break legitimate content like
  //    an H2 underline or an em-dash inside a sentence.
  var ruleMatches = [];
  var re = /(^|\n)---[ \t]*\n/g;
  var m;
  while ((m = re.exec(text)) !== null) {
    ruleMatches.push(m.index + m[1].length);
  }
  if (ruleMatches.length) {
    var lastRule = ruleMatches[ruleMatches.length - 1];
    var before = text.slice(0, lastRule);
    var after = text.slice(lastRule);
    // Only strip the "---" + tail if the tail looks like a meta-
    // instruction (starts with an imperative verb or contains a
    // known leak phrase). We do NOT strip in every case.
    var tail = after.replace(/^---[ \t]*\n/, "").trim();
    var looksLikeMeta = /^(verify|check|make sure|note:|remember:|always|never|important:|tip:|hint:)/i.test(tail)
      || /verify against/i.test(tail)
      || /current anthropic/i.test(tail)
      || /SDK\s*\/\s*API\s*docs/i.test(tail)
      || /tool schemas/i.test(tail);
    if (looksLikeMeta) text = before;
  }

  // 3. Drop trailing lines that look like meta-instructions even
  //    without a "---" separator.
  var lines = text.split("\n");
  while (lines.length) {
    var last = lines[lines.length - 1].trim();
    if (!last) { lines.pop(); continue; }
    var isMeta = /^(verify|check|make sure|note:|remember:|always|never|important:|tip:|hint:)/i.test(last)
      || /verify against/i.test(last)
      || /current anthropic/i.test(last)
      || /tool schemas/i.test(last)
      || /SDK\s*\/\s*API\s*docs/i.test(last);
    if (isMeta) { lines.pop(); }
    else break;
  }
  text = lines.join("\n");

  // 4. Collapse 3+ consecutive blank lines to 1.
  text = text.replace(/\n{3,}/g, "\n\n");

  // 5. Trim trailing whitespace.
  text = text.replace(/\s+$/, "");
  return text;
}

function generateModuleMarkdown(syl, moduleId, cfg) {
  var found = findModule(syl, moduleId);
  if (!found) return Promise.reject(new Error("Unknown module: " + moduleId));
  var moduleTitle = found.module.title;
  var domainName = found.domain.name;
  var systemPrompt = [
    "ROLE",
    "You are writing a focused, exam-oriented study page for the certification",
    "\"Claude Certified Architect - Foundations\", domain: \"" + domainName + "\", module: \"" + moduleTitle + "\".",
    "Audience: a senior cybersecurity/M365 engineer who is a complete beginner to AI/Claude.",
    "",
    "BODY (the actual study content) — cover what an exam candidate must know:",
    "- A short definition (2-3 sentences)",
    "- Why it matters (exam relevance, 1-2 sentences)",
    "- Key concepts (3-6 bullets, plain language)",
    "- 2-3 common exam traps or misconceptions",
    "- One 2-sentence cybersecurity/M365 analogy",
    "",
    "OUTPUT FORMAT (strict, follow exactly):",
    "1. Start with the module title as an H1 heading on the first line.",
    "2. Then the body sections above, in plain Markdown.",
    "3. Then a single fenced code block whose info string is exactly `check`.",
    "   Inside that block, write EXACTLY three Q/A pairs in the form:",
    "       Q1: <question text>",
    "       A1: <answer text (may wrap to continuation lines)>",
    "       Q2: <question text>",
    "       A2: <answer text>",
    "       Q3: <question text>",
    "       A3: <answer text>",
    "   Do NOT use HTML, <details>, or any markup inside the block. Plain Q:/A: lines only.",
    "4. End the document after the Q3/A3 pair. Nothing after it.",
    "",
    "DO NOT INCLUDE in your output (these are rules, not text to print):",
    "- Front-matter, preamble, or salutations like \"Here is your study page\".",
    "- Closing remarks, meta-notes, or any mention of this prompt.",
    "- Phrases like \"verify against current Anthropic docs\" or \"verify tool schemas\".",
    "- <system-reminder> tags or any leaked scaffolding text.",
    "- Any line that is not part of the actual study content or the check block.",
    "",
    "RULES (behavior, not output):",
    "- Tone: plain, beginner-friendly, with the 2-sentence cybersecurity/M365 analogy.",
    "- Length: under 1500 words.",
    "- The \"verify against current docs\" guidance is a behavior rule for how you answer;",
    "  it is NOT content for the user. The user is a learner, not the AI."
  ].join("\n");
  var userPrompt = "Write the study page for: " + moduleTitle + " (domain: " + domainName + ").";
  return providerChat(cfg, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.4,
    maxTokens: 2400
  }).then(function (content) {
    return cleanGeneratedMarkdown(content);
  });
}

function getCachedModuleContent(slug, moduleId) {
  var file = path.join(userDir(slug), "content", moduleId + ".html");
  try {
    if (!fs.existsSync(file)) return null;
    var raw = fs.readFileSync(file, "utf8");
    var stat = fs.statSync(file);
    return { html: raw, cachedAt: stat.mtime.toISOString() };
  } catch (e) { return null; }
}

function saveCachedModuleContent(slug, moduleId, html) {
  var dir = path.join(userDir(slug), "content");
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  var file = path.join(dir, moduleId + ".html");
  try {
    var tmp = file + ".tmp";
    fs.writeFileSync(tmp, html, "utf8");
    fs.renameSync(tmp, file);
    return true;
  } catch (e) { return false; }
}

function unwrapJsonResponseField(text) {
  if (!text) return text;
  var t = String(text).trim();
  if (t.charAt(0) !== "{" || t.charAt(t.length - 1) !== "}") return text;
  try {
    var obj = JSON.parse(t);
    if (!obj || typeof obj !== "object") return text;
    var keys = ["response", "answer", "text", "message", "reply", "content"];
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (typeof v === "string" && v.trim()) return v;
    }
  } catch (e) {}
  return text;
}

/* ============================================================
   NEW: Tutor sessions
   ============================================================ */

function readSession(slug, sessionId) {
  var safe = String(sessionId).replace(/[^a-zA-Z0-9_\-]/g, "");
  if (!safe) return null;
  var file = path.join(userDir(slug), "sessions", safe + ".json");
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) { return null; }
}

function writeSession(slug, session) {
  var id = String(session.id || "").replace(/[^a-zA-Z0-9_\-]/g, "");
  if (!id) id = crypto.randomBytes(8).toString("hex");
  session.id = id;
  var file = path.join(userDir(slug), "sessions", id + ".json");
  try {
    var dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    var tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(session, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, file);
    return id;
  } catch (e) { return null; }
}

function listSessions(slug) {
  var out = [];
  var dir = path.join(userDir(slug), "sessions");
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f); }).forEach(function (f) {
    try {
      var s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      out.push({
        id: s.id,
        title: s.title || "Untitled",
        startedAt: s.startedAt,
        lastMessageAt: s.lastMessageAt,
        messageCount: Array.isArray(s.messages) ? s.messages.length : 0,
        focus: s.focus || null
      });
    } catch (e) {}
  });
  out.sort(function (a, b) { return (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""); });
  return out;
}

/* ============================================================
   NEW: Markdown -> structured labs tree
   ============================================================ */

function parseLabsMarkdown(md) {
  var lines = String(md || "").split(/\r?\n/);
  var labs = [];
  var current = null;
  var currentStep = null;
  var inCode = false;
  var codeBuffer = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    var labMatch = line.match(/^#{2,3}\s+(Lab\s+\d+.*)$/i);
    if (labMatch) {
      if (current) labs.push(current);
      current = {
        title: labMatch[1].trim(),
        slug: slugify(labMatch[1]),
        domain: "",
        goal: "",
        prerequisites: "",
        steps: [],
        observe: "",
        whyMatters: ""
      };
      currentStep = null;
      inCode = false;
      codeBuffer = [];
      continue;
    }

    if (!current) continue;

    var domMatch = line.match(/^\s*-\s+\*\*Domain\(s\):\*\*\s*(.*)$/i);
    if (domMatch) { current.domain = domMatch[1].trim(); continue; }

    var goalMatch = line.match(/^\s*-\s+\*\*Goal:\*\*\s*(.*)$/i);
    if (goalMatch) { current.goal = goalMatch[1].trim(); continue; }

    var prereqMatch = line.match(/^\s*-\s+\*\*Prerequisites.*:\*\*\s*(.*)$/i);
    if (prereqMatch) { current.prerequisites = prereqMatch[1].trim(); continue; }

    var obsMatch = line.match(/^\s*-\s+\*\*What to observe.*:\*\*\s*(.*)$/i);
    if (obsMatch) { current.observe = obsMatch[1].trim(); continue; }

    var whyMatch = line.match(/^\s*-\s+\*\*Why this matters.*:\*\*\s*(.*)$/i);
    if (whyMatch) { current.whyMatters = whyMatch[1].trim(); continue; }

    if (line.match(/^\s*```/)) {
      if (inCode) {
        inCode = false;
        if (currentStep) {
          currentStep.code = codeBuffer.join("\n").trim();
        }
        codeBuffer = [];
      } else {
        inCode = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    var numStep = line.match(/^\s*(\d+)\.\s+(.*)$/);
    var taskOpen = line.match(/^\s*-\s+\[\s\]\s+(.*)$/);
    var taskDone = line.match(/^\s*-\s+\[x\]\s+(.*)$/i);
    var bullet = line.match(/^\s*-\s+(.*)$/);

    if (numStep) {
      currentStep = {
        num: numStep[1],
        text: numStep[2].trim(),
        slug: slugify("step-" + numStep[1] + "-" + numStep[2].slice(0, 30)),
        done: false
      };
      current.steps.push(currentStep);
    } else if (taskOpen) {
      currentStep = { text: taskOpen[1].trim(), slug: slugify(taskOpen[1]), done: false };
      current.steps.push(currentStep);
    } else if (taskDone) {
      currentStep = { text: taskDone[1].trim(), slug: slugify(taskDone[1]), done: true };
      current.steps.push(currentStep);
    } else if (bullet && current.steps.length > 0 && !line.match(/^\s*-\s+\*\*/)) {
      currentStep = { text: bullet[1].trim(), slug: slugify(bullet[1]), done: false };
      current.steps.push(currentStep);
    }
  }
  if (current) labs.push(current);
  return labs;
}

/* ============================================================
   API handlers
   ============================================================ */

/* ---------- AI provider configuration API ---------- */

/* GET /api/ai/providers — static catalog (no secrets, no auth needed). */
function handleGetAiProviders(res) {
  sendJSON(res, 200, { providers: publicProviderCatalog() });
}

/* GET /api/ai/config — the signed-in user's saved selection (never the key). */
function handleGetAiConfig(req, res) {
  var slug = requireUser(req, res); if (!slug) return;
  sendJSON(res, 200, publicUserAiConfig(slug));
}

/* PUT /api/ai/config — save provider + model (+ API key) for this user. */
function handleSaveAiConfig(req, res) {
  var slug = requireUser(req, res); if (!slug) return;
  readBody(req, function (err, body) {
    if (err) return sendJSON(res, 400, { error: err.message });
    body = body || {};
    var provider = findProvider(body.providerId || body.provider);
    if (!provider) return sendJSON(res, 400, { error: "Unknown provider. Pick one from the provider list." });
    var model = normalizeModelId(body.model);
    if (!model) return sendJSON(res, 400, { error: "Select a model before saving." });
    var existing = readUserAiConfig(slug);
    var apiKey = String(body.apiKey == null ? "" : body.apiKey).trim();
    /* An empty key keeps the key already on file for the same provider. */
    if (!apiKey && existing && existing.providerId === provider.id) apiKey = existing.apiKey || "";
    if (provider.requiresApiKey !== false && !apiKey) {
      return sendJSON(res, 400, { error: "An API key is required for " + provider.name + "." });
    }
    var saved = {
      providerId: provider.id,
      providerName: provider.name,
      model: model,
      apiKey: apiKey,
      updatedAt: new Date().toISOString()
    };
    if (!writeUserAiConfig(slug, saved)) {
      return sendJSON(res, 500, { error: "Failed to save the AI provider configuration." });
    }
    return sendJSON(res, 200, publicUserAiConfig(slug));
  });
}

/* DELETE /api/ai/config — forget this user's selection. */
function handleDeleteAiConfig(req, res) {
  var slug = requireUser(req, res); if (!slug) return;
  clearUserAiConfig(slug);
  sendJSON(res, 200, publicUserAiConfig(slug));
}

/* POST /api/ai/models — list models for a provider so the dropdown can
   auto-populate. Uses the key typed in the modal when supplied, otherwise
   the key already saved for that provider. Keys travel in the body, never
   in the query string. */
function handleGetAiModels(req, res) {
  var slug = requireUser(req, res); if (!slug) return;
  readBody(req, function (err, body) {
    if (err) return sendJSON(res, 400, { error: err.message });
    body = body || {};
    var provider = findProvider(body.providerId || body.provider);
    if (!provider) return sendJSON(res, 400, { error: "Unknown provider." });
    var apiKey = String(body.apiKey == null ? "" : body.apiKey).trim();
    if (!apiKey) {
      var existing = readUserAiConfig(slug);
      if (existing && existing.providerId === provider.id) apiKey = existing.apiKey || "";
    }
    if (provider.keyForModels && provider.requiresApiKey !== false && !apiKey) {
      return sendJSON(res, 200, {
        providerId: provider.id,
        models: catalogFallbackModels(provider),
        source: "none",
        needsApiKey: true,
        warning: "Paste your " + provider.name + " API key to load the live model list."
      });
    }
    listProviderModels(provider, apiKey).then(function (result) {
      sendJSON(res, 200, {
        providerId: provider.id,
        models: result.models,
        source: result.source,
        needsApiKey: false,
        warning: result.warning || null
      });
    }).catch(function (e) {
      sendJSON(res, 502, { error: e && e.message ? e.message : "Failed to list models." });
    });
  });
}

/* POST /api/ai/chat — one proxy for every AI feature on both portals.
   The provider, model and key come from the user's saved configuration;
   the browser never handles the key. */
function handleAiChat(req, res) {
  var slug = requireUser(req, res); if (!slug) return;
  readBody(req, function (err, payload) {
    if (err) return sendJSON(res, 400, { error: err.message });
    payload = payload || {};
    var cfg = resolveAiConfig(slug, payload);
    if (cfg.error) return sendJSON(res, 400, { error: cfg.error, needsConfig: true });
    if (!Array.isArray(payload.messages) || !payload.messages.length) {
      return sendJSON(res, 400, { error: "messages must be a non-empty array" });
    }
    providerChat(cfg, {
      messages: payload.messages,
      temperature: typeof payload.temperature === "number" ? payload.temperature : 0.7,
      maxTokens: typeof payload.maxTokens === "number" ? payload.maxTokens : (typeof payload.max_tokens === "number" ? payload.max_tokens : 1200),
      jsonMode: !!payload.jsonMode
    }).then(function (content) {
      sendJSON(res, 200, {
        reply: content,
        providerId: cfg.provider.id,
        providerName: cfg.provider.name,
        model: cfg.model
      });
    }).catch(function (e) {
      sendJSON(res, 502, { error: e && e.message ? e.message : "The AI request failed." });
    });
  });
}

function handleListQuestionSets(res) {
  try {
    ensureGeneratedDir();
    if (!fs.existsSync(GENERATED_DIR)) { sendJSON(res, 200, []); return; }
    var entries = fs.readdirSync(GENERATED_DIR).filter(function (f) {
      return /\.js$/i.test(f);
    });
    var out = [];
    entries.forEach(function (file) {
      var id = file.replace(/\.js$/i, "");
      try {
        var fileText = fs.readFileSync(path.join(GENERATED_DIR, file), "utf8");
        var set = inspectQuestionSet(fileText);
        if (set) {
          out.push({
            id: id,
            file: "data/generated/" + file,
            title: set.title || id,
            type: set.type || (id.indexOf("_mock_") !== -1 ? "mock" : "quiz"),
            domain: set.domain || "",
            domainKey: set.domainKey || "ai",
            count: Array.isArray(set.questions) ? set.questions.length : 0
          });
        } else {
          out.push({ id: id, file: "data/generated/" + file, title: id, type: (id.indexOf("_mock_") !== -1 ? "mock" : "quiz"), domain: "", domainKey: "ai", count: 0 });
        }
      } catch (inner) {
        out.push({ id: id, file: "data/generated/" + file, title: id, type: (id.indexOf("_mock_") !== -1 ? "mock" : "quiz"), domain: "", domainKey: "ai", count: 0, error: inner.message });
      }
    });
    sendJSON(res, 200, out);
  } catch (e) {
    sendJSON(res, 500, { error: "Failed to scan question sets: " + e.message });
  }
}

function handleGetQuestionSet(res, id) {
  try {
    /* prevent path traversal */
    var safeId = String(id).replace(/[^a-zA-Z0-9_\-]/g, "");
    if (!safeId) { sendJSON(res, 400, { error: "Invalid id" }); return; }
    var filePath = path.join(GENERATED_DIR, safeId + ".js");
    if (!fs.existsSync(filePath)) {
      sendJSON(res, 404, { error: "Question set not found: " + safeId });
      return;
    }
    var text = fs.readFileSync(filePath, "utf8");
    sendText(res, 200, text, "application/javascript; charset=utf-8");
  } catch (e) {
    sendJSON(res, 500, { error: "Failed to read question set: " + e.message });
  }
}

/* Build a .js file in the SAME registration format as the existing
   data files (window.registerQuestionSet({...})). */
function buildQuestionSetFile(id, payload) {
  var set = {
    id: id,
    type: (payload.type === "mock") ? "mock" : "quiz",
    domain: payload.domain || "",
    domainKey: payload.domainKey || "ai",
    title: payload.title || id,
    passPct: (typeof payload.passPct === "number") ? payload.passPct : 70,
    questions: Array.isArray(payload.questions) ? payload.questions : []
  };
  if (set.type === "mock") {
    set.timeLimitMinutes = payload.timeLimitMinutes || 120;
  }
  var header =
    '"use strict";\n' +
    "/* ============================================================\n" +
    "   AI-generated question set. Auto-saved to data/generated/ and\n" +
    "   auto-discovered by the dashboard on load. Registered via\n" +
    "   window.registerQuestionSet (defined by app.js before injection).\n" +
    "   ============================================================ */\n";
  return header + "window.registerQuestionSet(" + JSON.stringify(set, null, 2) + ");\n";
}

function handleCreateQuestionSet(req, res) {
  readBody(req, function (err, payload) {
    if (err) { sendJSON(res, 400, { error: err.message }); return; }
    try {
      if (!payload || typeof payload !== "object") {
        sendJSON(res, 400, { error: "Body must be a JSON object" });
        return;
      }
      if (!Array.isArray(payload.questions) || !payload.questions.length) {
        sendJSON(res, 400, { error: "Body must include a non-empty 'questions' array" });
        return;
      }
      ensureGeneratedDir();
      var type = (payload.type === "mock") ? "mock" : "quiz";
      var timestamp = Date.now();
      var id = "ai_" + type + "_" + timestamp + "_" + Math.floor(Math.random() * 1e4);
      var file = id + ".js";
      var filePath = path.join(GENERATED_DIR, file);
      var contents = buildQuestionSetFile(id, payload);
      fs.writeFileSync(filePath, contents, "utf8");
      sendJSON(res, 200, { ok: true, id: id, file: "data/generated/" + file });
    } catch (e) {
      sendJSON(res, 500, { error: "Failed to save question set: " + e.message });
    }
  });
}

function handleGetScores(res) {
  try {
    if (!fs.existsSync(SCORES_FILE)) { sendJSON(res, 200, []); return; }
    var raw = fs.readFileSync(SCORES_FILE, "utf8");
    if (!raw.trim()) { sendJSON(res, 200, []); return; }
    var data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [];
    sendJSON(res, 200, data);
  } catch (e) {
    sendJSON(res, 500, { error: "Failed to read scores: " + e.message });
  }
}

function getProfileStorePath() {
  return path.join(DATA_ROOT, "profiles.json");
}

function readProfilesFile() {
  var filePath = getProfileStorePath();
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2), "utf8");
    }
    var raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return {};
    var data = JSON.parse(raw);
    return (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
  } catch (e) {
    return {};
  }
}

function writeProfilesFile(data) {
  try {
    var dir = path.dirname(getProfileStorePath());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getProfileStorePath(), JSON.stringify(data, null, 2) + "\n", "utf8");
  } catch (e) {
    throw e;
  }
}

function handleProfileLogin(req, res) {
  readBody(req, function (err, payload) {
    if (err) { sendJSON(res, 400, { error: err.message }); return; }
    try {
      if (!payload || typeof payload !== "object") {
        sendJSON(res, 400, { error: "Body must be a JSON object" });
        return;
      }
      var name = String(payload.name || "").trim();
      var password = String(payload.password || "").trim();
      if (!name || !password) {
        sendJSON(res, 400, { error: "Name and password are required" });
        return;
      }
      var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      if (!slug) { sendJSON(res, 400, { error: "Invalid name" }); return; }

      /* Server-authoritative profile lives in data/users/<slug>/profile.json. */
      var profileFile = path.join(userDir(slug), "profile.json");
      var existing = null;
      try { if (fs.existsSync(profileFile)) existing = JSON.parse(fs.readFileSync(profileFile, "utf8")); } catch (e) {}

      if (!existing) {
        if (payload.createIfMissing !== true) {
          sendJSON(res, 401, { error: "Profile not found. Please create it first." });
          return;
        }
        var hash = hashPassword(password);
        var newProfile = { name: name, slug: slug, passwordHash: hash, createdAt: new Date().toISOString() };
        try { fs.mkdirSync(userDir(slug), { recursive: true }); } catch (e) {}
        fs.writeFileSync(profileFile, JSON.stringify(newProfile, null, 2) + "\n", "utf8");
        /* Seed progress.json immediately so the Learn portal has data on first read. */
        try { readProgress(slug); } catch (e) {}
        try { res.setHeader("Set-Cookie", "ccaf_session=" + encodeURIComponent(slug) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + (30*24*60*60)); } catch (e) {}
        sendJSON(res, 200, { ok: true, status: "created", user: { name: name, slug: slug } });
        return;
      }

      if (!verifyPassword(password, existing.passwordHash)) {
        sendJSON(res, 401, { error: "Incorrect password for that profile." });
        return;
      }
      try { res.setHeader("Set-Cookie", "ccaf_session=" + encodeURIComponent(slug) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + (30*24*60*60)); } catch (e) {}
      sendJSON(res, 200, { ok: true, status: "signed-in", user: { name: existing.name, slug: existing.slug } });
    } catch (e) {
      sendJSON(res, 500, { error: "Failed to process profile: " + e.message });
    }
  });
}

function handleAddScore(req, res) {
  readBody(req, function (err, record) {
    if (err) { sendJSON(res, 400, { error: err.message }); return; }
    try {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        sendJSON(res, 400, { error: "Body must be a score record object" });
        return;
      }
      var list = [];
      if (fs.existsSync(SCORES_FILE)) {
        var raw = fs.readFileSync(SCORES_FILE, "utf8");
        if (raw.trim()) {
          try {
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) list = parsed;
          } catch (pe) { list = []; }
        }
      }
      list.push(record);
      fs.writeFileSync(SCORES_FILE, JSON.stringify(list, null, 2) + "\n", "utf8");
      sendJSON(res, 200, { ok: true });
    } catch (e) {
      sendJSON(res, 500, { error: "Failed to save score: " + e.message });
    }
  });
}

/* ============================================================
   Static file serving
   ============================================================ */
function serveFileFromDir(res, baseDir, relativePath) {
  try {
    var rel = decodeURIComponent(relativePath);
    if (rel === "/" || rel === "") rel = "/index.html";

    var target = path.normalize(path.join(baseDir, rel));
    if (target.indexOf(baseDir) !== 0) {
      sendText(res, 403, "Forbidden");
      return;
    }

    fs.stat(target, function (err, stats) {
      if (err) {
        sendText(res, 404, "Not found: " + rel);
        return;
      }
      if (stats.isDirectory()) {
        target = path.join(target, "index.html");
      }
      fs.readFile(target, function (rerr, data) {
        if (rerr) {
          sendText(res, 404, "Not found: " + rel);
          return;
        }
        res.writeHead(200, {
          "Content-Type": contentTypeFor(target),
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store"
        });
        res.end(data);
      });
    });
  } catch (e) {
    sendText(res, 500, "Server error: " + e.message);
  }
}

function serveStatic(req, res, pathname) {
  try {
    var rel = decodeURIComponent(pathname);
    if (rel === "/" || rel === "") rel = "/index.html";

    /* Check shared root assets/ folder */
    if (rel.indexOf("/assets/") === 0) {
      var assetRel = rel.slice("/assets".length);
      var assetTarget = path.normalize(path.join(ASSETS_DIR, assetRel));
      if (assetTarget.indexOf(ASSETS_DIR) === 0 && fs.existsSync(assetTarget) && !fs.statSync(assetTarget).isDirectory()) {
        return serveFileFromDir(res, ASSETS_DIR, assetRel);
      }
    }

    /* Check root favicon.ico */
    if (rel === "/favicon.ico") {
      var favTarget = path.join(PROJECT_ROOT, "favicon.ico");
      if (fs.existsSync(favTarget)) {
        return serveFileFromDir(res, PROJECT_ROOT, "/favicon.ico");
      }
    }

    /* Try Study_Hub first */
    var studyTarget = path.normalize(path.join(STUDY_HUB_DIR, rel));
    if (studyTarget.indexOf(STUDY_HUB_DIR) === 0 && fs.existsSync(studyTarget) && !fs.statSync(studyTarget).isDirectory()) {
      return serveFileFromDir(res, STUDY_HUB_DIR, rel);
    }

    /* Fallback to Exam_Center */
    var examTarget = path.normalize(path.join(EXAM_CENTER_DIR, rel));
    if (examTarget.indexOf(EXAM_CENTER_DIR) === 0 && fs.existsSync(examTarget) && !fs.statSync(examTarget).isDirectory()) {
      return serveFileFromDir(res, EXAM_CENTER_DIR, rel);
    }

    /* Default serve from Study Hub */
    serveFileFromDir(res, STUDY_HUB_DIR, rel);
  } catch (e) {
    sendText(res, 500, "Server error: " + e.message);
  }
}

/* ============================================================
   Router
   ============================================================ */
var server = http.createServer(function (req, res) {
  try {
    var parsed = url.parse(req.url, true);
    var pathname = parsed.pathname || "/";
    var method = req.method || "GET";

    /* CORS pre-flight for any /api route */
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      });
      res.end();
      return;
    }

    if (pathname.indexOf("/api") === 0) {
      /* ---- AI provider configuration (shared by both portals) ---- */
      if (pathname === "/api/ai/providers" && method === "GET") {
        return handleGetAiProviders(res);
      }
      if (pathname === "/api/ai/config") {
        if (method === "GET")    return handleGetAiConfig(req, res);
        if (method === "PUT")    return handleSaveAiConfig(req, res);
        if (method === "POST")   return handleSaveAiConfig(req, res);
        if (method === "DELETE") return handleDeleteAiConfig(req, res);
        return sendJSON(res, 405, { error: "Method not allowed" });
      }
      if (pathname === "/api/ai/models" && method === "POST") {
        return handleGetAiModels(req, res);
      }
      if (pathname === "/api/ai/chat" && method === "POST") {
        return handleAiChat(req, res);
      }
      if (pathname === "/api/profile/login" && method === "POST") {
        return handleProfileLogin(req, res);
      }
      if (pathname === "/api/profile/logout" && method === "POST") {
        try { res.setHeader("Set-Cookie", "ccaf_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"); } catch (e) {}
        return sendJSON(res, 200, { ok: true });
      }
      if (pathname === "/api/me" && method === "GET") {
        var slug = requireUser(req, res); if (!slug) return;
        var p = readUser(slug, "profile.json", null);
        return sendJSON(res, 200, { slug: slug, name: p ? p.name : slug, createdAt: p ? p.createdAt : null });
      }
      if (pathname === "/api/syllabus" && method === "GET") {
        var s = loadSyllabus();
        return sendJSON(res, 200, { source: s.source, syllabus: s.syllabus });
      }
      /* Per-user portal settings (exam date). Readable while signed out
         so the countdown falls back to the built-in default. */
      if (pathname === "/api/settings") {
        if (method === "GET") return handleGetSettings(req, res);
        if (method === "PUT" || method === "POST") return handleSaveSettings(req, res);
        return sendJSON(res, 405, { error: "Method not allowed" });
      }
      if (pathname === "/api/progress" && method === "GET") {
        var slug2 = requireUser(req, res); if (!slug2) return;
        return sendJSON(res, 200, readProgress(slug2));
      }
      if (pathname === "/api/progress" && method === "PUT") {
        var slug3 = requireUser(req, res); if (!slug3) return;
        readBody(req, function (err, body) {
          if (err) return sendJSON(res, 400, { error: err.message });
          if (!body || typeof body !== "object") return sendJSON(res, 400, { error: "Body must be an object" });
          if (!writeUser(slug3, "progress.json", body)) return sendJSON(res, 500, { error: "Failed to save" });
          return sendJSON(res, 200, { ok: true });
        });
        return;
      }
      if (pathname === "/api/labs" && method === "GET") {
        var slug4 = requireUser(req, res); if (!slug4) return;
        var rawLabs = "";
        try { if (fs.existsSync(LABS_FILE)) rawLabs = fs.readFileSync(LABS_FILE, "utf8"); } catch (e) {}
        var parsed = parseLabsMarkdown(rawLabs);
        var userLabs = readLabs(slug4);
        /* Merge user ticks with parsed steps. */
        var byTitle = {};
        (userLabs.labs || []).forEach(function (l) { byTitle[l.title] = l; });
        parsed.forEach(function (lab) {
          var ut = byTitle[lab.title];
          if (ut && ut.steps) {
            var map = {};
            ut.steps.forEach(function (s) { map[s.slug] = s.done; });
            lab.steps.forEach(function (s) { if (typeof map[s.slug] === "boolean") s.done = map[s.slug]; });
          }
        });
        return sendJSON(res, 200, { labs: parsed, html: readMarkdownToHtml(rawLabs) });
      }
      if (pathname === "/api/labs/tick" && method === "POST") {
        var slug5 = requireUser(req, res); if (!slug5) return;
        readBody(req, function (err, body) {
          if (err) return sendJSON(res, 400, { error: err.message });
          var labTitle = String(body.labTitle || "").trim();
          var stepSlug = String(body.stepSlug || "").trim();
          var done = !!body.done;
          if (!labTitle || !stepSlug) return sendJSON(res, 400, { error: "labTitle and stepSlug required" });
          var cur = readLabs(slug5);
          if (!cur.labs) cur.labs = [];
          var lab = null;
          for (var i = 0; i < cur.labs.length; i++) if (cur.labs[i].title === labTitle) { lab = cur.labs[i]; break; }
          if (!lab) { lab = { title: labTitle, steps: [] }; cur.labs.push(lab); }
          var step = null;
          for (var j = 0; j < lab.steps.length; j++) if (lab.steps[j].slug === stepSlug) { step = lab.steps[j]; break; }
          if (!step) { step = { text: stepSlug, slug: stepSlug, done: false }; lab.steps.push(step); }
          step.done = done;
          writeUser(slug5, "labs.json", cur);
          return sendJSON(res, 200, { ok: true });
        });
        return;
      }
      /* /api/knowledge/:slug and /api/knowledge/:slug/generate */
      var knowMatch = pathname.match(/^\/api\/knowledge\/([a-z0-9_\-]+)$/);
      if (knowMatch && method === "GET") {
        var slug6 = requireUser(req, res); if (!slug6) return;
        var modId = knowMatch[1];
        var cached = getCachedModuleContent(slug6, modId);
        if (cached) return sendJSON(res, 200, { moduleId: modId, html: cached.html, cachedAt: cached.cachedAt, generated: false });
        var syl2 = loadSyllabus().syllabus;
        var foundMod = findModule(syl2, modId);
        if (!foundMod) return sendJSON(res, 404, { error: "Unknown module: " + modId });
        return sendJSON(res, 202, { moduleId: modId, html: "<article class=\"md\"><h1>" + escapeHtml(foundMod.module.title) + "</h1><p><em>Content not generated yet. Use the \"Generate\" button to have the AI tutor write this page.</em></p></article>", generated: false, needsGeneration: true });
      }
      var knowGenMatch = pathname.match(/^\/api\/knowledge\/([a-z0-9_\-]+)\/generate$/);
      if (knowGenMatch && method === "POST") {
        var slug7 = requireUser(req, res); if (!slug7) return;
        var modId2 = knowGenMatch[1];
        readBody(req, function (err, body) {
          if (err) return sendJSON(res, 400, { error: err.message });
          var genCfg = resolveAiConfig(slug7, body || {});
          if (genCfg.error) return sendJSON(res, 400, { error: genCfg.error, needsConfig: true });
          var syl3 = loadSyllabus().syllabus;
          generateModuleMarkdown(syl3, modId2, genCfg)
            .then(function (markdown) {
              var html = readMarkdownToHtml(markdown);
              saveCachedModuleContent(slug7, modId2, html);
              return sendJSON(res, 200, { moduleId: modId2, html: html, generated: true });
            })
            .catch(function (err2) {
              return sendJSON(res, 502, { error: "AI generation failed: " + (err2 && err2.message ? err2.message : "unknown") });
            });
        });
        return;
      }
      /* /api/chat/sessions */
      if (pathname === "/api/chat/sessions" && method === "GET") {
        var slug8 = requireUser(req, res); if (!slug8) return;
        return sendJSON(res, 200, listSessions(slug8));
      }
      if (pathname === "/api/chat/sessions" && method === "POST") {
        var slug9 = requireUser(req, res); if (!slug9) return;
        readBody(req, function (err, body) {
          if (err) return sendJSON(res, 400, { error: err.message });
          body = body || {};
          var sess = {
            id: crypto.randomBytes(8).toString("hex"),
            title: String(body.title || "New session").slice(0, 120),
            focus: body.focus || null,
            startedAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            messages: []
          };
          writeSession(slug9, sess);
          return sendJSON(res, 200, sess);
        });
        return;
      }
      var sessMatch = pathname.match(/^\/api\/chat\/sessions\/([a-zA-Z0-9_\-]+)$/);
      if (sessMatch && method === "GET") {
        var slug10 = requireUser(req, res); if (!slug10) return;
        var s10 = readSession(slug10, sessMatch[1]);
        if (!s10) return sendJSON(res, 404, { error: "Session not found" });
        return sendJSON(res, 200, s10);
      }
      if (sessMatch && method === "DELETE") {
        var slugD = requireUser(req, res); if (!slugD) return;
        try {
          var f = path.join(userDir(slugD), "sessions", sessMatch[1] + ".json");
          if (fs.existsSync(f)) fs.unlinkSync(f);
          return sendJSON(res, 200, { ok: true });
        } catch (e) {
          return sendJSON(res, 500, { error: "Failed to delete: " + e.message });
        }
      }
      var sessRename = pathname.match(/^\/api\/chat\/sessions\/([a-zA-Z0-9_\-]+)\/rename$/);
      if (sessRename && method === "POST") {
        var slug11 = requireUser(req, res); if (!slug11) return;
        readBody(req, function (err, body) {
          if (err) return sendJSON(res, 400, { error: err.message });
          var sR = readSession(slug11, sessRename[1]);
          if (!sR) return sendJSON(res, 404, { error: "Session not found" });
          sR.title = String((body && body.title) || sR.title).slice(0, 120);
          writeSession(slug11, sR);
          return sendJSON(res, 200, { ok: true, title: sR.title });
        });
        return;
      }
      var sessMsg = pathname.match(/^\/api\/chat\/sessions\/([a-zA-Z0-9_\-]+)\/messages$/);
      if (sessMsg && method === "POST") {
        var slug12 = requireUser(req, res); if (!slug12) return;
        readBody(req, function (err, body) {
          if (err) return sendJSON(res, 400, { error: err.message });
          body = body || {};
          var sM = readSession(slug12, sessMsg[1]);
          if (!sM) return sendJSON(res, 404, { error: "Session not found" });
          var userText = String(body.content || "").trim();
          if (!userText) return sendJSON(res, 400, { error: "content required" });
          var chatCfg = resolveAiConfig(slug12, body);
          if (chatCfg.error) return sendJSON(res, 400, { error: chatCfg.error, needsConfig: true });

          var focusContext = "";
          if (sM.focus && sM.focus.kind === "knowledge" && sM.focus.moduleId) {
            var fm = findModule(loadSyllabus().syllabus, sM.focus.moduleId);
            if (fm) focusContext = "\n\nThe user is currently studying module: " + fm.module.title + " (domain: " + fm.domain.name + "). Keep explanations focused on this module.";
          }
          if (body.context && typeof body.context === "string") {
            focusContext += "\n\n" + body.context.slice(0, 2000);
          }
          var sysPrompt = [
            "You are a friendly, concise study coach for the certification \"Claude Certified Architect - Foundations\".",
            "Answer the user's question in plain English. You may reference domains, concepts, exam strategy, or the current module if one is provided as context.",
            "Keep responses focused and practical (typically 2-8 short paragraphs or a short bullet list).",
            "Do NOT wrap replies in JSON or code fences unless the user explicitly asks for code or structured output.",
            "If you do not know something, say so rather than inventing facts." + focusContext
          ].join("\n");

          sM.messages.push({ role: "user", content: userText, ts: Date.now() });
          sM.lastMessageAt = new Date().toISOString();

          var history = [{ role: "system", content: sysPrompt }].concat(
            sM.messages.slice(-24).map(function (m) { return { role: m.role, content: m.content }; })
          );

          providerChat(chatCfg, { messages: history, temperature: 0.7, maxTokens: 900 })
            .then(function (content) {
              var reply = unwrapJsonResponseField(content);
              sM.messages.push({ role: "assistant", content: reply, ts: Date.now() });
              if (!sM.title || sM.title === "New session") sM.title = userText.slice(0, 60);
              sM.lastMessageAt = new Date().toISOString();
              writeSession(slug12, sM);
              return sendJSON(res, 200, { reply: reply, session: sM });
            })
            .catch(function (e) {
              /* Keep the user's message so the transcript is not lost. */
              writeSession(slug12, sM);
              return sendJSON(res, 502, { error: e && e.message ? e.message : "The AI request failed." });
            });
        });
        return;
      }
      /* /api/question-sets  and  /api/question-sets/:id */
      if (pathname === "/api/question-sets") {
        if (method === "GET")  return handleListQuestionSets(res);
        if (method === "POST") return handleCreateQuestionSet(req, res);
        return sendJSON(res, 405, { error: "Method not allowed" });
      }
      var qsMatch = pathname.match(/^\/api\/question-sets\/(.+)$/);
      if (qsMatch && method === "GET") {
        return handleGetQuestionSet(res, qsMatch[1]);
      }
      /* /api/scores */
      if (pathname === "/api/scores") {
        if (method === "GET")  return handleGetScores(res);
        if (method === "POST") return handleAddScore(req, res);
        return sendJSON(res, 405, { error: "Method not allowed" });
      }
      return sendJSON(res, 404, { error: "Unknown API route: " + pathname });
    }

    /* Shared cross-portal client scripts (served to both portals). */
    if (pathname.indexOf("/shared/") === 0) {
      return serveFileFromDir(res, SHARED_DIR, pathname.slice("/shared".length));
    }

    /* Serve /exam-center/* and /exam/* from the Exam_Center/ folder */
    if (pathname === "/exam-center" || pathname === "/exam") {
      res.writeHead(302, { "Location": "/exam-center/" });
      res.end();
      return;
    }
    if (pathname.indexOf("/exam-center/") === 0 || pathname.indexOf("/exam/") === 0) {
      var exPrefix = pathname.indexOf("/exam-center/") === 0 ? "/exam-center" : "/exam";
      var exRel = pathname.slice(exPrefix.length) || "/index.html";
      return serveFileFromDir(res, EXAM_CENTER_DIR, exRel);
    }

    /* Serve /study/* and legacy /learn/* from the Study_Hub/ folder (prefix remap). */
    if (pathname.indexOf("/study") === 0 || pathname.indexOf("/learn") === 0) {
      var prefix = pathname.indexOf("/study") === 0 ? "/study" : "/learn";
      var studyRel = pathname === prefix || pathname === prefix + "/" ? "/index.html" : pathname.slice(prefix.length);
      return serveFileFromDir(res, STUDY_HUB_DIR, studyRel);
    }

    /* Root / serves Study Hub */
    if (pathname === "/" || pathname === "/index.html") {
      return serveFileFromDir(res, STUDY_HUB_DIR, "/index.html");
    }

    /* Everything else = static files */
    if (method === "GET" || method === "HEAD") {
      return serveStatic(req, res, pathname);
    }
    return sendText(res, 405, "Method not allowed");
  } catch (e) {
    try { sendJSON(res, 500, { error: "Unhandled server error: " + e.message }); }
    catch (ignore) { /* nothing else we can do */ }
  }
});

/* Never let an unexpected error crash the process. */
server.on("error", function (e) {
  /* handled in tryListen for EADDRINUSE; log anything else */
  if (e && e.code !== "EADDRINUSE") {
    console.error("Server error:", e.message);
  }
});
process.on("uncaughtException", function (e) {
  console.error("Uncaught exception (server kept alive):", e && e.message);
});

/* ============================================================
   Start on port 8000, falling back to 8001..8010 if busy
   ============================================================ */
var BASE_PORT = 8000;
var MAX_PORT  = 8010;

function tryListen(port) {
  server.removeAllListeners("error");
  server.on("error", function (e) {
    if (e && e.code === "EADDRINUSE" && port < MAX_PORT) {
      console.log("Port " + port + " is busy, trying " + (port + 1) + "…");
      tryListen(port + 1);
    } else if (e && e.code === "EADDRINUSE") {
      console.error("All ports " + BASE_PORT + "-" + MAX_PORT + " are busy. Close another server window and try again.");
      process.exit(1);
    } else {
      console.error("Server error:", e && e.message);
    }
  });
  server.listen(port, function () {
    var boundUrl = "http://localhost:" + port;
    console.log("");
    console.log("  Claude Certs Study Hub & Exam Center is running at:  " + boundUrl);
    console.log("  Study Hub:    " + boundUrl + "/");
    console.log("  Exam Center:  " + boundUrl + "/exam-center/");
    console.log("");
    console.log("  Keep this window open; close it to stop the server.");
    console.log("");
  });
}

tryListen(BASE_PORT);
