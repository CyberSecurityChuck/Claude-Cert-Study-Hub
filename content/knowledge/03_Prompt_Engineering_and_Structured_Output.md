# 03 — Prompt Engineering and Structured Output

> **Exam weight: 20%.**
> **Audience:** senior cybersecurity engineer, new to AI. Every term defined on first use; worked before/after examples included.

---

## 0. Vocabulary

- **Prompt:** the text you send the model.
- **Prompt engineering:** the skill of writing prompts that reliably get the result you want. (Like writing a precise, unambiguous ticket vs. a vague one.)
- **Token:** a chunk of text (~¾ word) the model reads/writes.
- **Structured output:** an answer in a strict, machine-readable format (usually JSON) instead of free prose.

> **Security analogy:** a prompt is like a **runbook step** or a **detection rule**. Vague instructions → inconsistent, unreliable behavior. Precise instructions → repeatable results.

---

## 1. Anatomy of a good prompt

A strong prompt usually has these parts (not all are always needed):

```
[ ROLE / SYSTEM ]   who the model should act as + top rules
[ TASK ]            the exact thing to do
[ CONTEXT / DATA ]  the material to work on
[ EXAMPLES ]        show what good looks like (optional)
[ OUTPUT FORMAT ]   exactly how the answer should be shaped
[ CONSTRAINTS ]     length, tone, do's and don'ts
```

Think of it as **who → what → with what → shaped how**.

---

## 2. Clear, direct instructions

Models do best when you are **specific and explicit**. Don't make the model guess.

**❌ Before (vague):**
```
Tell me about this log.
```

**✅ After (clear + direct):**
```
You are a SOC analyst. Read the firewall log below.
List, as bullet points: (1) the source IP, (2) whether the
traffic looks suspicious, and (3) one recommended action.
Keep it under 100 words. If information is missing, say "unknown".

Log:
<the log text>
```

Notes: we gave a **role**, an **exact task**, a **format**, a **length limit**, and a **fallback** ("say unknown"). That's the difference between a flaky and a reliable prompt.

> Tip: tell the model **what to do**, not just what *not* to do. "Reply in JSON" beats "don't use prose."

---

## 3. Giving examples (few-shot prompting)

**Definition — Few-shot prompting:** including a few worked examples of input → desired output *inside the prompt*, so the model copies the pattern. (**Zero-shot** = no examples; **one-shot** = one example.)

> **Security analogy:** like giving an analyst 3 labeled sample alerts ("this = benign, this = malicious") before asking them to triage a new one. Examples set the standard.

**Example:**
```
Classify each login as NORMAL or SUSPICIOUS.

Example 1:
Input: login from usual office IP at 9am -> NORMAL
Example 2:
Input: login from new country at 3am, 40 failed tries -> SUSPICIOUS

Now classify:
Input: login from new device, same city, business hours ->
```

Examples are one of the most powerful, easiest wins in prompt engineering.

### 3.1 Few-shot depth — why examples are the single most effective technique

For getting **consistent, actionable, correctly-formatted** output, few-shot examples are the **most effective** technique you have — more so than adding more adjectives to your instructions.

- **Use 2–4 targeted examples**, focused on the **ambiguous cases** — the ones where a reasonable analyst might disagree. Don't waste examples on the obvious cases.
- **Show the reasoning**, not just the verdict. An example that walks through *why* something is flagged teaches the pattern; a bare label does not.
- **Demonstrate the exact output shape** — for an extraction/review task that means showing every field: **location, issue, severity, suggested fix**. The model copies what it sees.
- **Distinguish acceptable patterns from genuine issues.** Include a "looks scary but is fine" example next to a "this is a real problem" example so the model learns the boundary.
- **Help generalize to novel patterns** and **reduce hallucination / empty-field extraction** when documents arrive in varied formats.

> **Security analogy:** few-shot examples are your **labeled training alerts for a new analyst**. Two well-chosen edge cases ("this false-positive-looking thing is actually benign; this benign-looking thing is actually the attack") teach more than a page of policy prose.

---

## 4. Role and system prompts

**Definition — System prompt:** a special top-level instruction that sets the model's **persona, rules, and boundaries** for the whole conversation. It carries extra weight over normal messages.

**Definition — Role prompting:** telling the model *who to be* ("You are a senior penetration tester...") so its tone and expertise match the job.

**Example system prompt:**
```
You are a careful security documentation assistant.
Rules: use plain English, define jargon, never invent facts,
and if unsure, say so. Always cite which input line supports a claim.
```

> **Analogy:** the system prompt is the **policy/charter**; individual messages are day-to-day requests that must stay within that charter.

---

## 5. Using XML tags to structure prompts (Claude-friendly)

Claude responds very well to **XML-style tags** that clearly separate the parts of your prompt. Tags remove ambiguity about "where does the data end and the instruction begin?"

**Example:**
```
<instructions>
Summarize the report in 3 bullets. Then list any IPs you found.
</instructions>

<report>
...paste the long report here...
</report>

<format>
- Summary: three bullets
- IPs: comma-separated, or "none found"
</format>
```

> **Security analogy:** tags are like **clearly delimited fields in a log format** — a parser (and Claude) always knows which field is which. This also helps prevent the model from confusing your data with your instructions (a mild defense against prompt injection — see file 04).

---

## 6. Chain-of-thought (letting Claude think)

**Definition — Chain-of-thought (CoT):** asking the model to **reason step by step before giving the final answer**. This improves accuracy on anything involving logic, math, or multi-step analysis.

**Before:**
```
Is this configuration secure? Answer yes/no.
```

**After (CoT):**
```
Think step by step about this configuration inside <thinking> tags:
check each setting against best practice. Then give your final
verdict (SECURE / NOT SECURE) inside <answer> tags.
```

> Why it works: forcing the model to "show its work" makes it actually do the intermediate reasoning instead of blurting a guess. **Analogy:** requiring an analyst to write out the investigation steps, not just the conclusion.

You can then read only the `<answer>` if you don't want to show the thinking to end users.

---

## 7. Prefilling responses

**Definition — Prefilling:** you start the model's answer for it by providing the first few characters/words of its reply, so it continues in exactly the shape you want.

- Prefill `{` → strongly nudges the model to output JSON (no chatty preamble).
- Prefill `SECURE:` → forces it straight into your format.

**Example:**
```
...produce the result as JSON.
Assistant (prefilled): {
```

> **Analogy:** like giving someone a form that's already opened to the right field — they just fill it in instead of writing an essay.

---

## 8. Controlling output format & producing reliable structured/JSON output ⭐

To get **structured output** (JSON, CSV, a fixed template) reliably:

1. **Show the exact schema** you want (with field names and types).
2. **Give an example** of a filled-in output (few-shot).
3. **Use tags** to isolate the output, e.g. `<json>...</json>`.
4. **Prefill** the opening `{` or `<json>`.
5. **Tell it what to do when a value is missing** (e.g., use `null`), so it doesn't invent data.
6. **Validate** the output in your code; if invalid, ask again (a reliability pattern — file 05).

**Example prompt:**
```
Extract the alert details. Respond ONLY with JSON in this schema:
{
  "source_ip": string,
  "severity": "low" | "medium" | "high",
  "action": string,
  "confidence": number   // 0 to 1
}
If a field is unknown, use null. Do not add extra keys or text.
```

**Example good output:**
```json
{
  "source_ip": "10.2.14.7",
  "severity": "high",
  "action": "block and investigate",
  "confidence": 0.8
}
```

> **Security analogy:** structured output is what lets an LLM plug into a pipeline — like normalizing events into a **schema (e.g., a SIEM common format)** so downstream tools can parse them automatically.

### 8.1 The most reliable method: structured output via `tool_use` with a JSON schema ⭐

The prefill/prompt-formatting recipe above works, but the **single most reliable way** to get schema-compliant structured output is to define a **tool** whose **input schema is a JSON Schema**, and let the model "call" that tool. The model must fill in arguments that match your schema — so what comes back is already valid, typed JSON.

**Definition — `tool_use`:** the mechanism where you describe a tool (name + JSON-Schema `input_schema`), and the model responds with a `tool_use` block containing arguments that conform to that schema. Even if you never actually execute the tool, you can use it purely as a **structured-output contract**.

```
tools = [{
  "name": "extract_alert",
  "description": "Return the parsed alert.",
  "input_schema": {
    "type": "object",
    "properties": {
      "source_ip": { "type": "string" },
      "severity":  { "type": "string", "enum": ["low","medium","high"] },
      "action":    { "type": "string" },
      "confidence":{ "type": "number" }
    },
    "required": ["source_ip", "severity"]
  }
}]
```

> **Why it beats prompt formatting alone:** the schema is enforced structurally, not just requested politely. You get typed fields and enums without hoping the model remembers the format.

> **⚠️ Critical limit — syntax vs. semantics:** a strict JSON schema eliminates **syntax** errors (missing brace, wrong type, unknown field). It does **NOT** prevent **semantic** errors — the model can still return values that are *well-formed but wrong*, e.g. `line_items` that don't add up to the stated `total`, or a plausible-but-invented IP. Schema validation ≠ correctness. Catch semantics with self-checks and validation (§ 8.3, § 12).

> **Security analogy:** the schema is like a **firewall rule that checks packet structure** — it guarantees the fields are shaped right, but it can't tell you the *content* is legitimate. A syntactically perfect log line can still describe a lie.

### 8.2 `tool_choice` — controlling *whether* and *which* tool runs

`tool_choice` tells the model how to decide about tools:

| Setting | Behavior | When to use |
|---|---|---|
| `{"type": "auto"}` | Model decides whether to call a tool or just talk. | Chat/agent flows where a tool is sometimes needed. |
| `{"type": "any"}` | Model **must** call *some* tool (no plain conversational reply). | You always want structured output, but several tools are valid. |
| `{"type": "tool", "name": "extract_metadata"}` | **Forces one specific tool** to run first. | You want *exactly this* schema every time — e.g., force `extract_metadata` before anything else. |

> **Analogy:** `auto` = "use a tool if the ticket calls for it"; `any` = "you must file *some* form, no free-text notes"; forced = "fill out *this exact* form first."

### 8.3 Schema design considerations

A schema is only as good as its design. Practical rules:

- **Required vs. optional (nullable) fields.** Make a field **optional / nullable** when the source document **may not contain** that info. Forcing a value on a `required` field pressures the model to **fabricate** — a nullable field lets it honestly say "not present."
- **Enums with an escape hatch.** For categorical fields, include an `"unclear"` or `"other"` enum value **plus a companion detail string** (e.g., `category_detail`) so ambiguous cases are captured explicitly instead of being force-fit into a wrong bucket.
- **Normalize in the prompt, constrain in the schema.** Put **format-normalization rules** in the prompt ("dates as YYYY-MM-DD, IPs in dotted-quad, currency as a number without symbols") *alongside* the strict output schema. The schema enforces shape; the prompt fixes formatting conventions.

> **Security analogy:** nullable fields are like an alert form that allows **"field not observed"** instead of demanding a value — it stops analysts (and models) from inventing data to satisfy a required box.

---

## 9. Long-context prompting tips

**Definition — Context:** everything you put in the prompt for this call (instructions + data + examples). It's limited (see file 05).

When feeding a lot of text:
- **Put the long document first, your question last** — models often follow the final instruction best.
- **Use tags** to mark each document (`<doc1>...</doc1>`).
- **Ask for quotes/citations** ("quote the exact lines that support your answer") to keep it grounded.
- **Only include what's relevant** — more text = more cost, more latency, and more room to get distracted.

---

## 9.5. Explicit criteria — cutting false positives ⭐

When a model flags issues (code review, log triage, policy checks), **vague instructions produce noisy, low-trust output**. The fix is **specific, categorical criteria**.

- **Specific criteria beat vague instructions.** "Flag a comment **only when the claimed behavior contradicts the actual code behavior**" is far better than "check that comments are accurate." The first gives a testable rule; the second invites guessing.
- **Generic hedges don't help precision.** Telling the model to "be conservative" or "only flag important things" does **NOT** meaningfully reduce false positives. Precision comes from *defining the categories*, not from asking for caution.
- **Define explicit severity criteria with concrete code examples.** Show what a `high` vs `low` finding looks like in actual code, so severity is applied consistently.
- **False positives erode developer trust.** Once a tool cries wolf a few times, engineers start ignoring *all* its findings — including the real ones. Precision is a trust problem, not just a metrics problem.
- **Temporarily disable high-false-positive categories to restore trust.** If one check (say, "possible race condition") is mostly wrong, turn that category off while you refine it, rather than letting it poison confidence in the whole tool.

> **Security analogy:** this is **detection-rule tuning**. A rule that alerts on "anything unusual" drowns the SOC in noise and gets muted; a rule with tight, specific conditions ("outbound to known-bad ASN AND >1MB") is trusted and acted on. You tune out the noisy signature rather than telling analysts to "be careful."

---

## 9.6. Validation, retry, and feedback loops ⭐

Schema validation catches syntax; **semantic validation and retries** catch the rest.

**Definition — Retry with error feedback:** when validation fails, you send the request again — but you **append the specific validation errors** to the prompt, along with the **original document** and the **failed extraction**, so the model can see exactly what to fix.

```
Your previous output failed validation:
- "calculated_total" (1240.00) does not equal "stated_total" (1300.00)
- "invoice_date" is not in YYYY-MM-DD format
Here is the original document and your previous answer. Correct these issues.
```

- **Retry works for format/structural mismatches** (wrong date format, a field in the wrong shape, a total that was miscomputed from data that *is* present).
- **Retry does NOT work when the information is simply absent** from the source. Re-asking can't conjure a value that was never in the document — you'll just get a fabrication or another null. Route these to "not present," not to another retry.
- **Distinguish semantic errors from schema-syntax errors.** A syntax error = malformed JSON / wrong type (schema catches it). A **semantic** error = well-formed but wrong (the total doesn't add up). Different failures need different handling.

**Self-correction patterns you can build into the schema:**
- Extract **`calculated_total`** alongside **`stated_total`** so a mismatch is visible and flaggable.
- Add a **`conflict_detected`** boolean the model must set when fields disagree.
- Add a **`detected_pattern`** field that records *which* construct triggered a finding — useful for auditing and for tracking false-positive sources over time.

> **Security analogy:** retry-with-feedback is like **kicking a ticket back to the analyst with the exact reviewer comments attached** ("your total doesn't reconcile; the timestamp isn't ISO-8601") — actionable. But if the evidence was never collected, no amount of re-review creates it; you escalate or mark it unknown instead.

---

## 9.7. Batch processing (Message Batches API)

**Definition — Message Batches API:** a way to submit **many requests at once** for asynchronous processing, in exchange for lower cost and no latency guarantee.

- **~50% cost savings** vs. real-time calls.
- **Up to a 24-hour processing window**, and **NO guaranteed latency SLA** — a batch can come back in minutes or take most of the day.
- **Appropriate for** non-blocking, latency-tolerant workloads: overnight log analysis, weekly compliance sweeps, bulk document extraction.
- **Inappropriate for** blocking workflows — e.g. a **pre-merge code check** where a developer is waiting on the result. Use real-time calls there.
- **Does NOT support multi-turn tool calling within a single request** — it's one-shot per request, not an interactive agent loop.
- **`custom_id`** correlates each request with its response in the returned batch — you must set it to match results back to inputs.
- **Handle failures by resubmitting only the failed `custom_id`s** (e.g., re-chunk an oversized document and resubmit just those pieces).
- **Refine your prompt on a small sample first**, then run the large batch — you don't want to discover a prompt bug across 50,000 documents.
- **Plan around the window:** if processing can take up to 24 hours and you need a **30-hour SLA**, submitting a fresh batch **every 4 hours** keeps you safely inside that guarantee.

> **Security analogy:** batch processing is your **overnight cron/scheduled scan** — cheap, bulk, "results by morning." You'd never put it in the **inline blocking gate** at the CI/CD merge step, where someone is standing at the door waiting to be let through.

---

## 9.8. Multi-instance / multi-pass review architectures

For high-stakes review, **who checks the work** matters as much as the prompt.

- **Self-review is limited.** A model still "remembers" the reasoning that produced its answer, so it's **less likely to question its own decisions** — it tends to rationalize rather than re-examine.
- **A second, independent Claude instance catches subtle issues better** than self-review or even extended thinking. Fresh eyes, no attachment to the first answer.
- **Split large multi-file reviews** into **per-file local passes** (deep focus on each file) **plus a separate cross-file integration pass** (catches issues that only appear when files interact — e.g., a caller and callee that disagree).
- **Run verification passes where the model reports a confidence level alongside each finding**, so you can route by calibration — auto-accept high-confidence findings, send low-confidence ones to a human.

> **Security analogy:** this is **four-eyes / peer review and red-team vs. blue-team**. You don't let the person who wrote the firewall change also be its sole approver — an **independent reviewer** catches what the author is blind to, and a **separate integration review** catches cross-system interactions no single file-level check would see.

---

## 10. Common mistakes (and fixes)

| Mistake | Fix |
|---|---|
| Vague instruction | Be explicit: role, task, format, limits |
| Only saying what *not* to do | State the desired behavior positively |
| No examples for a tricky format | Add 1–3 few-shot examples |
| Mixing data and instructions | Separate them with XML tags |
| Expecting logic without CoT | Ask it to think step by step |
| Free-form output feeding a program | Specify a schema + validate |
| Assuming it remembers past chats | Re-supply needed context (it's stateless) |
| Trusting invented facts | Ask for citations; ground in provided data |
| Prompt-formatting alone for critical JSON | Use `tool_use` with a JSON-Schema `input_schema` |
| Assuming valid JSON = correct JSON | Schema stops *syntax* errors, not *semantic* ones — add self-checks |
| Forcing a value on a `required` field | Make it optional/nullable so the model can say "not present" |
| "Be conservative" to cut false positives | Give specific categorical criteria + severity examples |
| Retrying when the info is absent | Retry only fixes format/structure; route "absent" to null/unknown |
| Batch API for a blocking pre-merge check | Batch = latency-tolerant only; use real-time for blocking work |
| Trusting a model to review its own output | Use a second independent instance / cross-file pass |

---

## Verify latest
Prompting features and best practices evolve. Confirm specifics at:
- **Anthropic / Claude docs:** docs.anthropic.com and docs.claude.com — see the **prompt engineering** guides (system prompts, XML tags, prefilling, CoT, structured output).
Re-check especially: current recommended structured-output methods and any built-in output/format controls.

---

## ✅ Check your understanding
When you finish this file, tell your tutor AI. **It will ask 5–10 multiple-choice questions, one at a time**, on: parts of a good prompt, clear instructions, few-shot examples, system/role prompts, XML tags, chain-of-thought, prefilling, reliable JSON output (including `tool_use` schemas, `tool_choice`, and schema design), explicit criteria / false positives, validation & retry loops, the Message Batches API, multi-instance review, long-context tips, and common mistakes. One at a time, with feedback after each.

Sample questions on the newer material (try these first):

**Q1.** You need the most reliable schema-compliant JSON out of Claude for an extraction pipeline. Which is the *strongest* approach?
- A. Ask nicely for JSON and prefill a `{`
- B. Define a tool with a JSON-Schema `input_schema` and have the model call it (`tool_use`)
- C. Lower the temperature to 0 and hope
- D. Put "RETURN VALID JSON" in all caps

*Answer: B. `tool_use` with a JSON-Schema `input_schema` enforces structure, not just requests it. But remember it stops **syntax** errors only — a total that doesn't add up is a **semantic** error the schema won't catch.*

**Q2.** An invoice extractor keeps returning line items that don't sum to the stated total. You add strict JSON-schema validation and retry. What happens?
- A. The schema fixes it, because the JSON is now valid
- B. Retrying with the specific error appended helps *if* the numbers are present to recompute; but schema validation alone won't catch a mismatch, and retry can't fix info that's absent
- C. Nothing can ever detect this
- D. Switch to the Batch API to fix it

*Answer: B. Schema = syntax only. Detect the semantic conflict yourself (e.g., extract `calculated_total` vs `stated_total`, set a `conflict_detected` flag), then retry-with-feedback for recomputable errors — but route genuinely-absent info to "not present," not to another retry.*

**Q3.** Which workload is a **good** fit for the Message Batches API?
- A. A pre-merge code review gate where a developer waits for the result
- B. A multi-turn tool-calling agent inside one request
- C. An overnight bulk analysis of the day's logs, tolerant of up to a 24-hour turnaround
- D. A real-time chatbot reply

*Answer: C. Batch = ~50% cheaper, up to 24h window, no latency SLA, and no multi-turn tool calling — ideal for non-blocking overnight/weekly jobs, wrong for anything blocking or interactive. (Tip: submit every 4 hours to stay within a 30-hour SLA.)*

**Q4.** A code-review tool is producing too many false positives and developers have started ignoring it. Best fix?
- A. Add "be conservative" to the prompt
- B. Give specific categorical criteria (e.g., "flag only when the comment contradicts actual code behavior") with concrete severity examples, and temporarily disable the noisiest category to rebuild trust
- C. Trust the model to review its own findings a second time
- D. Increase the number of findings requested

*Answer: B. Generic hedges like "be conservative" don't improve precision; specific criteria do. And for a real second opinion, use a **separate independent Claude instance** — self-review is weak because the model doesn't question its own reasoning.*
