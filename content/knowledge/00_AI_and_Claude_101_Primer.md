# 00 — AI & Claude 101: Your Step 0 Primer

> **What this is:** A gentle, plain-English warm-up to read **before** the five exam-domain files
> (`01`–`05`). If you can chat with Copilot or ChatGPT, you already have the basics — this file just
> connects the dots and gives you the mental model everything else builds on.
>
> **Who this is for:** You — a Senior Cybersecurity Engineer and M365 expert who has never used Claude.
> No AI background assumed. Free Claude.ai tier is all you need.
>
> **No quiz here.** This is the warm-up. The real exam prep (and the quizzes) live in files `01`–`05`.

---

## 0. How to read this file

Read it once, top to bottom (about 15 minutes). Don't memorize — the goal is a *mental model*, not
facts. Every idea below comes with a **plain definition**, a **tiny example**, and often a
**cybersecurity analogy** so it lands in language you already speak.

---

## 1. What is AI, machine learning, and an LLM? (plain terms)

Three words that get thrown around interchangeably. They're actually nested, like folders inside folders:

```
+-------------------------------------------------------------+
|  Artificial Intelligence (AI)                               |
|  = software that does tasks we'd call "smart"               |
|                                                             |
|   +-----------------------------------------------------+   |
|   |  Machine Learning (ML)                              |   |
|   |  = software that LEARNS patterns from examples,     |   |
|   |    instead of being hand-coded rule by rule         |   |
|   |                                                     |   |
|   |    +---------------------------------------------+  |   |
|   |    |  Large Language Model (LLM)                 |  |   |
|   |    |  = an ML model trained on huge amounts of   |  |   |
|   |    |    text to predict and generate language    |  |   |
|   |    +---------------------------------------------+  |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
```

- **AI (Artificial Intelligence):** the broad umbrella — any software that mimics "smart" behavior.
- **Machine Learning (ML):** a *way of building* AI where the software **learns from examples** rather
  than following rules a human wrote by hand.
- **Large Language Model (LLM):** a *specific kind* of ML model trained on an enormous amount of text so
  it's very good at understanding and producing human language. Claude is an LLM.

> **Cyber analogy:** Old-school antivirus used **signatures** — hand-written rules: "if the file looks
> exactly like *this*, it's malware." That's the rule-by-rule approach. Modern behavior-based / ML
> detection instead **learns** what malicious behavior looks like from thousands of examples and
> generalizes to new threats. LLMs are that second style, applied to language.

---

## 2. What "generative AI" means, and how a chat model predicts text

**Generative AI** = AI that **creates new content** (text, code, images) rather than just classifying or
labeling existing content. A spam filter says "spam / not spam" — that's *not* generative. Claude
writing you a paragraph *is* generative.

### How does it actually produce text? (gentle, no math)

An LLM is, at heart, a very sophisticated **"predict the next piece of text"** engine.

- Text is broken into **tokens** — small chunks (a word, part of a word, or punctuation). Roughly, one
  token ≈ ¾ of a word in English.
- Given everything so far, the model predicts the **most fitting next token**, adds it, then repeats —
  one token at a time — until the answer is complete.

```
Input tokens:      [ "The" ] [ "firewall" ] [ "blocks" ] [ "the" ] ...
                                     |
                                     v
                          +--------------------+
                          |   The LLM (Claude) |
                          +--------------------+
                                     |
                                     v
Next token guess:  [ "traffic" ]   <- highest-scoring continuation
                    (then repeat, token by token, to build the reply)
```

That's it. There's no lookup of a "correct answer" in a database — it's generating a fluent,
*probable* continuation. This one fact explains a lot of later behavior (including why it can be
confidently wrong — see §6).

> **Cyber analogy:** Think of predictive text / autocomplete on your phone, but vastly more capable —
> aware of the whole conversation, not just the last word.

---

## 3. What Claude is (and who makes it)

- **Claude** is an LLM-based AI assistant you talk to in a chat window.
- It's made by **Anthropic**, an AI safety company. Anthropic emphasizes building AI that is
  **helpful, honest, and harmless**.
- **Model families / tiers (high level):** Anthropic releases Claude in **families** (successive
  generations) and, within a generation, different **sizes/tiers** — smaller/faster ones for quick
  everyday tasks and larger/more-capable ones for hard reasoning. You do **not** need to memorize the
  exact model names for this warm-up; just hold the idea: *"there are lighter and heavier Claude models,
  and newer generations replace older ones."* The exam-domain files go deeper where it matters.
- **There is a free tier.** You can use Claude at **claude.ai** for free (with usage limits). That is
  100% enough for all of your studying.

> **Cyber analogy:** Like editions of a security product — a "Standard" vs "Advanced" SKU, and a new
> major version each year. Same idea: pick the tier that fits the job; newer generations supersede older.

---

## 4. Prompts, responses, system prompts, and context

This is the core loop of every AI chat:

```
   YOU                         CLAUDE
    |                            |
    |  prompt  ----------------> |
    |  (your message)            |  reads the whole conversation
    |                            |  so far (= "context")
    |                            |
    | <---------------- response |
    |                   (its reply)
    v                            v
        ... and you go again, back and forth
```

- **Prompt:** what **you** type/send — your question, instruction, or request. "Explain OAuth like I'm
  new to it."
- **Response:** what **Claude** sends back.
- **System prompt:** a special, behind-the-scenes instruction that sets the AI's **role, rules, and tone
  for the whole chat** — *before* your first message. It's like a job description you hand the assistant.
  This study kit literally gives you one to paste in: `System_Prompt/AI_System_Prompt.md` turns any AI
  into your patient tutor + exam coach.
- **Context:** everything the model can "see" **right now** — the system prompt, plus the back-and-forth
  so far in this conversation, plus anything you pasted/attached. The model uses all of it to craft the
  next reply. Start a *brand-new* chat and that context is gone (which is exactly why this kit uses a
  Progress Tracker to reload where you were).

> **Cyber analogy:** A **system prompt** is like a **Group Policy / baseline configuration** applied at
> logon — it sets the rules of engagement before the user does anything. **Context** is the running
> **session state**; close the session and it resets.

---

## 5. Beginner vocabulary quick-hits

One line each. For fuller definitions, see **`Knowledge/Glossary.md`** (same folder).

- **Prompt** — the message you send to the AI.
- **Model** — the AI "brain" (e.g., Claude) that generates responses.
- **Token** — a small chunk of text (≈ ¾ of a word) the model reads and writes in.
- **Context window** — the maximum amount of text (in tokens) the model can consider at once;
  its "working memory."
- **Hallucination** — when the model states something **plausible but false**, confidently.
- **Temperature** — a setting for **randomness/creativity**: low = focused and predictable,
  high = more varied and creative.

> Don't worry about mastering these now — you'll meet each one again, in depth, in the domain files.
> **`Glossary.md`** is your always-available cheat sheet.

---

## 6. What Claude can and can't do (and why verification matters)

**Claude is great at:**
- Explaining concepts in plain language, at your level.
- Drafting, summarizing, rewriting, and translating text.
- Writing and reviewing code and configs.
- Brainstorming, structuring ideas, and quizzing you (like your tutor role here).

**Claude struggles with / can't reliably do:**
- **Facts it wasn't trained on or that changed recently** — it doesn't automatically know today's news
  or your private systems.
- **Exact math, counting, and precise citations** — it can slip.
- **Knowing what it doesn't know** — this is the big one:

### Confidently wrong: hallucinations

Because the model **generates a *probable* continuation** (§2) rather than looking up a verified fact,
it will sometimes produce a wrong answer **in a completely confident tone** — invented "facts," fake
citations, plausible-but-nonexistent commands. This is called a **hallucination**.

> **Cyber analogy — this is your superpower here:** You already live by *"never trust, always verify."*
> Treat every AI answer like an **unauthenticated input**: useful, but **validate before you act on it**,
> especially for exam facts, security guidance, commands, and anything you'd run in production. A
> confident tone is **not** evidence of correctness.

**Practical rule:** For anything that matters, cross-check Claude against an authoritative source. For
this cert, that means the official exam page and the verified facts already captured in
`Context/Exam_Overview.md`.

---

## 7. Responsible & safe use (beginner level)

A few habits that keep you safe and get better results:

- **Don't paste secrets.** No passwords, API keys, tokens, customer data, or anything under NDA into a
  chat. (Same discipline you already apply to logs and tickets.)
- **Verify before acting** — see §6. Especially for security advice and anything you'd run.
- **Keep a human in the loop** for decisions with real consequences. AI assists; you decide.
- **Mind privacy & policy** — follow your employer's (Insight's) rules on what may go into external AI
  tools.
- **Be aware of bias and gaps** — models reflect their training data; they can be incomplete or skewed.

> **Cyber analogy:** Same **least-privilege, need-to-know, verify-then-trust** instincts you already use
> at work — just pointed at an AI chat.

---

## 8. How to actually get started on free Claude.ai (high level)

You only need three steps to send your first prompt:

1. Go to **claude.ai** and **sign in / sign up** (free tier is fine).
2. **Start a new chat.**
3. **Type a prompt** and hit send — e.g., *"Explain what a large language model is, like I'm brand new
   to AI."*

That's the whole loop from §4: prompt → response → repeat.

> **Step-by-step with screenshots-style detail lives in `Labs/Hands_On_Labs.md` → Lab 0
> (Getting Started).** Do that lab right after this primer.

---

## 9. How this fits the certification

This primer builds the **mental model**. It is intentionally *not* exam-syllabus-heavy — think of it as
learning the vocabulary and the "shape" of AI before you study the real material.

- **This file (`00`)** = the warm-up. No quiz.
- **`Knowledge/01`–`05`** = the **actual exam prep**, aligned to the five official domains and their
  weights. That's where the depth, the detail, and the quizzes are.

```
  YOU ARE HERE
      |
   [ 00 Primer ]  ->  [ 01 Agentic Architecture ]  ->  [ 02 Claude Code ]
   (mental model)          (27%)                          (20%)
                            |                               |
                            +--> [ 03 Prompt Engineering (20%) ]
                            +--> [ 04 Tool Design & MCP (18%) ]
                            +--> [ 05 Context & Reliability (15%) ]
```

---

## ✅ You're ready for Domain 1

You now know, in plain terms: what AI/ML/LLMs are, what generative AI is and how it predicts text,
what Claude is and that there's a free tier, the prompt/response/system-prompt/context loop, the key
vocabulary, why Claude can be confidently wrong (and why *you* verify), safe-use basics, and how to
start on claude.ai.

**Next steps:**
1. If you haven't yet, do **`Labs/Hands_On_Labs.md` → Lab 0** to send your first real prompt.
2. Then open **`Knowledge/01_Agentic_Architecture_and_Orchestration.md`** — that's Domain 1, the
   biggest domain (27%), and the real work begins there.

*(Reminder: no quiz for this primer — it's just the warm-up. The first checkpoint quiz is in Domain 1.)*
