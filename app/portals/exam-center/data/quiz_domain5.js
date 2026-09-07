"use strict";
/* ============================================================
   Section Quiz — Domain 5: Context Management & Reliability
   10 exam-style questions. Registered via
   window.registerQuestionSet (defined by app.js before injection).
   ============================================================ */
window.registerQuestionSet({
  id: "quiz-d5",
  type: "quiz",
  domain: "Context Management & Reliability",
  domainKey: "d5",
  title: "Section Quiz — Context Management & Reliability",
  passPct: 70,
  questions: [
    {
      id: "d5-q1",
      type: "single",
      stem: "What is the context window of a language model?",
      options: [
        "The maximum amount of text (measured in tokens) the model can consider at once, including input and output",
        "The physical monitor resolution used to display results",
        "The number of users allowed to query the model simultaneously",
        "The time in seconds before a request times out"
      ],
      correct: [0],
      explanation: "The context window is the token budget the model can attend to at once, spanning the prompt and its response. It has nothing to do with screen resolution, concurrency, or timeouts.",
      reference: {
        text: "Knowledge — Context window & tokens",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "d5-q2",
      type: "single",
      stem: "Roughly, what is a token?",
      options: [
        "A chunk of text (often a word piece) that the model reads and generates; text is split into tokens",
        "A single pixel in an image",
        "A user's login session identifier",
        "One complete sentence, always"
      ],
      correct: [0],
      explanation: "A token is a piece of text (often a word or sub-word) — models process and count text in tokens. It is not a pixel, a session ID, or always a full sentence.",
      reference: {
        text: "Knowledge — Context window & tokens",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "d5-q3",
      type: "multi",
      stem: "Your conversation or document exceeds the context window. Which strategies help manage limited context? (Select all that apply.)",
      options: [
        "Summarize earlier turns and carry the summary forward",
        "Chunk large inputs and process them in parts",
        "Retrieve only the most relevant passages (RAG) instead of pasting everything",
        "Paste the entire corpus into every request regardless of size"
      ],
      correct: [0, 1, 2],
      explanation: "Summarization, chunking, and retrieval (RAG) all keep the working context within limits while preserving what matters. Pasting the entire corpus every time wastes tokens and can overflow the window.",
      reference: {
        text: "Knowledge — Managing limited context",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "d5-q4",
      type: "single",
      stem: "What problem does retrieval-augmented generation (RAG) primarily address?",
      options: [
        "It grounds responses in relevant external documents fetched at query time, rather than relying only on the model's memorized knowledge",
        "It permanently increases the model's parameter count",
        "It removes the need for any prompt",
        "It guarantees the model can never be wrong"
      ],
      correct: [0],
      explanation: "RAG retrieves relevant documents at query time and supplies them as context, grounding answers in current, specific data. It does not change model size, remove prompting, or guarantee correctness.",
      reference: {
        text: "Knowledge — Retrieval / RAG",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "d5-q5",
      type: "single",
      stem: "How does a stateless model 'remember' earlier turns of a conversation?",
      options: [
        "It has permanent built-in memory of every past chat automatically",
        "Relevant prior context (history or a summary) is passed back into the prompt on each turn",
        "It stores memories inside its model weights during the chat",
        "It cannot use any prior context under any circumstances"
      ],
      correct: [1],
      explanation: "Memory across turns is achieved by re-supplying prior history (or a summary of it) in each request, since the model itself is stateless per call. It does not auto-remember past chats or write to its weights mid-conversation.",
      reference: {
        text: "Knowledge — Memory across turns",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "d5-q6",
      type: "multi",
      stem: "Which techniques help reduce hallucinations and keep answers grounded? (Select all that apply.)",
      options: [
        "Provide authoritative source material and ask the model to cite or quote it",
        "Allow the model to say 'I don't know' when the context lacks the answer",
        "Ask the model to invent plausible-sounding details to fill gaps",
        "Verify factual claims against the provided sources"
      ],
      correct: [0, 1, 3],
      explanation: "Grounding in cited sources, permitting 'I don't know', and verifying claims all curb hallucination. Encouraging the model to invent details to fill gaps directly causes hallucination.",
      reference: {
        text: "Knowledge — Reducing hallucinations & grounding",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "d5-q7",
      type: "single",
      stem: "Why build an evaluation (eval) set for your LLM feature?",
      options: [
        "To systematically measure output quality and catch regressions as you change prompts or models",
        "To increase the model's context window",
        "To replace the need to write any prompts",
        "To make requests run faster automatically"
      ],
      correct: [0],
      explanation: "Eval sets let you measure quality objectively and detect regressions when prompts or models change. They don't expand context, replace prompting, or speed up requests.",
      reference: {
        text: "Knowledge — Evaluations",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "d5-q8",
      type: "single",
      stem: "A common way to judge open-ended LLM outputs at scale is:",
      options: [
        "Only ever have a human manually read every single output forever",
        "Use defined criteria and, where appropriate, an LLM-as-judge or automated checks against expected results",
        "Assume all outputs are correct if the request returned 200 OK",
        "Measure only the response latency and ignore content"
      ],
      correct: [1],
      explanation: "Scaling evaluation typically combines clear criteria with automated checks and/or an LLM-as-judge, often spot-checked by humans. A 200 status says nothing about content quality, and latency alone ignores correctness.",
      reference: {
        text: "Knowledge — Judging outputs",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "d5-q9",
      type: "multi",
      stem: "Which patterns improve the reliability of an LLM-powered feature in production? (Select all that apply.)",
      options: [
        "Retry transient failures with backoff",
        "Validate outputs (e.g., schema checks) before using them downstream",
        "Provide fallbacks or safe defaults when a call fails",
        "Remove all guardrails so responses are never constrained"
      ],
      correct: [0, 1, 2],
      explanation: "Retries with backoff, output validation, and fallbacks are core reliability patterns. Removing all guardrails reduces safety and reliability rather than improving it.",
      reference: {
        text: "Knowledge — Reliability patterns",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    },
    {
      id: "d5-q10",
      type: "single",
      stem: "You want to control cost and latency while keeping quality acceptable. Which approach is reasonable?",
      options: [
        "Always use the largest model with the maximum context for every request, no matter how trivial",
        "Match the model size and context to the task, trim unnecessary context, and cache or reuse results where possible",
        "Disable all validation to save time",
        "Never measure cost or latency at all"
      ],
      correct: [1],
      explanation: "Right-sizing the model/context to the task, trimming unneeded context, and caching balance cost, latency, and quality. Always maxing out the model wastes money and time, and skipping validation or measurement undermines reliability.",
      reference: {
        text: "Knowledge — Cost & latency management",
        href: "../Knowledge/05_Context_Management_and_Reliability.md",
        external: "https://docs.anthropic.com"
      }
    }
  ]
});
