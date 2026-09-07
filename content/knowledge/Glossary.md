# Glossary — Key AI/Claude Terms for Beginners

> **Audience:** senior cybersecurity engineer, brand new to AI. Terms are alphabetized. Each has 1–2 plain-English sentences, plus a tiny example or security analogy where it helps.
> **How to use:** skim before each study file; come back whenever you hit a word you're unsure about.

---

**Agent** — An LLM put in a loop with tools so it can take multiple steps on its own to reach a goal. *Like a SOAR playbook that keeps acting until an incident is handled.*

**Agent loop** — The repeating cycle an agent runs: perceive → reason → act → observe, until the goal is met. *Similar to the OODA loop.*

**Agentic** — Describes a system that behaves like an agent (multi-step, tool-using, self-directed), as opposed to a single one-shot answer.

**AgentDefinition** — The per-subagent configuration (description, system prompt, tool restrictions) that defines a subagent type. *A role/job description with scoped permissions.*

**allowedTools** — Configuration listing which tools an agent is permitted to use; must include "Task" to spawn subagents. *A least-privilege allow-list.*

**API (Application Programming Interface)** — A defined way for programs to talk to each other. *The Claude API lets your code send prompts and get answers.*

**Backoff** — Waiting longer between retries after failures, so you don't hammer a struggling service. *Same idea as retrying a flaky log source with increasing delays.*

**Chain-of-thought (CoT)** — Asking the model to reason step by step before giving its final answer, which improves accuracy on logic. *Like requiring an analyst to show their investigation steps, not just the verdict.*

**Chunking** — Splitting a large document into smaller pieces that each fit the context window, then processing them. *Rolling a huge log into manageable segments.*

**Claim-source mapping** — A structured link between each stated claim and its supporting source/excerpt that synthesis must preserve. *Citations linking a statement to evidence.*

**CLAUDE.md** — A Markdown file in a project that Claude Code automatically reads as standing instructions/memory. *Like a baseline policy the assistant always follows here.*

**Claude Code** — Anthropic's agentic coding tool that runs in the terminal/IDE, reads your project, edits files, and runs commands with your approval. *(Paid product.)*

**Case facts block** — A persistent block of extracted transactional facts (amounts, dates, IDs, statuses) re-included in each prompt so summarization doesn't lose them. *A pinned case-notes sheet.*

**.claude/rules/** — A directory of topic-specific rule files with YAML frontmatter `paths:`/`globs:` so rules load only when editing matching files. *Path-scoped firewall rules.*

**/compact** — A Claude Code command that reduces context usage during long sessions. *Compressing/rotating logs to save space.*

**Confidence calibration** — Tuning field-level confidence thresholds using labeled validation sets to route low-confidence cases to human review. *Tuning an alert threshold against known-good/bad data.*

**Context / context window** — The total amount of text (in tokens) the model can consider in one call, including instructions, data, conversation, and its answer. *A fixed-size log buffer: once full, old text rolls off.*

**context: fork** — Skill frontmatter that runs the skill in an isolated sub-agent context, good for verbose/exploratory output. *Running a noisy job in a sandbox.*

**Coordinator (hub-and-spoke)** — The lead agent that decomposes tasks, decides which subagents to invoke, routes all communication, and aggregates results; subagents run with isolated context. *Incident commander coordinating specialists.*

**custom_id** — An identifier that correlates each batch request with its response and pinpoints which items to resubmit on failure. *A ticket/correlation ID.*

**Custom command (custom slash command)** — A reusable prompt/workflow you save and trigger by name in tools like Claude Code. *A saved playbook you run on demand.*

**Diff** — The line-by-line "before vs. after" of a file change; you review diffs before accepting agent edits.

**Embedding** — A numeric representation of text that captures its meaning, used to find similar text. *The math behind "retrieve the relevant chunk" in RAG.*

**Evaluation (eval)** — A repeatable test measuring whether model outputs are good, run over a set of example inputs. *Your regression test suite for prompts/detection rules.*

**Eval set** — The collection of representative inputs and expected outputs used to run evaluations. *Known-good and known-bad samples.*

**Fallback** — A backup path used when the primary approach fails (cached data, a simpler model). *Failover to a secondary system.*

**fork_session** — Creating an independent branch of a session from a shared baseline to explore divergent approaches. *Branching a repo to try an approach without touching main.*

**Few-shot prompting** — Including a few worked input→output examples in the prompt so the model copies the pattern. *Giving an analyst labeled sample alerts before triage.* (**Zero-shot** = no examples; **one-shot** = one.)

**Function calling** — Another name for tool use: the model requests a function with inputs, your code runs it, and the result is returned to the model.

**Grounding** — Tying answers to real provided sources so the model isn't guessing. *Attaching the log lines to the incident report.*

**Guardrail** — A rule or filter that limits what the model can do or say. *Allow-lists, content filters, a WAF.*

**Hallucination** — A confident but false model output (invented facts, fake citations). *An analyst writing from memory and getting it wrong.*

**Hook (Agent SDK)** — Code that intercepts the agent's tool activity; `PostToolUse` transforms/normalizes tool RESULTS before the model sees them, and tool-call interception can BLOCK an outgoing tool call to enforce compliance. *A WAF/pre-commit hook that inspects and can block traffic.*

**HTTP transport (MCP)** — Reaching a remote MCP server over the network via HTTP (often streaming). *Contrast with local stdio.*

**Human-in-the-loop (HITL)** — A checkpoint where a person must approve or correct the agent before it continues, especially for risky actions. *Change-approval / break-glass sign-off.*

**Inference** — One request-and-answer round-trip to the model; also the general act of the model producing output.

**isError (MCP)** — The MCP flag marking a tool response as an error, ideally with structured metadata (category, retryable). *A non-zero exit status with an error class.*

**Isolated context** — Subagents do NOT automatically inherit the coordinator's conversation history; context must be passed explicitly in the prompt. *Need-to-know compartmentalization.*

**JSON** — A common structured data format of keys and values; often the target for machine-readable model output. *e.g. `{"severity":"high"}`.*

**Latency** — The delay before you get an answer; more steps/agents = higher latency. *Response time on a query.*

**LLM (Large Language Model)** — A model trained to predict text; you give it words and it returns words. *An extremely well-read assistant with no memory of past chats.*

**LLM-as-judge** — Using another model to grade outputs against a rubric during evals. *An automated reviewer.*

**Lost in the middle** — The effect where models reliably use info at the beginning and end of long inputs but may miss content in the middle. *Skimming a long report and missing the middle pages.*

**Manifest (state persistence)** — A known-location record of exported agent state a coordinator loads to recover after a crash. *A checkpoint/restore point.*

**MCP (Model Context Protocol)** — An open standard for connecting AI apps to external tools and data through one common "plug." *Like USB-C, or a standard API gateway, for AI tools.*

**MCP client** — The AI application side that connects out to MCP servers to use their tools/data. *e.g. Claude Code.*

**MCP server** — The side that exposes tools/data/actions over MCP (a database, filesystem, ticketing API). *A wrapper around a capability.*

**MCP resource** — An MCP mechanism for exposing content catalogs (vs tools which perform actions), reducing exploratory tool calls. *A read-only catalog/share.*

**.mcp.json** — Project-scoped MCP server config (shared via version control) supporting environment-variable expansion like `${GITHUB_TOKEN}`; user-scoped servers live in `~/.claude.json`. *Committed team config vs a personal dotfile.*

**Message Batches API** — An API for non-blocking, latency-tolerant bulk jobs: ~50% cheaper, up to a 24-hour window, no latency SLA, no multi-turn tool calling; uses `custom_id` to correlate. *A scheduled overnight batch scan vs a real-time query.*

**Memory** — Persistence of information across turns/sessions, which you must engineer because the model itself is stateless (files, databases, re-sent context). *Handing the analyst the case notes each session.*

**Multi-agent** — A setup with more than one agent working together (peers, or delegator + workers).

**Orchestration** — How you arrange one or more LLM calls/agents to get work done (chaining, routing, parallelizing, delegating).

**Orchestrator–worker** — A pattern where a lead agent splits a task and delegates pieces to worker subagents, then combines results. *Incident commander directing specialists.*

**Parallelization** — Running multiple calls at the same time (to split work or to vote for reliability), cutting wall-clock time.

**Plan mode** — A Claude Code mode for complex/multi-file/architectural work that explores and designs before making changes, vs direct execution for simple scoped changes. *Planning a change window before touching production.*

**PostToolUse** — A hook that fires after a tool runs to normalize/transform its result (e.g., unify timestamp formats). *A log normalizer.*

**Prefilling** — Starting the model's answer for it (e.g., an opening `{`) so it continues in your desired format. *A form pre-opened to the right field.*

**Provenance** — The source attribution (URLs, document names, dates) of a claim, which can be lost during summarization and must be preserved via claim-source mappings. *Chain of custody for evidence.*

**Prompt** — The text instruction you send the model. *Like a precisely written ticket or a detection rule.*

**Prompt chaining** — Breaking a task into fixed ordered steps where each step's output feeds the next. *A fixed runbook.*

**Prompt engineering** — The skill of writing prompts that reliably produce the result you want.

**Prompt injection** — Malicious hidden instructions inside data the model reads, trying to hijack it into misusing tools or leaking data. *The AI version of a confused-deputy / stored-injection attack.*

**RAG (Retrieval-Augmented Generation)** — Retrieving relevant documents first, then having the model answer from them, to stay current and reduce hallucination. *Pulling the exact case files before writing the answer.*

**Retry** — Trying a failed operation again, often with backoff. *Re-running a flaky command.*

**Role prompting** — Telling the model who to be ("You are a senior pen-tester...") so its tone and expertise fit the job.

**Routing** — Classifying a request first, then sending it to the right specialized handler. *A SIEM rule tagging and routing an alert.*

**Schema** — A formal description of data shape (fields and types), used for tool inputs and structured output. *A form definition.*

**Scratchpad file** — An external file where an agent persists key findings across context boundaries in long sessions. *Investigator's running notebook.*

**Single-shot (one-shot prompt / zero-shot task)** — Asking once and getting one answer with no looping or tools. *Run one command, read the output.* (Note: "one-shot"/"zero-shot" also describe example count in few-shot prompting — context tells you which meaning.)

**SKILL.md** — The file defining a Claude Code skill, with frontmatter like `context: fork`, `allowed-tools`, and `argument-hint`. *A runbook with scoped permissions.*

**Slash command** — A `/`-prefixed shortcut that triggers a built-in action in a tool like Claude Code.

**Stateless** — Having no built-in memory between calls; the model only knows what's in the current context window.

**stdio transport (MCP)** — Talking to a local MCP server running as a subprocess over standard input/output streams. *Contrast with HTTP/remote.*

**stop_reason** — The field the Agent SDK returns that drives the agent loop; "tool_use" means run the requested tool and continue, "end_turn" means the model is done. *A process exit code telling your script whether to keep looping or stop.*

**Stratified sampling** — Sampling across segments (e.g., document types) to measure true error rates that an aggregate metric can hide. *Sampling each network segment, not just the busiest.*

**Structured error response** — An error that includes category (transient/validation/business/permission) and an `isRetryable` flag so callers can recover intelligently. *Typed exceptions vs a generic failure.*

**Structured output** — Model output in a strict machine-readable format (usually JSON) instead of free prose. *Normalizing events into a schema for downstream tools.*

**Subagent** — A separate, focused agent spawned to handle one sub-task with its own context, then report back. *Delegating a lookup to a specialist.*

**System prompt** — A special top-level instruction setting the model's persona, rules, and boundaries for the whole conversation. *The policy/charter.*

**Task decomposition** — Breaking a big goal into smaller doable steps.

**Task tool** — The Agent SDK mechanism a coordinator uses to spawn a subagent; "Task" must be in the agent's `allowedTools`. *An incident commander paging a specialist team.*

**Temperature** — A setting controlling randomness: low (near 0) = focused/consistent/factual; high = creative/varied. *Keep it low for security/factual work.*

**Token** — The small unit of text the model reads/writes, ~¾ of a word; cost and limits are measured in tokens. *~750 words ≈ 1,000 tokens.*

**Tool** — A function the model is allowed to call to fetch data or act (search, read a file, query a DB). *An approved lookup or script for the analyst.*

**tool_choice** — API setting controlling tool calling: "auto" (model decides), "any" (must call some tool), or forced `{"type":"tool","name":"..."}` to require a specific tool. *Optional vs mandatory step in a playbook.*

**Tool use** — The mechanism by which the model requests a tool, your code runs it, and the result returns to the model. *(Same as function calling.)*

**tool_use** — Using a tool call with a JSON schema as the most reliable way to get schema-compliant structured output. *A form with required fields.*

**Transport (MCP)** — The communication pipe between MCP client and server (stdio for local, HTTP for remote).

**Validation** — Checking that inputs/outputs match the expected format/values before trusting them. *Schema validation on ingested events.*

**Vector store** — A database of embeddings that finds text most similar to a query; the "retrieve" engine behind RAG.

**Zero-shot** — Prompting with no examples, relying on clear instructions alone. *(One-shot = one example; few-shot = a few.)*

**@import** — CLAUDE.md syntax that references external files to keep configuration modular. *Include/import in a config file.*

**--resume** — CLI option to continue a named session by name. *Reattaching to a saved investigation.*

---

## Verify latest
Definitions here are simplified for learning. For authoritative, current details check:
- **Anthropic / Claude docs:** docs.anthropic.com and docs.claude.com.
- **MCP docs:** modelcontextprotocol.io.
- **Anthropic "Building effective agents"** guidance (for agent/orchestration terms).

---

## ✅ Check your understanding
When you've reviewed the glossary, tell your tutor AI. **It will ask 5–10 multiple-choice questions, one at a time**, mixing definitions across all domains (e.g., "which term means…?" or "which of these is an example of prompt injection?"). One at a time, with feedback after each — a great warm-up before the domain quizzes.
