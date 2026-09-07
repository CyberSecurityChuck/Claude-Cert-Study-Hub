"use strict";
/* ============================================================
   Full Mock #1 — 60 questions (exam-realistic).
   Registered via window.registerQuestionSet (defined by app.js).
   type "mock" enables Prev/Next, palette, timer, and deferred
   scoring (no correctness shown until final Submit).

   Domain distribution (60 total):
     Agentic Architecture & Orchestration        = 16  (q1-q16)
     Claude Code Configuration & Workflows        = 12  (q17-q28)
     Prompt Engineering & Structured Output       = 12  (q29-q40)
     Tool Design & MCP Integration                = 11  (q41-q51)
     Context Management & Reliability             =  9  (q52-q60)
   ============================================================ */
window.registerQuestionSet({
  id: "mock-01",
  type: "mock",
  domain: "All Domains",
  domainKey: "mock",
  title: "Full Mock #1",
  timeLimitMinutes: 120,
  passPct: 70,
  questions: [
    /* ===================================================================
       DOMAIN 1 — Agentic Architecture & Orchestration (16)  q1–q16
       =================================================================== */
    {
      id: "m1-q1",
      type: "single",
      stem: "A security team wants to automate triage of incoming alerts. The workflow is fully predictable: parse the alert, look up an asset, and route it. Which approach is the most appropriate starting point?",
      options: [
        "A fixed, prompt-chained workflow with predefined steps",
        "A fully autonomous agent that decides every step at runtime",
        "A multi-agent swarm with peer negotiation",
        "A single model call with no orchestration at all"
      ],
      correct: [0],
      explanation: "When steps are known and predictable, a structured workflow (e.g., prompt chaining) is more reliable, cheaper, and easier to debug than an autonomous agent. Full autonomy or multi-agent designs add cost and unpredictability that a fixed pipeline doesn't need.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q2",
      type: "single",
      stem: "What is the defining characteristic that distinguishes an 'agent' from a fixed 'workflow' in Anthropic's framing?",
      options: [
        "The agent uses a larger model than the workflow",
        "The agent dynamically directs its own process and tool use to reach a goal",
        "The workflow can call tools but the agent cannot",
        "The agent always runs faster than a workflow"
      ],
      correct: [1],
      explanation: "Agents dynamically decide how to accomplish a goal, choosing steps and tools at runtime, whereas workflows follow predefined code paths. Model size, tool access, and speed are not the distinguishing factors.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q3",
      type: "single",
      stem: "You need to translate a document, then summarize the translation, then extract action items. Each output feeds the next step. Which workflow pattern fits best?",
      options: [
        "Prompt chaining",
        "Routing",
        "Parallelization (voting)",
        "Orchestrator-workers"
      ],
      correct: [0],
      explanation: "Prompt chaining decomposes a task into sequential steps where each step's output is the next step's input — exactly this pipeline. Routing classifies inputs, parallelization runs independent calls, and orchestrator-workers dynamically fans out subtasks.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q4",
      type: "single",
      stem: "Incoming customer messages must be classified as billing, technical, or sales, and each category handled with a specialized prompt. Which pattern is this?",
      options: [
        "Routing",
        "Prompt chaining",
        "Evaluator-optimizer",
        "Autonomous agent loop"
      ],
      correct: [0],
      explanation: "Routing classifies an input and directs it to the specialized prompt or model best suited to handle it. Chaining is sequential steps, evaluator-optimizer iterates on quality, and an autonomous loop is unnecessary for simple classification.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q5",
      type: "multi",
      stem: "Which situations are good candidates for the parallelization pattern? (Select all that apply.)",
      options: [
        "Running the same evaluation multiple times and taking a majority vote for reliability",
        "Splitting a task into independent subtasks that can run simultaneously",
        "A pipeline where each step strictly depends on the previous step's output",
        "Screening content against several independent guardrail checks at once"
      ],
      correct: [0, 1, 3],
      explanation: "Parallelization suits independent subtasks (sectioning) and repeated sampling for voting/reliability, including running multiple guardrail checks concurrently. A strictly sequential, dependency-chained pipeline is the opposite of parallelizable.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q6",
      type: "single",
      stem: "In the orchestrator-workers pattern, what is the orchestrator's primary responsibility?",
      options: [
        "Executing every subtask itself sequentially",
        "Dynamically breaking down a task, delegating subtasks to workers, and synthesizing results",
        "Storing conversation history in a vector database",
        "Rendering the final answer as JSON only"
      ],
      correct: [1],
      explanation: "The orchestrator decomposes the problem, assigns subtasks to worker calls, and combines their outputs. It doesn't do all work itself; storage and output formatting are separate concerns.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q7",
      type: "single",
      stem: "A coding task benefits from generating a solution, critiquing it, and refining based on the critique in a loop until quality is acceptable. Which pattern is this?",
      options: [
        "Evaluator-optimizer",
        "Routing",
        "Parallelization",
        "Prompt chaining with no feedback"
      ],
      correct: [0],
      explanation: "The evaluator-optimizer pattern loops generation and evaluation, using feedback to iteratively improve output — ideal when quality criteria are clear and iteration adds value. The other patterns lack this refinement loop.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q8",
      type: "single",
      stem: "Anthropic recommends which mindset before reaching for a complex agent architecture?",
      options: [
        "Always build the most capable multi-agent system available",
        "Find the simplest solution possible and only add complexity when it demonstrably improves outcomes",
        "Prefer the newest framework regardless of the task",
        "Avoid tools entirely to reduce risk"
      ],
      correct: [1],
      explanation: "The guidance is to start simple and add agentic complexity only when it measurably improves results, because complexity raises cost, latency, and error surface. Framework novelty and blanket rules aren't the deciding factors.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q9",
      type: "multi",
      stem: "An autonomous agent will take actions in a production environment. Which safeguards are appropriate? (Select all that apply.)",
      options: [
        "Human-in-the-loop approval before high-impact or irreversible actions",
        "A stopping condition or maximum number of iterations to prevent runaway loops",
        "Letting the agent run unbounded to preserve autonomy",
        "Testing in a sandbox before granting production access"
      ],
      correct: [0, 1, 3],
      explanation: "Autonomous agents need guardrails: human approval for risky actions, iteration/step limits to avoid runaway loops, and sandbox testing before production. Running unbounded is precisely the risk these controls mitigate.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q10",
      type: "single",
      stem: "What is the core operating pattern of an autonomous agent's runtime loop?",
      options: [
        "It executes a single model call and stops",
        "It observes the environment, decides on an action, acts, then uses the result to inform its next step — repeating until done",
        "It only summarizes text without taking actions",
        "It routes each input to a fixed downstream prompt"
      ],
      correct: [1],
      explanation: "An agent runs a loop of gather-context / take-action / observe-feedback, iterating toward the goal and adapting based on tool results and the environment. A single call, pure summarization, or fixed routing are not the agent loop.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q11",
      type: "single",
      stem: "A team is deciding between a workflow and an agent. Which factor most strongly favors an autonomous agent over a fixed workflow?",
      options: [
        "The task path cannot be predicted in advance and requires flexible, open-ended problem solving",
        "The task is a simple, one-time classification",
        "The team wants the cheapest possible per-request cost",
        "The steps are fully known and never change"
      ],
      correct: [0],
      explanation: "Agents shine when the path to a solution is unpredictable and requires flexibility. Predictable steps, simple classification, or a pure cost-minimization goal all favor a simpler, fixed workflow.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q12",
      type: "single",
      stem: "Which is a genuine trade-off of increasing agent autonomy that architects must weigh?",
      options: [
        "Higher latency and cost, plus greater unpredictability and harder debugging",
        "Guaranteed lower cost and perfectly deterministic behavior",
        "Elimination of the need for any evaluation",
        "Automatic compliance with all security policies"
      ],
      correct: [0],
      explanation: "More autonomy typically means more model calls (higher cost/latency) and less predictable, harder-to-debug behavior. It does not guarantee lower cost, determinism, or automatic policy compliance.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q13",
      type: "multi",
      stem: "Which are recognized building-block workflow patterns for composing LLM applications? (Select all that apply.)",
      options: [
        "Prompt chaining",
        "Routing",
        "Orchestrator-workers",
        "Manual regex post-processing of every token"
      ],
      correct: [0, 1, 2],
      explanation: "Prompt chaining, routing, and orchestrator-workers are established composition patterns (along with parallelization and evaluator-optimizer). Regex post-processing of tokens is not an orchestration pattern.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q14",
      type: "single",
      stem: "A workflow adds a programmatic check after a translation step and, if the check fails, retries with feedback. What is this inline check commonly called?",
      options: [
        "A gate (validation checkpoint) in the chain",
        "A router",
        "A worker",
        "An embedding"
      ],
      correct: [0],
      explanation: "A gate is a programmatic validation checkpoint inserted between chained steps to catch errors early and optionally trigger a retry. Routers classify inputs, workers execute delegated subtasks, and embeddings are vector representations.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q15",
      type: "single",
      stem: "For a customer-facing agent that occasionally must take account-modifying actions, what is the safest orchestration choice for those specific actions?",
      options: [
        "Require explicit human confirmation before executing account modifications",
        "Let the agent auto-execute to reduce latency",
        "Disable logging so the actions are private",
        "Randomly sample which actions to confirm"
      ],
      correct: [0],
      explanation: "High-impact, hard-to-reverse actions should pass through a human-in-the-loop confirmation gate. Auto-executing, disabling logging, or random sampling all increase risk without control.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "m1-q16",
      type: "single",
      stem: "Why is evaluation (evals) considered essential when deploying agentic systems rather than optional?",
      options: [
        "Because agents behave non-deterministically, so measurable evals are needed to detect regressions and verify improvements",
        "Because evals make the model larger",
        "Because evals replace the need for any guardrails",
        "Because evals guarantee the agent will never make mistakes"
      ],
      correct: [0],
      explanation: "Agent behavior varies run to run, so systematic evaluation is how teams measure quality, catch regressions, and confirm that changes actually help. Evals don't change model size, replace guardrails, or guarantee perfection.",
      reference: {
        text: "Knowledge — Agentic Architecture & Orchestration",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },

    /* ===================================================================
       DOMAIN 2 — Claude Code Configuration & Workflows (12)  q17–q28
       =================================================================== */
    {
      id: "m1-q17",
      type: "single",
      stem: "You want project-specific instructions (build commands, conventions, guardrails) that Claude Code automatically loads for everyone on the repo. Where do you put them?",
      options: [
        "A CLAUDE.md file committed at the project root",
        "A comment in a random source file",
        "An environment variable named CLAUDE_PROMPT",
        "The terminal scrollback buffer"
      ],
      correct: [0],
      explanation: "CLAUDE.md is the conventional project memory file Claude Code auto-loads as context, and committing it shares those instructions with the team. Comments, ad-hoc env vars, and scrollback are not loaded as durable project context.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q18",
      type: "single",
      stem: "A developer wants personal Claude Code preferences that apply across all their projects but should NOT be committed to any repo. Which memory location fits?",
      options: [
        "User-level memory in the home directory (~/.claude/CLAUDE.md)",
        "A project-root CLAUDE.md",
        "A .gitignore entry",
        "The README of every repo"
      ],
      correct: [0],
      explanation: "User (global) memory such as ~/.claude/CLAUDE.md applies across all projects for that user and stays out of any repo. A project-root CLAUDE.md is shared and repo-scoped; .gitignore and READMEs are not Claude memory.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q19",
      type: "single",
      stem: "Which statement about permissions in Claude Code best reflects safe default behavior?",
      options: [
        "By default Claude Code asks for approval before potentially destructive actions like editing files or running commands",
        "Claude Code silently executes any command without prompting",
        "Claude Code can only read files and never write",
        "Permissions cannot be configured at all"
      ],
      correct: [0],
      explanation: "Claude Code is designed to request approval before impactful actions (editing files, running commands), and its permissions are configurable and can be scoped. It is not read-only, nor does it act silently by default.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q20",
      type: "multi",
      stem: "Which practices help Claude Code work effectively in a large codebase? (Select all that apply.)",
      options: [
        "Maintaining a clear CLAUDE.md with build/test commands and conventions",
        "Breaking large tasks into smaller, verifiable steps",
        "Giving vague one-line requests with no context and expecting perfect results",
        "Letting Claude run tests to verify its own changes"
      ],
      correct: [0, 1, 3],
      explanation: "Good project memory, task decomposition, and letting Claude verify changes with tests all improve reliability. Vague, context-free prompts reduce quality and increase rework.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q21",
      type: "single",
      stem: "What is the main purpose of Claude Code's /clear command during a long session?",
      options: [
        "To reset the conversation context so accumulated, now-irrelevant history doesn't degrade responses",
        "To permanently delete the repository",
        "To upgrade the model version",
        "To grant unrestricted permissions"
      ],
      correct: [0],
      explanation: "/clear resets the working context, which helps when a session has accumulated stale or irrelevant history that could confuse the model. It doesn't delete repos, change models, or alter permissions.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q22",
      type: "single",
      stem: "A team wants Claude Code to follow a specific test-driven workflow: write failing tests first, then implement until they pass. What is the best way to make this the norm?",
      options: [
        "Document the TDD workflow and commands in CLAUDE.md so Claude follows it consistently",
        "Hope Claude guesses the workflow each time",
        "Rename all files to include 'tdd'",
        "Disable the ability to run tests"
      ],
      correct: [0],
      explanation: "Encoding the desired workflow and commands in CLAUDE.md gives Claude persistent, project-wide guidance to follow the TDD process. Guessing, cosmetic renames, or disabling tests do not establish a reliable workflow.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q23",
      type: "single",
      stem: "Which capability is a defining feature of Claude Code as an 'agentic' coding tool rather than a plain autocomplete?",
      options: [
        "It can read files, run commands, edit code, and iterate across multiple steps to complete a task",
        "It only suggests the next token as you type",
        "It cannot access the file system",
        "It never runs any commands"
      ],
      correct: [0],
      explanation: "Claude Code operates agentically — reading and editing files, executing commands, and iterating toward a goal — which distinguishes it from inline autocomplete. It does interact with the file system and can run commands with permission.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q24",
      type: "multi",
      stem: "A security engineer new to Claude Code wants to reduce risk when letting it operate on a sensitive repo. Which measures are sound? (Select all that apply.)",
      options: [
        "Review proposed diffs before accepting changes",
        "Scope allowed commands/tools to only what the task needs",
        "Run it against untrusted code with full permissions and no review",
        "Use version control so changes can be reverted"
      ],
      correct: [0, 1, 3],
      explanation: "Reviewing diffs, least-privilege tool/command scoping, and relying on version control for reversibility all reduce risk. Granting full permissions on untrusted code with no review is the unsafe option.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q25",
      type: "single",
      stem: "What is a recommended way to give Claude Code precise, verifiable acceptance criteria for a coding task?",
      options: [
        "Provide or ask it to write tests, then have it implement until the tests pass",
        "Tell it to 'make the code better' with no definition",
        "Only describe the feature in a single vague sentence",
        "Forbid it from running anything"
      ],
      correct: [0],
      explanation: "Tests act as concrete, verifiable acceptance criteria; having Claude implement until tests pass produces objective success signals. Vague instructions provide no measurable target.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q26",
      type: "single",
      stem: "When a Claude Code session's context is filling up with a large amount of exploratory output that is no longer relevant, what is a reasonable action?",
      options: [
        "Clear or compact the context and re-anchor Claude on the current goal",
        "Add even more irrelevant files to context",
        "Restart the operating system",
        "Switch to a smaller keyboard"
      ],
      correct: [0],
      explanation: "Clearing/compacting context and restating the current objective keeps the model focused and avoids degradation from stale history. Adding more irrelevant context makes the problem worse.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q27",
      type: "single",
      stem: "Which is the best description of how CLAUDE.md content is used by Claude Code?",
      options: [
        "It is loaded as persistent context/instructions to guide Claude's behavior in that project",
        "It is compiled into an executable binary",
        "It is ignored unless the file is over 1,000 lines",
        "It only affects syntax highlighting"
      ],
      correct: [0],
      explanation: "CLAUDE.md serves as persistent project memory/instructions that shape how Claude Code behaves in the repo. It is not compiled, size-gated, or a formatting-only file.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "m1-q28",
      type: "single",
      stem: "A developer wants Claude Code to plan a complex change before touching any files. What is the most effective approach?",
      options: [
        "Ask it to produce a step-by-step plan first, review it, then approve implementation",
        "Tell it to edit everything immediately without a plan",
        "Delete the repo and start over",
        "Ask it to only rename variables"
      ],
      correct: [0],
      explanation: "Requesting an explicit plan for review before implementation catches mistakes early and keeps the work aligned with intent. Immediate edits without planning increase the chance of wrong or wasted changes.",
      reference: {
        text: "Knowledge — Claude Code Configuration & Workflows",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },

    /* ===================================================================
       DOMAIN 3 — Prompt Engineering & Structured Output (12)  q29–q40
       =================================================================== */
    {
      id: "m1-q29",
      type: "single",
      stem: "According to Anthropic's prompt engineering guidance, what is typically the single most impactful technique to try first?",
      options: [
        "Be clear, direct, and specific about what you want",
        "Always use the maximum temperature",
        "Add as many emojis as possible",
        "Use the shortest possible prompt regardless of clarity"
      ],
      correct: [0],
      explanation: "Clear, direct, specific instructions are the foundational and highest-leverage prompt technique. Temperature extremes, emojis, and forced brevity are not reliable quality levers.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q30",
      type: "single",
      stem: "You need Claude to reliably return machine-parseable output for a downstream program. Which technique most improves reliability?",
      options: [
        "Specify the exact output format (e.g., a JSON schema) and optionally prefill the start of the response",
        "Ask it to 'be creative' about the format",
        "Request the answer in free-form prose only",
        "Increase temperature to encourage variety"
      ],
      correct: [0],
      explanation: "Explicitly specifying the format (such as a JSON schema) and prefilling the assistant response steer Claude toward consistent, parseable output. Creativity, prose, and high temperature all reduce structural reliability.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q31",
      type: "single",
      stem: "Why is providing a few high-quality examples ('few-shot' / multishot prompting) effective?",
      options: [
        "Examples demonstrate the desired format, tone, and reasoning pattern, reducing ambiguity",
        "Examples increase the model's parameter count",
        "Examples disable the model's safety training",
        "Examples are only useful for image generation"
      ],
      correct: [0],
      explanation: "Well-chosen examples show Claude exactly what 'good' looks like — format, style, and edge-case handling — which reduces ambiguity and improves consistency. They don't change model parameters or safety behavior.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q32",
      type: "single",
      stem: "For a complex reasoning task, what does asking Claude to 'think step by step' (chain-of-thought) primarily help with?",
      options: [
        "It gives the model room to reason before answering, improving accuracy on multi-step problems",
        "It guarantees a shorter response",
        "It removes the need for clear instructions",
        "It always reduces token usage"
      ],
      correct: [0],
      explanation: "Encouraging explicit step-by-step reasoning improves performance on complex, multi-step tasks by letting the model work through intermediate steps. It typically increases, not decreases, tokens and does not replace clear instructions.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q33",
      type: "single",
      stem: "What is the recommended role of the system prompt when working with Claude?",
      options: [
        "To assign a role/persona and set high-level behavior, tone, and constraints for the conversation",
        "To store the user's password securely",
        "To hold the final answer the model must copy verbatim",
        "To disable the model's reasoning"
      ],
      correct: [0],
      explanation: "The system prompt is used to set role, context, tone, and behavioral constraints that shape all responses. It is not a secret store, a verbatim answer, or a reasoning switch.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q34",
      type: "multi",
      stem: "Which techniques are recommended for getting more reliable, well-structured output from Claude? (Select all that apply.)",
      options: [
        "Use XML tags to delimit sections of input and requested output",
        "Provide clear, specific instructions and success criteria",
        "Prefill the assistant's response to enforce a starting structure",
        "Leave the format entirely up to the model every time"
      ],
      correct: [0, 1, 2],
      explanation: "XML tags, explicit instructions/success criteria, and response prefilling all improve structure and reliability. Leaving format unconstrained produces inconsistent, harder-to-parse results.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q35",
      type: "single",
      stem: "Why does Anthropic recommend using XML tags (like <document> … </document>) in prompts?",
      options: [
        "They clearly separate distinct parts of the prompt, reducing confusion and improving parsing of instructions vs. data",
        "They are required or the model refuses to respond",
        "They encrypt the prompt content",
        "They double the context window size"
      ],
      correct: [0],
      explanation: "XML tags help Claude distinguish instructions from data and structure inputs/outputs cleanly, reducing ambiguity. They are a helpful convention, not a hard requirement, encryption, or a context-size change.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q36",
      type: "single",
      stem: "A prompt keeps producing output that includes chatty preamble like 'Sure, here is...' before the JSON. What is a clean fix?",
      options: [
        "Prefill the assistant turn with the opening of the JSON (e.g., '{') so it continues from there",
        "Ask it to add more preamble",
        "Set temperature to maximum",
        "Remove all instructions about format"
      ],
      correct: [0],
      explanation: "Prefilling the assistant response with the start of the desired structure (like '{') suppresses preamble and forces the model to continue in-format. The other options would worsen or randomize the output.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q37",
      type: "single",
      stem: "When a first prompt attempt underperforms, what is the recommended iterative practice?",
      options: [
        "Test against representative examples, diagnose failures, and refine the prompt empirically",
        "Assume the model is broken and stop",
        "Randomly reword the prompt without measuring results",
        "Switch programming languages"
      ],
      correct: [0],
      explanation: "Prompt engineering is empirical: evaluate on representative cases, identify failure modes, and iterate systematically. Random rewording without measurement or giving up are not effective strategies.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q38",
      type: "multi",
      stem: "Which are legitimate ways to reduce hallucinations in Claude's answers? (Select all that apply.)",
      options: [
        "Allow the model to say 'I don't know' when it lacks information",
        "Ground responses in provided documents and ask for citations/quotes",
        "Ask for answers with total confidence regardless of evidence",
        "Give the model relevant context/tools rather than expecting recall from memory"
      ],
      correct: [0, 1, 3],
      explanation: "Permitting 'I don't know', grounding answers in supplied sources with citations, and supplying relevant context/tools all curb hallucination. Demanding unconditional confidence encourages fabrication.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q39",
      type: "single",
      stem: "Which prompt is the clearest and most likely to produce the intended result?",
      options: [
        "'Summarize the incident report below in exactly 3 bullet points, each under 20 words, focusing on root cause.'",
        "'Do something with this.'",
        "'Make it good.'",
        "'Handle the text.'"
      ],
      correct: [0],
      explanation: "The first prompt is specific about task, format, length, and focus, giving the model unambiguous success criteria. The others are vague and leave the model guessing.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "m1-q40",
      type: "single",
      stem: "You must guarantee the API returns valid JSON matching a fixed schema for a security pipeline. Beyond describing the schema, which additional safeguard is prudent?",
      options: [
        "Validate the returned JSON against the schema in code and handle/retry on failure",
        "Trust that the output is always perfectly valid and skip validation",
        "Parse it with a language model a second time to 'feel' correct",
        "Store the raw prose and never parse it"
      ],
      correct: [0],
      explanation: "Even with good prompting, defensively validating output against the schema and handling failures ensures pipeline robustness. Blind trust or ad-hoc re-reading undermines reliability.",
      reference: {
        text: "Knowledge — Prompt Engineering & Structured Output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },

    /* ===================================================================
       DOMAIN 4 — Tool Design & MCP Integration (11)  q41–q51
       =================================================================== */
    {
      id: "m1-q41",
      type: "single",
      stem: "What is the Model Context Protocol (MCP) primarily designed to standardize?",
      options: [
        "How AI applications connect to external tools, data sources, and systems through a common protocol",
        "How to fine-tune a model's weights",
        "How to compress images before upload",
        "How to render HTML in a browser"
      ],
      correct: [0],
      explanation: "MCP is an open standard for connecting AI applications to external tools, data, and systems in a consistent way, often likened to a universal connector. It is unrelated to weight fine-tuning, image compression, or HTML rendering.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://modelcontextprotocol.io"
      }
    },
    {
      id: "m1-q42",
      type: "single",
      stem: "In MCP terminology, which component exposes tools, resources, and prompts to an AI application?",
      options: [
        "An MCP server",
        "An MCP client only",
        "A CSS stylesheet",
        "A DNS record"
      ],
      correct: [0],
      explanation: "MCP servers expose capabilities (tools, resources, prompts) that MCP clients/hosts consume. Stylesheets and DNS records are unrelated to the protocol.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://modelcontextprotocol.io"
      }
    },
    {
      id: "m1-q43",
      type: "single",
      stem: "What makes a well-designed tool description most useful to a model choosing whether and how to call it?",
      options: [
        "A clear name, purpose, when-to-use guidance, and precise parameter definitions",
        "A vague name and no parameter documentation",
        "Only the tool's internal source code",
        "A marketing tagline"
      ],
      correct: [0],
      explanation: "Models rely on clear descriptions — purpose, appropriate use, and well-specified parameters — to select and call tools correctly. Vague names, raw source, or marketing copy don't help the model decide.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q44",
      type: "multi",
      stem: "Which are best practices when designing tools for an AI agent? (Select all that apply.)",
      options: [
        "Give tools clear, unambiguous names and descriptions",
        "Define input parameters with types and constraints",
        "Return concise, relevant results rather than dumping huge raw payloads",
        "Overlap many tools with nearly identical purposes to give the model choices"
      ],
      correct: [0, 1, 2],
      explanation: "Clear naming/descriptions, well-typed parameters, and concise relevant outputs all help the model use tools correctly and efficiently. Overlapping, near-duplicate tools cause confusion and poor selection.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q45",
      type: "single",
      stem: "A tool returns a 10,000-line raw log for every call, and the agent's context keeps overflowing. What is the best design fix?",
      options: [
        "Have the tool return only the relevant subset or a summary, with pagination/filtering options",
        "Increase the log to 20,000 lines for completeness",
        "Remove the tool's description",
        "Force the agent to call the tool twice"
      ],
      correct: [0],
      explanation: "Tools should return concise, relevant results — filtering, summarizing, or paginating — to protect the context window and improve reliability. Returning even more data or removing documentation makes things worse.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q46",
      type: "single",
      stem: "Why is MCP often described with the analogy of a 'USB-C port for AI applications'?",
      options: [
        "It provides a standardized interface so many tools/data sources can plug into many AI apps without custom one-off integrations",
        "It physically charges the server",
        "It only works with a single vendor's model",
        "It replaces the need for any authentication"
      ],
      correct: [0],
      explanation: "Like USB-C, MCP is a common connector standard that lets diverse tools and data sources interoperate with diverse AI applications, avoiding bespoke integrations. It isn't vendor-locked and doesn't remove the need for auth.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://modelcontextprotocol.io"
      }
    },
    {
      id: "m1-q47",
      type: "single",
      stem: "When an agent calls a tool, how does the tool's result typically flow in the conversation loop?",
      options: [
        "The result is returned to the model as a tool result, which the model then uses to decide its next step or final answer",
        "The result is discarded and never seen by the model",
        "The result replaces the system prompt permanently",
        "The result is emailed to the user automatically"
      ],
      correct: [0],
      explanation: "Tool results are fed back to the model, which incorporates them to continue reasoning, call more tools, or produce a final answer. Results aren't discarded, don't overwrite the system prompt, and aren't auto-emailed.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q48",
      type: "multi",
      stem: "A security engineer is exposing internal systems to an agent via MCP. Which precautions are appropriate? (Select all that apply.)",
      options: [
        "Apply least-privilege scoping so tools can only do what's necessary",
        "Authenticate and authorize tool/server access",
        "Validate and sanitize tool inputs and outputs",
        "Expose full admin credentials to the model to simplify calls"
      ],
      correct: [0, 1, 2],
      explanation: "Least privilege, proper authN/authZ, and input/output validation are core security controls for tool/MCP integrations. Handing full admin credentials to the model is a serious risk, not a simplification.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://modelcontextprotocol.io"
      }
    },
    {
      id: "m1-q49",
      type: "single",
      stem: "Which parameter design choice most reduces the chance a model calls a tool incorrectly?",
      options: [
        "Use descriptive parameter names, types, enums for constrained values, and mark which are required",
        "Use single-letter parameter names with no types",
        "Accept one giant untyped string blob for all inputs",
        "Hide the parameters from the model"
      ],
      correct: [0],
      explanation: "Descriptive, typed parameters with enums and required flags give the model precise guidance and constrain valid inputs, reducing misuse. Opaque, untyped, or hidden parameters invite errors.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q50",
      type: "single",
      stem: "What is the benefit of MCP being an open protocol rather than each app building custom integrations?",
      options: [
        "Tools built once against MCP can be reused across many compatible AI applications, reducing duplicated integration work",
        "It forces every developer to use the same programming language",
        "It eliminates the need for servers entirely",
        "It makes tools slower by design"
      ],
      correct: [0],
      explanation: "A shared open standard lets a tool or connector built once work across many MCP-compatible hosts, avoiding N×M custom integrations. It doesn't mandate a language, remove servers, or degrade performance.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://modelcontextprotocol.io"
      }
    },
    {
      id: "m1-q51",
      type: "single",
      stem: "An agent has 40 tools available and frequently picks the wrong one. Which change is most likely to help?",
      options: [
        "Reduce and consolidate the tool set, and sharpen each tool's description and when-to-use guidance",
        "Add 40 more tools to give more options",
        "Remove all descriptions so the model 'figures it out'",
        "Randomize tool order on each call"
      ],
      correct: [0],
      explanation: "Too many overlapping tools with fuzzy descriptions degrade selection; consolidating and clarifying descriptions improves accuracy. Adding more tools, removing descriptions, or randomizing order all hurt.",
      reference: {
        text: "Knowledge — Tool Design & MCP Integration",
        href: "../Knowledge/04_Tool_Design_and_MCP_Integration.md",
        external: "https://docs.anthropic.com"
      }
    },

    /* ===================================================================
       DOMAIN 5 — Context Management & Reliability (9)  q52–q60
       =================================================================== */
    {
      id: "m1-q52",
      type: "single",
      stem: "What is the 'context window' in the context of working with Claude?",
      options: [
        "The maximum amount of text (tokens) the model can consider at once, including prompt and generated output",
        "A pop-up dialog in the desktop app",
        "The physical screen resolution",
        "The number of tools installed"
      ],
      correct: [0],
      explanation: "The context window is the token budget the model can attend to at once, spanning the input prompt and the output it generates. It is not a UI dialog, screen setting, or tool count.",
      reference: {
        text: "Knowledge — Context Management & Reliability",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q53",
      type: "multi",
      stem: "A long-running agent conversation is approaching the context window limit. Which strategies help manage it? (Select all that apply.)",
      options: [
        "Summarize or compact earlier turns to preserve key information at lower token cost",
        "Store important state externally and retrieve only what's relevant per step",
        "Keep appending every raw detail indefinitely",
        "Drop stale, no-longer-relevant content from the context"
      ],
      correct: [0, 1, 3],
      explanation: "Summarization/compaction, external state with selective retrieval, and pruning stale content all keep context within budget while retaining what matters. Endlessly appending raw detail leads to overflow and degraded quality.",
      reference: {
        text: "Knowledge — Context Management & Reliability",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q54",
      type: "single",
      stem: "Why can stuffing a very large, mostly-irrelevant amount of text into the context sometimes hurt answer quality?",
      options: [
        "Relevant signals can get diluted or lost among noise, and the model may attend to the wrong details",
        "It always makes the model faster and better",
        "The model automatically ignores everything after the first word",
        "Large context guarantees zero hallucinations"
      ],
      correct: [0],
      explanation: "Irrelevant filler can dilute the signal and distract the model, reducing accuracy even when the window can technically hold it. More context is not automatically better and does not guarantee no hallucinations.",
      reference: {
        text: "Knowledge — Context Management & Reliability",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q55",
      type: "single",
      stem: "Which approach best supplies an agent with up-to-date, relevant knowledge without permanently bloating its context?",
      options: [
        "Retrieval: fetch only the relevant documents/snippets at query time and include those",
        "Paste the entire knowledge base into every prompt",
        "Retrain the model on each request",
        "Never provide any external information"
      ],
      correct: [0],
      explanation: "Retrieval brings in just the relevant pieces per query, keeping context lean and current. Pasting everything wastes context, per-request retraining is impractical, and providing nothing leaves the model uninformed.",
      reference: {
        text: "Knowledge — Context Management & Reliability",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q56",
      type: "multi",
      stem: "Which practices improve the reliability of an AI system in production? (Select all that apply.)",
      options: [
        "Systematic evaluation (evals) to catch regressions before and after changes",
        "Guardrails and validation on inputs and outputs",
        "Graceful error handling and retries for tool/model failures",
        "Deploying changes directly to production with no testing"
      ],
      correct: [0, 1, 2],
      explanation: "Evals, input/output guardrails, and robust error handling/retries all strengthen production reliability. Pushing untested changes straight to production undermines it.",
      reference: {
        text: "Knowledge — Context Management & Reliability",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q57",
      type: "single",
      stem: "An agent must survive interruptions and resume a multi-step task later. What design choice supports this?",
      options: [
        "Persist key state and progress externally so the agent can recover and continue",
        "Keep all state only in volatile in-memory context that is lost on restart",
        "Never record what step it is on",
        "Restart the entire task from scratch every time with no memory"
      ],
      correct: [0],
      explanation: "Persisting critical state and progress externally lets an agent recover after interruptions and continue where it left off. Volatile-only state or no progress tracking forces fragile, wasteful restarts.",
      reference: {
        text: "Knowledge — Context Management & Reliability",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q58",
      type: "single",
      stem: "What is the purpose of a guardrail that checks the model's output before it is shown to a user or acted upon?",
      options: [
        "To catch unsafe, off-policy, or malformed responses and block or correct them before impact",
        "To increase the model's token limit",
        "To speed up the network connection",
        "To translate the output into binary"
      ],
      correct: [0],
      explanation: "Output guardrails validate responses against safety/policy/format rules and intercept problems before they reach users or trigger actions. They don't change token limits, network speed, or encoding.",
      reference: {
        text: "Knowledge — Context Management & Reliability",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q59",
      type: "single",
      stem: "Which is the best reason to keep a running summary of a long conversation instead of the full transcript?",
      options: [
        "It preserves the essential information at far lower token cost, freeing context for current work",
        "It makes the model forget the task entirely",
        "It permanently deletes all history from disk",
        "It is required for the model to respond at all"
      ],
      correct: [0],
      explanation: "A compact running summary retains key facts and decisions while using far fewer tokens, leaving room for current context. It doesn't erase the task, wipe disk storage, or serve as a hard requirement for responding.",
      reference: {
        text: "Knowledge — Context Management & Reliability",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "m1-q60",
      type: "single",
      stem: "A security team wants confidence that a prompt or agent change didn't degrade behavior. What is the most rigorous approach?",
      options: [
        "Run the change against a curated eval set with defined success criteria and compare results to baseline",
        "Rely on a single manual spot-check and ship it",
        "Assume newer prompts are always better",
        "Measure only response length"
      ],
      correct: [0],
      explanation: "Evaluating against a curated test set with clear success criteria and comparing to a baseline gives rigorous, repeatable evidence of improvement or regression. Single spot-checks, assumptions, or length metrics are unreliable proxies.",
      reference: {
        text: "Knowledge — Context Management & Reliability",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    }
  ]
});
