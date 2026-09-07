---
# ===== MACHINE-READABLE STATE (agents parse this) =====
# Keep this YAML in sync with the human-readable sections below.
exam: "Claude Certified Architect - Foundations"
deadline: "2026-09-30"
mock_phase_start: "2026-09-14"
passing_scaled_score: 720
scaled_scale: "100-1000"
current_phase: "Phase 1 - Foundations Learning"   # or "Phase 2 - Daily Mock Tests"
last_completed_section: "none (just started)"
next_up: "Setup day: read README + Exam_Overview, confirm exam eligibility, open free Claude.ai"
last_session_date: "none"
domains:
  - id: 1
    name: "Agentic Architecture & Orchestration"
    weight: 27
    status: "not_started"        # not_started | in_progress | complete
    subsections:
      - name: "What is an agent? Agentic vs single-shot"
        done: false
      - name: "Multi-step workflows: planning, loops, stopping conditions"
        done: false
      - name: "Single-agent vs multi-agent, orchestration, failure/cost trade-offs"
        done: false
      - name: "Domain 1 mixed review"
        done: false
  - id: 2
    name: "Claude Code Configuration & Workflows"
    weight: 20
    status: "not_started"
    subsections:
      - name: "Intro + configuration basics"
        done: false
      - name: "Workflows, permissions, best practices"
        done: false
      - name: "Domain 2 mixed review"
        done: false
  - id: 3
    name: "Prompt Engineering & Structured Output"
    weight: 20
    status: "not_started"
    subsections:
      - name: "Clear prompts, roles, context, examples"
        done: false
      - name: "Step-by-step reasoning, few-shot, system prompts"
        done: false
      - name: "Structured output (JSON/schemas), reducing errors"
        done: false
      - name: "Domain 3 mixed review"
        done: false
  - id: 4
    name: "Tool Design & MCP Integration"
    weight: 18
    status: "not_started"
    subsections:
      - name: "What tools are; designing good tools"
        done: false
      - name: "What MCP is; integration, errors, safety"
        done: false
      - name: "Domain 4 mixed review"
        done: false
  - id: 5
    name: "Context Management & Reliability"
    weight: 15
    status: "not_started"
    subsections:
      - name: "Context windows, summarizing, retrieval"
        done: false
      - name: "Reliability, guardrails, evaluation, cost"
        done: false
      - name: "Domain 5 mixed review"
        done: false
checkpoint_scores: []   # e.g. { domain: 1, section: "...", score: "8/10", date: "2026-08-26" }
mock_scores: []         # e.g. { date: "2026-09-14", raw: "41/60", scaled_est: 705, pass: false }
# ===== END MACHINE-READABLE STATE =====
---

# Progress Tracker (Living State File)

> **This file is the single source of truth for "where am I?"** Any AI reads it to resume, and updates
> it at the end of each session. See update instructions at the bottom.

## ▶ Current status (read this first)

- **Current phase:** Phase 1 – Foundations Learning
- **Last completed section:** none (just started)
- **Next up:** Setup day — read `README.md` + `Context/Exam_Overview.md`, **confirm exam eligibility /
  partner email**, and open the free Claude.ai to try a first chat.
- **Last session date:** none

---

## Status legend

| Symbol | Meaning |
|:------:|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| ⭐ | Needs more review (weak area) |

---

## Domain & sub-section checklist (all unchecked initially)

### Domain 1 — Agentic Architecture & Orchestration (27%)
- [ ] What is an agent? Agentic vs single-shot
- [ ] Multi-step workflows: planning, loops, stopping conditions
- [ ] Single-agent vs multi-agent, orchestration, failure/cost trade-offs
- [ ] Domain 1 mixed review

### Domain 2 — Claude Code Configuration & Workflows (20%)
- [ ] Intro + configuration basics
- [ ] Workflows, permissions, best practices
- [ ] Domain 2 mixed review

### Domain 3 — Prompt Engineering & Structured Output (20%)
- [ ] Clear prompts, roles, context, examples
- [ ] Step-by-step reasoning, few-shot, system prompts
- [ ] Structured output (JSON/schemas), reducing errors
- [ ] Domain 3 mixed review

### Domain 4 — Tool Design & MCP Integration (18%)
- [ ] What tools are; designing good tools
- [ ] What MCP is; integration, errors, safety
- [ ] Domain 4 mixed review

### Domain 5 — Context Management & Reliability (15%)
- [ ] Context windows, summarizing, retrieval
- [ ] Reliability, guardrails, evaluation, cost
- [ ] Domain 5 mixed review

### Final prep
- [ ] All-domain review quiz (Sep 13)

---

## MCQ checkpoint scores (Phase 1)

Record your 5–10 question checkpoint results here. Aim for consistently 80%+ before moving on.

| Date | Domain | Section | Score | Notes / weak spots |
|------|--------|---------|:-----:|--------------------|
| _(none yet)_ | | | | |

---

## Daily mock-test scores (Phase 2, from Sep 14)

Pass estimate = scaled score **≥ 720**. Scaled score is an **estimate** only.

| Date | Mock # | Raw score (/60) | Estimated scaled | Pass? (≥720) | Weakest domain(s) |
|------|:------:|:---------------:|:----------------:|:------------:|-------------------|
| _(none yet)_ | | | | | |

---

## Notes & reminders (free text)

- _Confirm exam eligibility / partner-domain email early (see Exam_Overview.md caveat)._
- _Re-verify price, availability, and format on the official page before exam day._
- _I take breaks — resuming after a gap is normal. Just re-read this file._

---

## 🔧 How the AI should update this file after each session

At the END of every session, update this file (give the human the new text to paste in), preserving
history:

1. **Update the "Current status" block:** move the finished item into "Last completed section," set a new
   "Next up," and set "Last session date" to today.
2. **Tick checkboxes:** change `[ ]` → `[x]` for sub-sections completed this session (use `[~]` if partly
   done, add ⭐ if it's a weak area to revisit).
3. **Add checkpoint scores:** append a row to the MCQ checkpoint table (date, domain, section, score,
   weak spots).
4. **Add mock scores (Phase 2):** append a row to the mock-test table (date, mock #, raw /60, estimated
   scaled score, pass?, weakest domains).
5. **Update the YAML front-matter at the very top** so it matches everything above:
   `current_phase`, `last_completed_section`, `next_up`, `last_session_date`, each domain's `status` and
   `subsections[].done`, and append to `checkpoint_scores` / `mock_scores`.
6. **Never delete history** — only add and update. Keep YAML and the human-readable sections consistent.
