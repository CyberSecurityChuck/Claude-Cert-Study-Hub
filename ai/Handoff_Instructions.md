# Handoff Instructions — Continue From Where You Left Off

AI chats have **no memory** across separate conversations. When you start a new chat (or switch to a
different AI provider), it knows nothing about your progress. These steps let you resume in **under 5
minutes** with any AI (Claude free tier, ChatGPT, Copilot, or an agentic coding tool).

---

## The idea in one sentence

You give the new AI three things — **who it should be** (the system prompt), **where you are** (the
progress tracker), and **what you're studying today** (the relevant knowledge/context file) — and then
you send one short kickoff message.

> **Ready-to-paste prompts now live in `Prompts/`.** Instead of hand-typing the kickoff messages below,
> you can copy them straight from these files (each lists exactly which files to attach):
> - `Prompts/01_First_Chat.md` — your very first session (starts at the Step 0 primer).
> - `Prompts/02_Pause_Session.md` — pause/stop and save your place in the tracker.
> - `Prompts/03_Resume_Chat.md` — continue in a fresh chat from the tracker's "next up".
>
> See `Prompts/00_Index.md` for the full list (section quizzes, logging scores, mock days, generating
> new question sets, and weak-area review).

---

## Step-by-step

### Step 1 — Open a new chat
Open any AI assistant. A fresh, empty conversation is fine.

### Step 2 — Attach/paste files IN THIS ORDER
Order matters. Add them one after another (attach as files if the tool supports it; otherwise copy-paste
the full text of each file into the chat).

1. **`System_Prompt/AI_System_Prompt.md`** — FIRST. This tells the AI to become your patient tutor and
   exam coach and how to behave (teach by domain weight, quiz one question at a time, etc.).
2. **`Context/Progress_Tracker.md`** — SECOND. This tells the AI exactly what you've completed and what's
   next. It is the AI's "source of truth" for resuming.
3. **The relevant knowledge/context file** — THIRD. Attach the file for the topic you're on:
   - Not sure what to study? Attach **`Context/Study_Plan.md`** and let the AI tell you.
   - Learning the exam basics? Attach **`Context/Exam_Overview.md`**.
   - Working through domains? Attach **`Context/Syllabus_and_Domains.md`**.

> If a tool can't read attachments, just paste the file contents directly. The AI only needs the text.

### Step 3 — Send the kickoff message
Copy, edit the date if needed, and send this:

```
Please read my progress tracker (Context/Progress_Tracker.md) that I just gave you.

Today's date is: <FILL IN, e.g. 2026-08-27>.

1. Tell me my current phase, my last completed section, and what's next.
2. Then continue teaching from the "Next up" item.
3. Teach ONE section at a time in simple, beginner-friendly language with examples.
4. After the section, quiz me with 5–10 questions ONE AT A TIME — wait for my answer before the
   next question, then explain why the right answer is right and the others are wrong.

Remember: I'm an expert in cybersecurity / Microsoft 365 but a total beginner to AI and Claude.
```

If you're in **Phase 2 (mock tests, from 2026-09-14)**, use this kickoff instead:

```
Please read my progress tracker. Today's date is <FILL IN>.

I'm in the mock-test phase. Give me a fresh FULL 60-question timed mock exam (mix of multiple choice
and multiple response, distributed across the 5 domains by their weights, 120-minute limit).
Ask ONE question at a time and wait for my answer. Do not reveal answers during the test.
At the end: give my score out of 60, an estimated scaled score (pass is >=720 on 100–1000),
and a PDF-ready question bank with rationales.
```

### Step 4 — Study / take the mock
Answer honestly. Take breaks whenever you need — just say "pause" or "let's continue later."

### Step 5 — Update the progress tracker at the END of every session
Before you close the chat, say:

```
Please give me an updated Progress_Tracker.md block reflecting today's session:
- update current phase / last completed / next up
- tick the checkboxes for sections we finished
- add any checkpoint or mock scores to the score tables
Give it to me as text I can paste into the file.
```

Then **copy the AI's output and paste it into `Context/Progress_Tracker.md`**, replacing the old content.
Save the file. That's it — next time you resume, the new AI reads this updated file and continues
seamlessly.

---

## Exam Center scores & resuming (localStorage)

Quiz and mock **progress/scores are stored by the Exam Center in your browser's `localStorage`** — they
are **NOT saved into any `.md` file** and a fresh AI chat cannot see them. So when resuming:

- The AI should **ask you for your latest Exam Center scores** (or ask you to open `Exam_Center/index.html`
  and read the on-screen progress aloud / paste it).
- The AI should then **record those scores into `Context/Progress_Tracker.md`** (checkpoint scores per
  domain; mock scores with date, X/60, estimated scaled score, pass/fail vs 720) so the `.md` files
  remain the durable source of truth across chats and browsers.

### Adding a brand-new mock for the day
When it's time for a new daily mock, the AI should:
1. Create a new mock data file, e.g. `Exam_Center/data/mocks/mock_02.js` (then `mock_03.js`, …), following
   the authoring contract in `AI_System_Prompt.md` (60 questions, `timeLimitMinutes: 120`, weighted
   16/12/12/11/9 across d1–d5).
2. **Register it** in `Exam_Center/data/manifest.js` by adding `{ id, file, domainKey?, title }` to
   `window.CCAF_MANIFEST.mocks`. If it isn't in the manifest, it won't show in the Exam Center.
3. Tell you to open `Exam_Center/index.html` and take the new mock, then report the score back for the
   tracker.

---

## How the AI should update the tracker (summary for the AI)

- Move completed items from "Next up" to "Last completed"; set a new "Next up".
- Change `[ ]` to `[x]` for finished sub-sections.
- Update the YAML front-matter block at the top so it matches the human-readable sections.
- Append new scores (checkpoint scores per domain; daily mock scores with date, X/60, estimated scaled
  score, and pass/fail vs 720).
- Never delete history — only add and update.

---

## Troubleshooting

- **AI dumped all quiz questions at once** → Reply: *"One question at a time. Wait for my answer before
  the next."*
- **AI forgot who it is / got generic** → Re-paste `AI_System_Prompt.md`.
- **AI seems lost about progress** → Re-paste `Context/Progress_Tracker.md`.
- **Hit a free-tier message limit** → Pause, save the tracker, resume later or on another AI.
- **Info seems outdated** → Ask the AI to point you to the official certification page and recent YouTube
  walkthroughs to confirm.
