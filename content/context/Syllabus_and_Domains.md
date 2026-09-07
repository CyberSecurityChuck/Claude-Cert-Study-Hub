# Syllabus & Domains — What the Exam Tests

The exam covers **5 domains** (topic areas). Each domain has a **weight** — the rough percentage of the
60 questions that come from it. Below they are listed **in weight order (heaviest first)**, with a
plain-English description and the kinds of sub-skills to expect.

> **Beginner note:** Some terms below are AI jargon. Each is defined in one short line. Don't worry if
> they feel foreign now — your tutor AI (see `System_Prompt/AI_System_Prompt.md`) will teach each one
> from scratch, in order.

---

## Domain 1 — Agentic Architecture & Orchestration — **27%** (biggest)

**What it means:** An **"agent"** is an AI that can take **multiple steps on its own** to reach a goal —
it can think, use tools, check results, and try again — instead of just answering once.
**"Orchestration"** is coordinating those steps (and sometimes multiple agents) so they work together
reliably.

**Cybersecurity analogy:** Think of a SOAR playbook that chains several automated actions and decisions,
versus a single one-off alert lookup.

**Sub-skills to expect:**
- When to use an **agentic** design (multi-step, tool-using) vs a **single-shot** call (one prompt, one
  answer).
- Designing multi-step workflows: planning, looping, retrying, stopping conditions.
- Single-agent vs multi-agent designs; how agents hand off work.
- Handling failures, loops that never end, and cost/latency trade-offs in agent designs.
- Deciding what the agent is allowed to do (scope and guardrails).

---

## Domain 2 — Claude Code Configuration & Workflows — **20%**

**What it means:** **Claude Code** is Anthropic's tool for using Claude to help with software/engineering
tasks in a coding-style workflow. This domain is about **setting it up and using it effectively**.

**Cybersecurity analogy:** Like configuring and tuning a security tool (rules, integrations, permissions)
so it fits your environment and workflow.

**Sub-skills to expect:**
- Configuring Claude Code and its settings for a project.
- Common workflows and best practices for getting good, reliable results.
- Managing permissions and what the tool is allowed to touch.
- Integrating Claude Code into a repeatable engineering process.

---

## Domain 3 — Prompt Engineering & Structured Output — **20%**

**What it means:** **Prompt engineering** = writing your instructions to the AI clearly so you get good,
consistent results. **Structured output** = making the AI return data in a fixed, machine-readable shape
(like JSON) instead of free-form text.

**Cybersecurity analogy:** Like writing a precise KQL query and forcing the results into a fixed schema
so a downstream automation can parse them.

**Sub-skills to expect:**
- Writing clear, unambiguous prompts; giving context, roles, and examples.
- Techniques like step-by-step reasoning, few-shot examples, and system prompts.
- Getting reliable **structured output** (e.g., valid JSON matching a schema).
- Reducing errors, ambiguity, and unwanted variation in responses.

---

## Domain 4 — Tool Design & MCP Integration — **18%**

**What it means:** **"Tools"** let the AI do things beyond text — call an API, look something up, run an
action. **MCP (Model Context Protocol)** is an open standard for connecting AI models to tools and data
sources in a consistent way.

**Cybersecurity analogy:** Tools are like the connectors/APIs your security platform uses to reach other
systems; MCP is like a common integration standard so everything plugs in the same way.

**Sub-skills to expect:**
- Designing good tools: clear names, inputs, outputs, and descriptions the AI can understand.
- What **MCP** is and how it connects Claude to external tools/data.
- Choosing what to expose as a tool and how to keep it safe and reliable.
- Handling tool errors and results within a workflow.

---

## Domain 5 — Context Management & Reliability — **15%** (smallest)

**What it means:** The **"context window"** is how much text/information the AI can consider at once (its
short-term memory for a request). **Context management** is using that space wisely. **Reliability** is
making the whole system behave consistently and safely.

**Cybersecurity analogy:** Like log retention/window limits — you can only keep so much "in view," so you
must decide what to keep, summarize, or drop.

**Sub-skills to expect:**
- Working within context-window limits; summarizing, chunking, and retrieving relevant info.
- Keeping long or multi-step interactions coherent.
- Improving reliability, safety, and responsible deployment (guardrails, evaluation).
- Measuring quality/cost and avoiding failures at scale.

---

## How to prioritize study time by weight

Spend your time **in proportion to the weights** — the exam does. A simple guide for a ~40-hour study
budget:

| Domain | Weight | Suggested time (of 40h) |
|--------|:------:|:-----------------------:|
| Agentic Architecture & Orchestration | 27% | ~11 hours |
| Claude Code Configuration & Workflows | 20% | ~8 hours |
| Prompt Engineering & Structured Output | 20% | ~8 hours |
| Tool Design & MCP Integration | 18% | ~7 hours |
| Context Management & Reliability | 15% | ~6 hours |

**Rules of thumb:**
- **Start with Domain 1** (Agentic Architecture) — it's the largest and underpins the others.
- Don't skip the smaller domains entirely — even 15% is ~9 questions, easily the difference between pass
  and fail.
- After a mock test, **re-allocate time toward your weakest domains**, regardless of weight.
