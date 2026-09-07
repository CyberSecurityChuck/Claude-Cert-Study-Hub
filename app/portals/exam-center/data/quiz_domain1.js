"use strict";
/* ============================================================
   Section Quiz — Domain 1: Agentic Architecture & Orchestration
   10 exam-style questions. Registered via
   window.registerQuestionSet (defined by app.js before injection).
   ============================================================ */
window.registerQuestionSet({
  id: "quiz-d1",
  type: "quiz",
  domain: "Agentic Architecture & Orchestration",
  domainKey: "d1",
  title: "Section Quiz — Agentic Architecture & Orchestration",
  passPct: 70,
  questions: [
    {
      id: "d1-q1",
      type: "single",
      stem: "In the core agent loop, an agent repeatedly cycles through a set of stages until it decides the task is done. Which sequence best describes that loop?",
      options: [
        "Compile → deploy → monitor",
        "Perceive/gather context → reason/plan → act (call a tool), then observe the result and repeat",
        "Prompt → fine-tune → evaluate",
        "Cache → retrieve → summarize"
      ],
      correct: [1],
      explanation: "An agent gathers context, reasons about the next step, acts (e.g., calls a tool), observes the result, and loops until done. The other options describe software delivery, model training, or caching — not the reason-act-observe cycle.",
      reference: {
        text: "Knowledge — The agent loop",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "d1-q2",
      type: "multi",
      stem: "You are deciding between a single-shot LLM call and an agentic (looping, tool-using) approach. Which are good reasons to prefer an AGENTIC design? (Select all that apply.)",
      options: [
        "The task is multi-step and later actions depend on results of earlier tool calls",
        "The problem is fully solved by one deterministic transformation with no external data needed",
        "The path to the answer is open-ended and must adapt to what is discovered along the way",
        "The task benefits from calling external tools/APIs and reacting to their responses"
      ],
      correct: [0, 2, 3],
      explanation: "Agentic designs suit multi-step, path-dependent, open-ended work that reacts to tool feedback. A single deterministic transformation with no external data is better served by a plain single-shot call — an agent loop there only adds cost and latency.",
      reference: {
        text: "Knowledge — Agentic vs single-shot",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "d1-q3",
      type: "single",
      stem: "A workflow sends the model's output through a fixed series of steps, where each step's output is the next step's input (e.g., outline → draft → polish). Which orchestration pattern is this?",
      options: [
        "Routing",
        "Prompt chaining",
        "Parallelization",
        "Evaluator-optimizer"
      ],
      correct: [1],
      explanation: "Prompt chaining decomposes a task into fixed sequential steps that each build on the prior output. Routing classifies input to pick a path, parallelization runs work concurrently, and evaluator-optimizer loops a generator against a critic.",
      reference: {
        text: "Knowledge — Orchestration patterns",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "d1-q4",
      type: "single",
      stem: "A support system first classifies each incoming message (billing, technical, or refund) and then sends it to a prompt or flow specialized for that category. Which pattern does this describe?",
      options: [
        "Routing",
        "Orchestrator-worker",
        "Prompt chaining",
        "Evaluator-optimizer"
      ],
      correct: [0],
      explanation: "Routing classifies an input and directs it to the most appropriate specialized handler. Orchestrator-worker dynamically breaks a task into subtasks for workers; chaining is a fixed sequence; evaluator-optimizer iterates on quality.",
      reference: {
        text: "Knowledge — Routing",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "d1-q5",
      type: "single",
      stem: "A central 'orchestrator' model breaks a large task into subtasks at runtime, hands each to a worker (subagent), and then synthesizes their results. What is a key advantage of this orchestrator-worker pattern?",
      options: [
        "It guarantees the lowest possible token cost of any pattern",
        "It removes the need for any tool calls",
        "It handles tasks whose subtasks are not known in advance and can be tackled somewhat independently",
        "It makes outputs fully deterministic"
      ],
      correct: [2],
      explanation: "Orchestrator-worker suits complex tasks where the subtasks can't be predefined and are decided dynamically. It typically increases token cost (more calls), does not eliminate tools, and does not make LLM output deterministic.",
      reference: {
        text: "Knowledge — Orchestrator-worker / subagents",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "d1-q6",
      type: "single",
      stem: "You run three independent checks on a document (safety, formatting, factuality) at the same time and combine the results. Which pattern is this an example of?",
      options: [
        "Prompt chaining",
        "Parallelization",
        "Routing",
        "Human-in-the-loop"
      ],
      correct: [1],
      explanation: "Parallelization runs independent subtasks concurrently (sectioning) or gathers multiple votes, then aggregates. Chaining is sequential, routing picks one path, and human-in-the-loop inserts a person for approval.",
      reference: {
        text: "Knowledge — Parallelization",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "d1-q7",
      type: "multi",
      stem: "Your agent can take irreversible actions (deleting records, sending money). Which guardrails are appropriate for a human-in-the-loop design? (Select all that apply.)",
      options: [
        "Require human approval before executing high-risk or irreversible actions",
        "Give the agent unrestricted permissions so it never gets blocked",
        "Set limits such as maximum steps/iterations or a spending cap to prevent runaway loops",
        "Validate tool inputs and outputs before acting on them"
      ],
      correct: [0, 2, 3],
      explanation: "Approvals for risky actions, step/spend limits, and input/output validation are core guardrails. Granting unrestricted permissions violates least privilege and increases the blast radius of mistakes.",
      reference: {
        text: "Knowledge — Human-in-the-loop & guardrails",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "d1-q8",
      type: "single",
      stem: "An agent tries to call an external API and receives a transient 503 (service unavailable) error. What is the most robust way to handle this failure?",
      options: [
        "Immediately stop the whole task and return an error to the user",
        "Silently ignore the error and pretend the call succeeded",
        "Retry with backoff and, if it keeps failing, fall back or surface a clear error the agent can reason about",
        "Retry the same call in a tight infinite loop until it succeeds"
      ],
      correct: [2],
      explanation: "Transient failures should be retried with backoff, with a fallback or clear error if they persist so the agent can adapt. Ignoring errors corrupts state, immediate hard-stopping is brittle, and tight infinite retries can hang and rack up cost.",
      reference: {
        text: "Knowledge — Failure/retry handling",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md"
      }
    },
    {
      id: "d1-q9",
      type: "single",
      stem: "Before acting, an agent breaks a broad goal ('plan a launch') into a list of smaller ordered steps. What is this practice called?",
      options: [
        "Fine-tuning",
        "Task decomposition / planning",
        "Tokenization",
        "Quantization"
      ],
      correct: [1],
      explanation: "Planning / task decomposition splits a complex goal into manageable, ordered subtasks the agent can execute and track. Fine-tuning, tokenization, and quantization relate to training and model internals, not runtime planning.",
      reference: {
        text: "Knowledge — Planning & task decomposition",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    },
    {
      id: "d1-q10",
      type: "single",
      stem: "Guidance on building effective agents recommends which principle when choosing a design?",
      options: [
        "Always use the most complex multi-agent system available",
        "Start with the simplest solution that works and add agentic complexity only when it clearly improves outcomes",
        "Avoid tools entirely to reduce cost",
        "Never allow any human review because it slows the system down"
      ],
      correct: [1],
      explanation: "The recommended approach is to prefer the simplest effective solution and add agentic complexity only when it demonstrably helps, because agents add cost and latency. Always maximizing complexity, banning tools, or removing all human review are anti-patterns.",
      reference: {
        text: "Knowledge — Cost & latency considerations",
        href: "../Knowledge/01_Agentic_Architecture_and_Orchestration.md",
        external: "https://www.anthropic.com/engineering/building-effective-agents"
      }
    }
  ]
});
