# 07 — Generate New Questions (quiz or mock)

**When to use:** Any time you want more practice — a brand-new section quiz or a fresh full mock that
plugs straight into the Exam Center.

**Copy-paste prompt:**

```
Please create a new practice set for me and make it appear in my Exam Center. Follow the EXACT
window.registerQuestionSet authoring contract in System_Prompt/AI_System_Prompt.md:

- For a SECTION QUIZ: type "quiz", 10 questions, passPct 70, ~2–3 multi-response questions. Save under
  Exam_Center/data/ (e.g. quiz_domainN.js or a clearly named new file).
- For a MOCK: type "mock", 60 questions, timeLimitMinutes 120, weighted 16 / 12 / 12 / 11 / 9 across
  d1–d5, mixing single and multi. Save under Exam_Center/data/mocks/ (e.g. mock_NN.js).

Give each question a unique id, correct[] indexes, an explanation, and a reference pointing at the
matching Knowledge/0X file (use external: true only for official docs). Then REGISTER the new file in
Exam_Center/data/manifest.js (add { id, file, domainKey?, title } to .quizzes or .mocks). Finally, confirm
it will appear in the Exam Center and tell me to reload Exam_Center/index.html.

(Tell me which set you want: <quiz for domain N> or <a new mock>.)
```

**Attach these files:**
- `System_Prompt/AI_System_Prompt.md`
- `Exam_Center/data/manifest.js`
- The relevant `Knowledge/0X_*.md` file(s) for the topics you want questions on
- (Optional) an existing set like `Exam_Center/data/quiz_domain1.js` or
  `Exam_Center/data/mocks/mock_01.js` as a formatting example
