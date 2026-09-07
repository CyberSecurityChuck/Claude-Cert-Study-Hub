# 06 — Mock Test Day (Phase 2, from 2026-09-14)

**When to use:** During Phase 2 (daily mock tests, starting 2026-09-14) — your timed, full-length
practice exam for the day.

**Copy-paste prompt:**

```
It's mock-test day (Phase 2). Point me to Exam_Center/index.html → Mock Tests → today's mock (a full
60-question test with a 120-minute timer), and tell me which one to take.

If today's mock doesn't exist yet, AUTHOR a new one: create Exam_Center/data/mocks/mock_NN.js (next
number in sequence) following the exact window.registerQuestionSet authoring contract in
System_Prompt/AI_System_Prompt.md — type "mock", 60 questions, timeLimitMinutes 120, weighted across
the five domains by count 16 / 12 / 12 / 11 / 9 (d1/d2/d3/d4/d5), mixing single and multi-response.
Then REGISTER it in Exam_Center/data/manifest.js under window.CCAF_MANIFEST.mocks and tell me to reload
the Exam Center.

After I take it and report my score, review my weakest domains and tell me what to focus on before the
next mock.
```

**Attach these files:**
- `System_Prompt/AI_System_Prompt.md`
- `Context/Progress_Tracker.md`
- `Exam_Center/data/manifest.js`
- Any `Knowledge/0X_*.md` files for domains you want emphasized
