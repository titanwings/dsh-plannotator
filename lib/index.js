// src/host/ask-ai.ts
var ASK_AI_CHANNEL = "/dsh-plannotator";
var ASK_AI_ENDPOINT = "ask";
var MAX_PLAN_CHARS = 2e5;
var MAX_QUESTION_CHARS = 8e3;
var MAX_QUOTE_CHARS = 8e3;
var MAX_HISTORY_ENTRIES = 20;
var MAX_HISTORY_QUESTION_CHARS = 8e3;
var MAX_HISTORY_ANSWER_CHARS = 32e3;
var READ_ONLY_TOOL_CANDIDATES = ["read", "grep", "glob", "web_search", "web_fetch"];
var ASK_AI_PERSONA = [
  "You are a read-only assistant answering the user's questions about an implementation plan that is under review.",
  "Answer directly and concretely, citing the plan when relevant.",
  "You may use your read-only tools to inspect the repository when the answer depends on the code.",
  "Never modify files, never rewrite or update the plan itself, and never start new work;",
  "if an answer implies a change, describe what you would change instead."
].join(" ");
function failure(code, message) {
  return { ok: false, error: { code, message, details: {} } };
}
function messageOf(cause) {
  return cause instanceof Error ? cause.message : String(cause);
}
function parseHistoryEntry(value, index) {
  if (value === null || typeof value !== "object") return { message: `history[${index}] must be an object` };
  const candidate = value;
  if (typeof candidate.question !== "string" || candidate.question.trim() === "") {
    return { message: `history[${index}].question must be a non-empty string` };
  }
  if (candidate.question.length > MAX_HISTORY_QUESTION_CHARS) {
    return { message: `history[${index}].question exceeds ${MAX_HISTORY_QUESTION_CHARS} characters` };
  }
  if (typeof candidate.answer !== "string" || candidate.answer === "") {
    return { message: `history[${index}].answer must be a non-empty string` };
  }
  if (candidate.answer.length > MAX_HISTORY_ANSWER_CHARS) {
    return { message: `history[${index}].answer exceeds ${MAX_HISTORY_ANSWER_CHARS} characters` };
  }
  return { entry: { question: candidate.question, answer: candidate.answer } };
}
function parseAskAiRequest(payload) {
  if (payload === null || typeof payload !== "object") return { ok: false, message: "payload must be an object" };
  const candidate = payload;
  if (typeof candidate.sessionId !== "string" || candidate.sessionId === "") {
    return { ok: false, message: "sessionId must be a non-empty string" };
  }
  if (typeof candidate.plan !== "string" || candidate.plan.trim() === "") {
    return { ok: false, message: "plan must be a non-empty string" };
  }
  if (typeof candidate.question !== "string" || candidate.question.trim() === "") {
    return { ok: false, message: "question must be a non-empty string" };
  }
  if (candidate.question.length > MAX_QUESTION_CHARS) {
    return { ok: false, message: `question exceeds ${MAX_QUESTION_CHARS} characters` };
  }
  if (candidate.quote !== void 0 && (typeof candidate.quote !== "string" || candidate.quote.trim() === "")) {
    return { ok: false, message: "quote must be a non-empty string when present" };
  }
  if (typeof candidate.quote === "string" && candidate.quote.length > MAX_QUOTE_CHARS) {
    return { ok: false, message: `quote exceeds ${MAX_QUOTE_CHARS} characters` };
  }
  if (candidate.history !== void 0 && !Array.isArray(candidate.history)) {
    return { ok: false, message: "history must be an array when present" };
  }
  const rawHistory = candidate.history ?? [];
  if (rawHistory.length > MAX_HISTORY_ENTRIES) {
    return { ok: false, message: `history exceeds ${MAX_HISTORY_ENTRIES} entries` };
  }
  const history = [];
  for (const [index, item] of rawHistory.entries()) {
    const parsed = parseHistoryEntry(item, index);
    if ("message" in parsed) return { ok: false, message: parsed.message };
    history.push(parsed.entry);
  }
  const plan = candidate.plan.length <= MAX_PLAN_CHARS ? candidate.plan : `${candidate.plan.slice(0, MAX_PLAN_CHARS)}

[... plan truncated for length ...]`;
  return {
    ok: true,
    value: {
      sessionId: candidate.sessionId,
      plan,
      question: candidate.question.trim(),
      ...typeof candidate.quote === "string" ? { quote: candidate.quote } : {},
      history
    }
  };
}
function buildAskAiPrompt(request) {
  const sections = [
    "The user is reviewing the implementation plan below in plan mode and has a question about it.",
    "",
    "<plan>",
    request.plan,
    "</plan>"
  ];
  if (request.history.length > 0) {
    sections.push("", "Previous questions and answers about this plan:");
    request.history.forEach((entry, index) => {
      sections.push("", `Q${index + 1}: ${entry.question}`, `A${index + 1}: ${entry.answer}`);
    });
  }
  if (request.quote !== void 0) {
    sections.push("", "Excerpt the user selected in the plan:", "<quote>", request.quote, "</quote>");
  }
  sections.push("", `Question: ${request.question}`);
  return sections.join("\n");
}
function probeReadOnlyTools(parent) {
  const tools = parent.ctx.get("tools");
  if (tools === void 0 || typeof tools.restrict !== "function") return [];
  const allow = [];
  for (const name2 of READ_ONLY_TOOL_CANDIDATES) {
    try {
      tools.restrict({ allow: [name2] })();
      allow.push(name2);
    } catch {
    }
  }
  return allow;
}
function answerText(output) {
  return output.filter((block) => block.type === "text" && typeof block.text === "string").map((block) => block.text).join("");
}
function createAskAiHandler(ctx) {
  return async (endpoint, payload, signal) => {
    if (endpoint !== ASK_AI_ENDPOINT) {
      return failure("bad-request", `unknown endpoint ${JSON.stringify(endpoint)} on ${ASK_AI_CHANNEL}`);
    }
    const parsed = parseAskAiRequest(payload);
    if (!parsed.ok) return failure("bad-request", parsed.message);
    const request = parsed.value;
    const agents = ctx.get("agents");
    const subagents = ctx.get("subagents");
    if (agents === void 0 || subagents === void 0) {
      return failure("internal", "this deployment composes no subagent capability; Ask AI is unavailable");
    }
    const parent = agents.get(request.sessionId);
    if (parent === void 0) {
      return failure("internal", "the reviewed session has no live agent; Ask AI requires an active session");
    }
    let run;
    try {
      run = await subagents.start("spawn", {
        label: "plan-ask",
        prompt: [{ type: "text", text: buildAskAiPrompt(request) }],
        parent,
        signal,
        toolFilter: { allow: probeReadOnlyTools(parent) },
        persona: ASK_AI_PERSONA
      });
    } catch (cause) {
      if (signal.aborted) return failure("cancelled", "the question was cancelled");
      return failure("internal", `failed to start the plan Q&A agent: ${messageOf(cause)}`);
    }
    try {
      const result = await run.result;
      if (signal.aborted || result.stopReason === "aborted") {
        return failure("cancelled", "the question was cancelled");
      }
      if (result.stopReason !== "completed") {
        return failure("internal", `the plan Q&A agent stopped without answering (${result.stopReason})`);
      }
      const answer = answerText(result.output);
      if (answer.trim() === "") return failure("internal", "the plan Q&A agent returned no answer");
      return { ok: true, value: { answer } };
    } catch (cause) {
      if (signal.aborted) return failure("cancelled", "the question was cancelled");
      return failure("internal", messageOf(cause));
    } finally {
      try {
        await run.dispose();
      } catch {
      }
    }
  };
}
function registerAskAi(ctx) {
  ctx.effect(
    () => ctx.connection.rpc.handle(ASK_AI_CHANNEL, createAskAiHandler(ctx), { authority: "trusted-host" }),
    "dsh-plannotator: ask-ai rpc channel"
  );
}

// src/index.ts
var name = "dsh-plannotator";
var inject = ["connection"];
function apply(ctx) {
  registerAskAi(ctx);
}
export {
  apply,
  inject,
  name
};
