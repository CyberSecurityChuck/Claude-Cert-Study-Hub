"use strict";
/* ============================================================
   Claude Certified Architect – Foundations · AI Provider Catalog
   ------------------------------------------------------------
   This file is a STATIC CATALOG of the providers both portals can
   use. It contains NO secrets and is never written to by the app.

   API keys are NEVER stored here. Each signed-in user saves their
   own provider + model + API key through the "AI Provider" window;
   the server keeps it in data/users/<slug>/ai-config.json and
   injects the key into outbound provider calls. The key is never
   sent back to the browser.

   FIELDS
     id             : stable internal id (do not rename; saved configs
                      reference it). Legacy display names still resolve.
     name           : friendly label shown in the provider dropdown.
     style          : wire format -> "openai" | "anthropic" | "google".
     baseUrl        : API root.
     modelsPath     : path appended to baseUrl to list models ("" = none).
     requiresApiKey : false for local servers that ignore the key.
     keyForModels   : true when listing models needs the API key.
     fallbackModels : used only when the live model list is unavailable,
                      so the dropdown still auto-populates.
   ============================================================ */

var CCAF_AI_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    style: "openai",
    baseUrl: "https://api.openai.com/v1",
    modelsPath: "/models",
    requiresApiKey: true,
    keyForModels: true,
    fallbackModels: [
      { id: "gpt-4o", label: "gpt-4o" },
      { id: "gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "gpt-4.1", label: "gpt-4.1" },
      { id: "gpt-4.1-mini", label: "gpt-4.1-mini" }
    ]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    style: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    modelsPath: "/models",
    requiresApiKey: true,
    keyForModels: true,
    apiVersion: "2023-06-01",
    fallbackModels: [
      { id: "claude-sonnet-4-5", label: "claude-sonnet-4-5" },
      { id: "claude-opus-4-1", label: "claude-opus-4-1" },
      { id: "claude-3-7-sonnet-latest", label: "claude-3-7-sonnet-latest" },
      { id: "claude-3-5-haiku-latest", label: "claude-3-5-haiku-latest" }
    ]
  },
  {
    id: "google",
    name: "Google AI Studio",
    style: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    modelsPath: "/models",
    requiresApiKey: true,
    keyForModels: true,
    fallbackModels: [
      { id: "gemini-2.5-pro", label: "gemini-2.5-pro" },
      { id: "gemini-2.5-flash", label: "gemini-2.5-flash" },
      { id: "gemini-2.0-flash", label: "gemini-2.0-flash" }
    ]
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    style: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    modelsPath: "/models",
    requiresApiKey: true,
    /* OpenRouter publishes its catalog without auth, so models load
       before a key is entered. */
    keyForModels: false,
    fallbackModels: []
  },
  {
    id: "groq",
    name: "Groq",
    style: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    modelsPath: "/models",
    requiresApiKey: true,
    keyForModels: true,
    fallbackModels: []
  },
  {
    id: "mistral",
    name: "Mistral AI",
    style: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    modelsPath: "/models",
    requiresApiKey: true,
    keyForModels: true,
    fallbackModels: []
  },
  {
    id: "deepseek",
    name: "DeepSeek AI",
    style: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    modelsPath: "/models",
    requiresApiKey: true,
    keyForModels: true,
    fallbackModels: [
      { id: "deepseek-chat", label: "deepseek-chat" },
      { id: "deepseek-reasoner", label: "deepseek-reasoner" }
    ]
  },
  {
    id: "nvidia",
    name: "NVIDIA",
    style: "openai",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modelsPath: "/models",
    requiresApiKey: true,
    keyForModels: false,
    fallbackModels: []
  },
  {
    id: "opencode-zen",
    name: "OpenCode Zen",
    style: "openai",
    baseUrl: "https://opencode.ai/zen/v1",
    modelsPath: "/models",
    requiresApiKey: true,
    keyForModels: false,
    fallbackModels: []
  },
  {
    id: "bedrock-proxy",
    name: "Amazon Bedrock",
    style: "openai",
    /* Point this at your own OpenAI-compatible Bedrock gateway. */
    baseUrl: "https://your-bedrock-proxy.example.com/v1",
    modelsPath: "/models",
    requiresApiKey: true,
    keyForModels: true,
    fallbackModels: []
  },
  {
    id: "custom-openai",
    name: "Custom OpenAI-compatible endpoint",
    style: "openai",
    baseUrl: "http://localhost:11434/v1",
    modelsPath: "/models",
    requiresApiKey: false,
    keyForModels: false,
    fallbackModels: []
  },
  {
    id: "lm-studio",
    name: "Local LLM (LM Studio)",
    style: "openai",
    baseUrl: "http://localhost:1234/v1",
    modelsPath: "/models",
    requiresApiKey: false,
    keyForModels: false,
    fallbackModels: []
  }
];

/* Display names used by older saved configs -> current provider id. */
var CCAF_AI_PROVIDER_ALIASES = {
  "OpenAI": "openai",
  "Anthropic": "anthropic",
  "Google AI Studio": "google",
  "OpenRouter": "openrouter",
  "Groq": "groq",
  "Mistral AI": "mistral",
  "DeepSeek AI": "deepseek",
  "NVIDIA": "nvidia",
  "OpenCode Zen": "opencode-zen",
  "Amazon Bedrock": "bedrock-proxy",
  "Custom OpenAI-compatible endpoint": "custom-openai",
  "Local LLM (LM Studio)": "lm-studio"
};

/* Usable from Node (server.js) and, if ever needed, the browser. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { providers: CCAF_AI_PROVIDERS, aliases: CCAF_AI_PROVIDER_ALIASES };
}
if (typeof window !== "undefined") {
  window.CCAF_AI_PROVIDERS = CCAF_AI_PROVIDERS;
}
