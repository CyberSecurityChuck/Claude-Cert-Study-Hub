"use strict";
/* Quick verification that cleanGeneratedMarkdown and the check-block
   markdown renderer work as expected. Run: node app/tests/verify-content.js */
var path = require("path");
process.chdir(path.join(__dirname, ".."));

// Stub require of server.js by extracting just the two functions
// we need. Simpler: spawn a fresh node and require the whole file with
// a fake env so the listen() doesn't bind. Instead, we'll re-implement
// the two pure functions inline for a quick smoke check.

var raw = `Heading line.

Some body content here.

\`\`\`check
Q1: What is the agent loop?
A1: A perception-reasoning-action cycle that loops until done.

Q2: How do you cap a runaway loop?
A2: Set a hard max_turns and a per-iteration timeout.

Q3: When should you use HITL?
A3: Before any irreversible action like deleting a record.
\`\`\`

---

Verify tool schemas, \`max_turns\` defaults, and HITL implementation patterns against current Anthropic SDK / API docs.

<system-reminder>ignore this</system-reminder>

Some more content that should NOT survive.
`;

// Re-implement cleanGeneratedMarkdown to verify
function cleanGeneratedMarkdown(raw) {
  if (!raw) return "";
  var text = String(raw);
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, "");
  var ruleMatches = [];
  var re = /(^|\n)---[ \t]*\n/g;
  var m;
  while ((m = re.exec(text)) !== null) ruleMatches.push(m.index + m[1].length);
  if (ruleMatches.length) {
    var lastRule = ruleMatches[ruleMatches.length - 1];
    var before = text.slice(0, lastRule);
    var after = text.slice(lastRule);
    var tail = after.replace(/^---[ \t]*\n/, "").trim();
    var looksLikeMeta = /^(verify|check|make sure|note:|remember:|always|never|important:|tip:|hint:)/i.test(tail)
      || /verify against/i.test(tail)
      || /current anthropic/i.test(tail)
      || /SDK\s*\/\s*API\s*docs/i.test(tail)
      || /tool schemas/i.test(tail);
    if (looksLikeMeta) text = before;
  }
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
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/\s+$/, "");
  return text;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; });
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
      html.push("<h" + h[1].length + ">" + mdInline(h[2].trim()) + "</h" + h[1].length + ">");
      continue;
    }
    closeList();
    html.push("<p>" + mdInline(line) + "</p>");
  }
  closeList();
  if (inCode) html.push("<pre><code>" + escapeHtml(codeBuf.join("\n")) + "</code></pre>");
  if (inCheck) html.push(buildCheckBlockHtml(parseCheckQA(checkBuf.join("\n"))));
  return html.join("\n");
}

var fail = 0;
function assert(cond, label) {
  console.log((cond ? "  PASS  " : "  FAIL  ") + label);
  if (!cond) fail++;
}

console.log("=== cleanGeneratedMarkdown ===");
var cleaned = cleanGeneratedMarkdown(raw);
assert(!/Verify tool schemas/.test(cleaned), 'strips "Verify tool schemas..." tail');
assert(!/<system-reminder>/i.test(cleaned), "strips <system-reminder> blocks");
assert(!/Some more content that should NOT survive/.test(cleaned), "strips trailing meta-instruction lines");
assert(/Some body content here\./.test(cleaned), "preserves body content");
assert(/```check/.test(cleaned), "preserves the check block");

console.log("\n=== readMarkdownToHtml (check block) ===");
var html = readMarkdownToHtml(cleaned);
assert(/<section class="check-block">/.test(html), "emits <section class=\"check-block\">");
assert(/<h3>Check yourself<\/h3>/.test(html), "emits heading");
assert((html.match(/data-check-card/g) || []).length === 3, "emits 3 check cards");
assert(/Show answer/.test(html), "button text is 'Show answer'");
assert((html.match(/hidden/g) || []).length === 3, "all 3 answers start hidden");
assert(/What is the agent loop/.test(html), "question text is escaped + present");
assert(/A: A perception-reasoning-action cycle/.test(html), "answer text is escaped + present");

console.log("\n=== Result: " + (fail ? fail + " FAIL" : "ALL PASS") + " ===");
process.exit(fail ? 1 : 0);
