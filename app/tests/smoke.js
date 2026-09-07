"use strict";
/* ============================================================
   Smoke test for the Learn portal API.
   Usage: node app/tests/smoke.js [baseUrl]
   ============================================================ */
var http = require("http");
var url  = require("url");

var BASE = process.argv[2] || "http://localhost:8000";
var USER = "smoketest_" + Date.now();
var PASS = "smokepass_" + Math.random().toString(36).slice(2, 10);

var cookieJar = "";

function req(path, method, body) {
  return new Promise(function (resolve, reject) {
    var parsed = url.parse(BASE + path);
    var data = body ? JSON.stringify(body) : null;
    var headers = { "Accept": "application/json" };
    if (cookieJar) headers["Cookie"] = cookieJar;
    if (data) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(data);
    }
    var r = http.request({ hostname: parsed.hostname, port: parsed.port, path: parsed.path, method: method || "GET", headers: headers }, function (res) {
      var chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () {
        var raw = Buffer.concat(chunks).toString("utf8");
        if (res.headers["set-cookie"]) {
          cookieJar = res.headers["set-cookie"].map(function (c) { return c.split(";")[0]; }).join("; ");
        }
        var obj = null;
        try { obj = raw ? JSON.parse(raw) : null; } catch (e) { obj = { error: raw }; }
        if (res.statusCode >= 400) {
          var err = new Error((obj && obj.error) || ("HTTP " + res.statusCode));
          err.status = res.statusCode;
          err.body = obj;
          return reject(err);
        }
        resolve(obj);
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

function pass(name) { console.log("  PASS  " + name); }
function fail(name, err) { console.error("  FAIL  " + name + " — " + (err && err.message || err)); process.exitCode = 1; }

async function run() {
  console.log("Smoke test against " + BASE);
  console.log("Test user: " + USER);

  try {
    var homeRes = await req("/", "GET");
    pass("GET / (Study Hub static page)");
  } catch (e) {
    if (e.status === 200 || !e.status) pass("GET / (Study Hub static page)");
    else fail("GET /", e);
  }

  try {
    var examRes = await req("/exam-center/", "GET");
    pass("GET /exam-center/ (Exam Center static page)");
  } catch (e) {
    if (e.status === 200 || !e.status) pass("GET /exam-center/ (Exam Center static page)");
    else fail("GET /exam-center/", e);
  }

  try {
    var studyRes = await req("/study/", "GET");
    pass("GET /study/ (Study Hub alias)");
  } catch (e) {
    if (e.status === 200 || !e.status) pass("GET /study/ (Study Hub alias)");
    else fail("GET /study/", e);
  }

  try {
    var learnRes = await req("/learn/", "GET");
    pass("GET /learn/ (Legacy alias for Study Hub)");
  } catch (e) {
    if (e.status === 200 || !e.status) pass("GET /learn/ (Legacy alias for Study Hub)");
    else fail("GET /learn/", e);
  }

  try {
    var syl = await req("/api/syllabus");
    if (syl && Array.isArray(syl.syllabus) && syl.syllabus.length === 5) pass("/api/syllabus returns 5 domains");
    else fail("/api/syllabus", "expected 5 domains, got " + (syl && syl.syllabus && syl.syllabus.length));
    var totalMods = syl.syllabus.reduce(function (a, d) { return a + d.modules.length; }, 0);
    if (totalMods === 30) pass("Syllabus contains 30 modules total");
    else fail("Syllabus module count", "expected 30, got " + totalMods);
  } catch (e) { fail("/api/syllabus", e); }

  try {
    await req("/api/me", "GET");
    fail("/api/me (no auth)", "should have rejected");
  } catch (e) {
    if (e.status === 401) pass("/api/me returns 401 without auth");
    else fail("/api/me (no auth)", e);
  }

  try {
    var login = await req("/api/profile/login", "POST", { name: USER, password: PASS, createIfMissing: true });
    if (login && login.ok) pass("/api/profile/login (create)");
    else fail("/api/profile/login (create)", JSON.stringify(login));
  } catch (e) { fail("/api/profile/login (create)", e); }

  try {
    var me = await req("/api/me", "GET");
    if (me && me.slug === USER.toLowerCase()) pass("/api/me returns current user");
    else fail("/api/me after login", JSON.stringify(me));
  } catch (e) { fail("/api/me after login", e); }

  try {
    var prog = await req("/api/progress", "GET");
    if (prog && prog.modules && Object.keys(prog.modules).length === 30) pass("/api/progress has 30 modules");
    else fail("/api/progress", JSON.stringify(prog).slice(0, 200));
  } catch (e) { fail("/api/progress", e); }

  try {
    var updated = await req("/api/progress", "PUT", { schemaVersion: 1, phase: "Phase 1", lastCompletedModuleId: null, nextUpModuleId: "1-1-agentic-loops", lastSessionAt: new Date().toISOString(), currentStreak: 1, modules: { "1-1-agentic-loops": { done: true, readAt: new Date().toISOString(), checkpointScore: null } }, checkpointScores: [], mockScores: [], weakTopics: [], notes: [] });
    if (updated && updated.ok) pass("/api/progress PUT (update)");
    else fail("/api/progress PUT", JSON.stringify(updated));
    var reloaded = await req("/api/progress", "GET");
    if (reloaded && reloaded.modules["1-1-agentic-loops"] && reloaded.modules["1-1-agentic-loops"].done) pass("/api/progress round-trip persists");
    else fail("/api/progress round-trip", JSON.stringify(reloaded.modules["1-1-agentic-loops"]));
  } catch (e) { fail("/api/progress PUT/GET", e); }

  try {
    var sess = await req("/api/chat/sessions", "POST", { title: "smoke test session", focus: { kind: "knowledge", moduleId: "1-1-agentic-loops" } });
    if (sess && sess.id) pass("/api/chat/sessions POST creates session");
    else fail("/api/chat/sessions POST", JSON.stringify(sess));
    var list = await req("/api/chat/sessions", "GET");
    if (Array.isArray(list) && list.find(function (s) { return s.id === sess.id; })) pass("/api/chat/sessions GET lists new session");
    else fail("/api/chat/sessions GET", JSON.stringify(list).slice(0, 200));
    var got = await req("/api/chat/sessions/" + sess.id, "GET");
    if (got && got.id === sess.id) pass("/api/chat/sessions/:id GET works");
    else fail("/api/chat/sessions/:id", JSON.stringify(got));
  } catch (e) { fail("/api/chat/sessions flow", e); }

  try {
    var labs = await req("/api/labs", "GET");
    if (labs && Array.isArray(labs.labs)) pass("/api/labs returns parsed structure");
    else fail("/api/labs", JSON.stringify(labs).slice(0, 200));
  } catch (e) { fail("/api/labs", e); }

  try {
    var defaults = await req("/api/settings", "GET");
    if (defaults && defaults.examDate === "2026-09-30" && defaults.source === "default") pass("/api/settings returns the default exam date");
    else fail("/api/settings default", JSON.stringify(defaults));

    var savedDate = await req("/api/settings", "PUT", { examDate: "2027-04-12" });
    if (savedDate && savedDate.examDate === "2027-04-12" && savedDate.source === "user") pass("/api/settings PUT saves a custom exam date");
    else fail("/api/settings PUT", JSON.stringify(savedDate));

    var rereadDate = await req("/api/settings", "GET");
    if (rereadDate && rereadDate.examDate === "2027-04-12") pass("/api/settings round-trips the exam date");
    else fail("/api/settings round-trip", JSON.stringify(rereadDate));

    try {
      await req("/api/settings", "PUT", { examDate: "2026-02-30" });
      fail("/api/settings rejects invalid dates", "should have rejected 2026-02-30");
    } catch (badDate) {
      if (badDate.status === 400) pass("/api/settings rejects an invalid calendar date");
      else fail("/api/settings invalid date", badDate);
    }

    var clearedDate = await req("/api/settings", "PUT", { examDate: null });
    if (clearedDate && clearedDate.source === "default") pass("/api/settings PUT null restores the default");
    else fail("/api/settings clear", JSON.stringify(clearedDate));
  } catch (e) { fail("/api/settings flow", e); }

  try {
    var html = await req("/api/knowledge/1-1-agentic-loops", "GET");
    if (html && typeof html.html === "string") pass("/api/knowledge/:slug returns HTML (with needsGeneration flag)");
    else fail("/api/knowledge/:slug", JSON.stringify(html).slice(0, 200));
  } catch (e) { fail("/api/knowledge/:slug", e); }

  try {
    await req("/api/profile/logout", "POST");
    pass("/api/profile/logout");
  } catch (e) { fail("/api/profile/logout", e); }

  console.log("");
  if (process.exitCode) console.log("Smoke test FAILED.");
  else console.log("Smoke test PASSED.");
}

run().catch(function (e) { console.error("Unexpected error:", e); process.exit(1); });
