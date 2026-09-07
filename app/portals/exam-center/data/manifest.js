"use strict";
/* ============================================================
   Claude Certified Architect – Foundations · Manifest
   Registry of available quizzes and mock tests. Loaded BEFORE
   app.js so the engine can render the lists. Data set files
   themselves are injected on demand by the engine.
   ============================================================ */
window.CCAF_MANIFEST = {
  quizzes: [
    {
      id: "quiz-d1",
      file: "data/quiz_domain1.js",
      domainKey: "d1",
      title: "Section Quiz — Agentic Architecture & Orchestration"
    },
    {
      id: "quiz-d2",
      file: "data/quiz_domain2.js",
      domainKey: "d2",
      title: "Section Quiz — Claude Code Configuration & Workflows"
    },
    {
      id: "quiz-d3",
      file: "data/quiz_domain3.js",
      domainKey: "d3",
      title: "Section Quiz — Prompt Engineering & Structured Output"
    },
    {
      id: "quiz-d4",
      file: "data/quiz_domain4.js",
      domainKey: "d4",
      title: "Section Quiz — Tool Design & MCP Integration"
    },
    {
      id: "quiz-d5",
      file: "data/quiz_domain5.js",
      domainKey: "d5",
      title: "Section Quiz — Context Management & Reliability"
    }
  ],
  mocks: [
    {
      id: "mock-01",
      file: "data/mocks/mock_01.js",
      title: "Full Mock #1"
    }
  ]
};
