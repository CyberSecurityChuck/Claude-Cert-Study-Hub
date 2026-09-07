"use strict";
/* ============================================================
   Section Quiz — Domain 2: Claude Code Configuration & Workflows
   10 exam-style questions. Registered via
   window.registerQuestionSet (defined by app.js before injection).
   ============================================================ */
window.registerQuestionSet({
  id: "quiz-d2",
  type: "quiz",
  domain: "Claude Code Configuration & Workflows",
  domainKey: "d2",
  title: "Section Quiz — Claude Code Configuration & Workflows",
  passPct: 70,
  questions: [
    {
      id: "d2-q1",
      type: "single",
      stem: "What best describes Claude Code?",
      options: [
        "A hosted web IDE that replaces your code editor entirely",
        "An agentic command-line coding tool that works with your codebase in the terminal",
        "A fine-tuning service for training custom Claude models on your code",
        "A browser extension that autocompletes text in web forms"
      ],
      correct: [1],
      explanation: "Claude Code is an agentic coding tool that runs in your terminal and acts on your local codebase. It is not a hosted IDE, a fine-tuning service, or a browser autocomplete extension.",
      reference: {
        text: "Knowledge — What Claude Code is",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "d2-q2",
      type: "single",
      stem: "You want Claude Code to remember project conventions, build commands, and coding standards across sessions without you re-explaining them each time. What is the standard mechanism?",
      options: [
        "A CLAUDE.md file in the project that provides persistent project memory/context",
        "Pasting the same instructions into every prompt manually",
        "Adding comments in random source files and hoping they are read",
        "Storing them only in your shell history"
      ],
      correct: [0],
      explanation: "A CLAUDE.md file gives Claude Code persistent project memory — conventions, commands, and context it reads automatically. Manual re-pasting, scattered comments, or shell history are not reliable, structured memory.",
      reference: {
        text: "Knowledge — CLAUDE.md / project memory",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "d2-q3",
      type: "single",
      stem: "By default, before Claude Code performs a potentially impactful action such as running a shell command or editing files, what happens?",
      options: [
        "It executes silently and tells you afterward only if something fails",
        "It asks you to approve the action (permission prompt) before proceeding",
        "It refuses to ever run commands or edit files",
        "It emails your administrator for approval"
      ],
      correct: [1],
      explanation: "Claude Code uses a permission model that asks for approval before impactful actions like running commands or editing files. It does not act silently by default, nor is it incapable of these actions.",
      reference: {
        text: "Knowledge — Permissions & tool approval",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "d2-q4",
      type: "single",
      stem: "In Claude Code, what is a slash command (e.g., /clear, /help, or a custom one)?",
      options: [
        "A shortcut that triggers a built-in or custom action within a Claude Code session",
        "A special Git branch naming convention",
        "A way to permanently disable Claude's permission checks",
        "A keyboard layout for the terminal"
      ],
      correct: [0],
      explanation: "Slash commands trigger built-in or user-defined actions inside a session, and you can define custom ones. They are not Git conventions, a permissions bypass, or a keyboard layout.",
      reference: {
        text: "Knowledge — Slash commands & custom commands",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "d2-q5",
      type: "multi",
      stem: "You want to define a reusable custom slash command for your team's repetitive workflow (e.g., 'run the tests and summarize failures'). Which statements are true? (Select all that apply.)",
      options: [
        "Custom commands can be stored in the project so the whole team shares them",
        "Custom commands can capture a repeatable prompt/workflow you invoke by name",
        "Creating a custom command requires retraining the underlying model",
        "Custom commands can accept arguments to make them flexible"
      ],
      correct: [0, 1, 3],
      explanation: "Custom slash commands are shareable via the project, encapsulate a repeatable prompt/workflow, and can take arguments. They do not require retraining the model — they are configuration, not training.",
      reference: {
        text: "Knowledge — Custom commands",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "d2-q6",
      type: "single",
      stem: "Why would you connect an MCP server to Claude Code?",
      options: [
        "To give Claude Code access to additional external tools and data sources through a standard interface",
        "To increase the size of the model's parameters",
        "To disable the terminal and force a GUI",
        "To convert your project to a different programming language automatically"
      ],
      correct: [0],
      explanation: "Connecting an MCP server extends Claude Code with external tools and data sources via the Model Context Protocol's standard interface. It does not change model size, replace the terminal, or auto-convert languages.",
      reference: {
        text: "Knowledge — Connecting MCP servers",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://modelcontextprotocol.io"
      }
    },
    {
      id: "d2-q7",
      type: "single",
      stem: "What is the purpose of subagents in Claude Code?",
      options: [
        "To let a focused helper handle a specialized subtask with its own context, keeping the main session clean",
        "To run the same prompt on multiple models for billing purposes",
        "To permanently store your API keys in plaintext",
        "To replace the need for a CLAUDE.md file"
      ],
      correct: [0],
      explanation: "Subagents delegate a specialized subtask to a focused helper with its own context window, which keeps the main conversation uncluttered. They are not a billing mechanism, a key store, or a replacement for project memory.",
      reference: {
        text: "Knowledge — Subagents in Claude Code",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "d2-q8",
      type: "multi",
      stem: "As a security-minded engineer, which are good safe-usage practices when working with Claude Code? (Select all that apply.)",
      options: [
        "Review proposed diffs/changes before accepting them",
        "Auto-approve every command so work goes faster",
        "Use version control so changes can be inspected and reverted",
        "Grant only the permissions and access the task actually needs"
      ],
      correct: [0, 2, 3],
      explanation: "Reviewing diffs, relying on version control, and applying least privilege are sound safety practices. Auto-approving every command removes the human checkpoint that catches destructive or unintended actions.",
      reference: {
        text: "Knowledge — Safe usage & reviewing changes",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "d2-q9",
      type: "single",
      stem: "Which task is Claude Code well suited for?",
      options: [
        "Refactoring code, fixing bugs, and running project commands across a codebase from the terminal",
        "Serving as your production database",
        "Acting as a network firewall for your company",
        "Replacing your monitoring and alerting stack"
      ],
      correct: [0],
      explanation: "Claude Code is designed for codebase-oriented work: refactoring, bug fixing, writing tests, and running project commands. It is not a database, firewall, or monitoring system.",
      reference: {
        text: "Knowledge — When to use Claude Code",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    },
    {
      id: "d2-q10",
      type: "single",
      stem: "A CLAUDE.md that is clear and well-scoped most directly improves which outcome?",
      options: [
        "It guarantees the model never makes a mistake",
        "It helps Claude follow your project's conventions and commands consistently, reducing repeated corrections",
        "It encrypts your source code at rest",
        "It removes the need to review changes"
      ],
      correct: [1],
      explanation: "Good project memory helps Claude follow your conventions and build/test commands consistently, so you correct it less. It does not guarantee perfection, encrypt code, or remove the need to review changes.",
      reference: {
        text: "Knowledge — CLAUDE.md / project memory",
        href: "../Knowledge/02_Claude_Code_Configuration_and_Workflows.md",
        external: "https://docs.claude.com"
      }
    }
  ]
});
