"use strict";
/* ============================================================
   Section Quiz — Domain 3: Prompt Engineering & Structured Output
   10 exam-style questions. Registered via
   window.registerQuestionSet (defined by app.js before injection).
   ============================================================ */
window.registerQuestionSet({
  id: "quiz-d3",
  type: "quiz",
  domain: "Prompt Engineering & Structured Output",
  domainKey: "d3",
  title: "Section Quiz — Prompt Engineering & Structured Output",
  passPct: 70,
  questions: [
    {
      id: "d3-q1",
      type: "single",
      stem: "Which prompt is most likely to produce a reliable, on-target answer?",
      options: [
        "\"Do the thing with this.\"",
        "\"Summarize the text below in exactly 3 bullet points, each under 15 words, focusing on security risks.\"",
        "\"Tell me something interesting.\"",
        "\"Handle it however you think is best.\""
      ],
      correct: [1],
      explanation: "Clear, direct, specific instructions (format, length, focus) reduce ambiguity and yield reliable output. The vague options leave the task, format, and goal undefined.",
      reference: {
        text: "Knowledge — Clear/direct instructions",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "d3-q2",
      type: "single",
      stem: "You include two or three worked input→output examples in your prompt to show the model the pattern you want. What technique is this?",
      options: [
        "Few-shot prompting (examples)",
        "Fine-tuning",
        "Prefilling",
        "Retrieval-augmented generation"
      ],
      correct: [0],
      explanation: "Providing examples in the prompt is few-shot prompting, which demonstrates the desired pattern. Fine-tuning changes model weights, prefilling seeds the response, and RAG injects retrieved documents.",
      reference: {
        text: "Knowledge — Few-shot examples",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "d3-q3",
      type: "single",
      stem: "What is the main purpose of a system prompt (role prompt)?",
      options: [
        "To set the model's overall role, persona, and standing instructions for the conversation",
        "To store the final JSON output",
        "To limit the maximum number of tokens the model can read",
        "To encrypt the user's messages"
      ],
      correct: [0],
      explanation: "A system prompt defines the model's role and persistent behavior/instructions for the whole conversation. It is not an output store, a token limit setting, or an encryption feature.",
      reference: {
        text: "Knowledge — System/role prompts",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "d3-q4",
      type: "single",
      stem: "Why are XML-style tags (e.g., <instructions>, <document>, <example>) useful in prompts to Claude?",
      options: [
        "They clearly delimit and label different parts of the prompt so the model can distinguish them",
        "They compress the prompt to use fewer tokens",
        "They are required or the API will reject the request",
        "They automatically translate the prompt into other languages"
      ],
      correct: [0],
      explanation: "XML tags give structure by clearly separating and labeling sections (instructions vs. data vs. examples), which Claude handles well. They are not a compression trick, a hard requirement, or a translator.",
      reference: {
        text: "Knowledge — XML tags to structure prompts",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "d3-q5",
      type: "single",
      stem: "For a complex reasoning problem, you ask the model to 'think step by step' and show its reasoning before giving the final answer. What is this technique called?",
      options: [
        "Prefilling",
        "Chain-of-thought prompting",
        "Tokenization",
        "Quantization"
      ],
      correct: [1],
      explanation: "Encouraging the model to reason step by step before answering is chain-of-thought prompting, which improves accuracy on complex tasks. Prefilling seeds the reply; tokenization and quantization are unrelated model internals.",
      reference: {
        text: "Knowledge — Chain-of-thought / letting Claude think",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "d3-q6",
      type: "multi",
      stem: "You need the model to reliably return valid JSON matching a fixed shape. Which techniques help? (Select all that apply.)",
      options: [
        "Specify the exact JSON schema/fields you expect and show an example",
        "Prefill the assistant's response with the opening '{' to steer it into JSON",
        "Ask for 'some JSON, roughly' and hope for the best",
        "Instruct it to output only JSON with no extra prose or markdown fences"
      ],
      correct: [0, 1, 3],
      explanation: "Specifying the schema with an example, prefilling the opening brace, and demanding JSON-only output all improve structured-output reliability. Vague requests like 'some JSON, roughly' invite malformed or wrapped output.",
      reference: {
        text: "Knowledge — Reliable structured/JSON output",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "d3-q7",
      type: "single",
      stem: "What does 'prefilling' the assistant's response do?",
      options: [
        "It provides the beginning of the model's reply so its continuation follows that format or direction",
        "It deletes the user's previous messages",
        "It doubles the context window size",
        "It sends the prompt to a different model"
      ],
      correct: [0],
      explanation: "Prefilling seeds the start of the assistant's output (e.g., '{' or 'Answer:'), steering the format or content of the continuation. It does not delete messages, change context size, or reroute models.",
      reference: {
        text: "Knowledge — Prefilling responses",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "d3-q8",
      type: "single",
      stem: "When prompting with a very long document, a recommended practice is to:",
      options: [
        "Place the long document/content first and put your specific question or instructions near the end",
        "Split every sentence onto its own line to save tokens",
        "Never use XML tags with long inputs",
        "Remove all instructions and rely on the model to guess the task"
      ],
      correct: [0],
      explanation: "For long-context prompts, putting the large content first and the query/instructions at the end tends to improve focus and recall. Tag structure still helps, and the task should always be stated explicitly.",
      reference: {
        text: "Knowledge — Long-context prompting",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "d3-q9",
      type: "multi",
      stem: "Which of the following are common prompt-engineering mistakes to avoid? (Select all that apply.)",
      options: [
        "Being vague about the desired format or success criteria",
        "Giving clear, specific, testable instructions",
        "Overloading a single prompt with many unrelated tasks at once",
        "Assuming the model knows unstated context you never provided"
      ],
      correct: [0, 2, 3],
      explanation: "Vagueness, cramming unrelated tasks together, and assuming unstated context are frequent mistakes. Giving clear, specific, testable instructions is a best practice, not a mistake.",
      reference: {
        text: "Knowledge — Common mistakes",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    },
    {
      id: "d3-q10",
      type: "single",
      stem: "Which set best captures the 'anatomy' of a well-structured prompt?",
      options: [
        "Only a single sentence with no context",
        "A role/system instruction, clear task instructions, relevant context/data, examples if needed, and a specified output format",
        "Random keywords separated by commas",
        "The largest possible amount of unrelated text to fill the context window"
      ],
      correct: [1],
      explanation: "A strong prompt typically combines a role, clear instructions, relevant context, optional examples, and an explicit output format. A lone sentence, keyword soup, or context-window padding do not provide the structure the model needs.",
      reference: {
        text: "Knowledge — Anatomy of a good prompt",
        href: "../Knowledge/03_Prompt_Engineering_and_Structured_Output.md",
        external: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview"
      }
    }
  ]
});
