# 04 — Section Quiz (a section just ended)

**When to use:** You just finished a section/domain and want to test yourself.

**Copy-paste prompt:**

```
I just finished a section. Please:

1. Confirm the section is complete and briefly recap the key points.
2. Direct me to open Exam_Center/index.html → Quizzes → the matching domain quiz, and tell me which one
   to pick.
3. If that quiz doesn't exist yet, AUTHOR it: 10 questions, type "quiz", passPct 70, include ~2–3
   multi-response questions, following the exact window.registerQuestionSet authoring contract in
   System_Prompt/AI_System_Prompt.md. Save it under Exam_Center/data/ (e.g. quiz_domainN.js) and REGISTER
   it in Exam_Center/data/manifest.js under window.CCAF_MANIFEST.quizzes so it appears in the Exam Center.
   Point reference.href at the matching Knowledge/0X file. Then tell me to reload the Exam Center.
```

**Attach these files:**
- `System_Prompt/AI_System_Prompt.md`
- `Context/Progress_Tracker.md`
- `Exam_Center/data/manifest.js`
- The matching `Knowledge/0X_*.md` file for the section you finished
