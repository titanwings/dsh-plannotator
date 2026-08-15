window.__ModuleLoader__.load({ id: "@dsh-external/dsh-plannotator", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  PlannotatorPanel: () => PlannotatorPanel,
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  planReviewOf: () => planReviewOf,
  renderPlanFeedback: () => renderPlanFeedback,
  selectPlanReview: () => selectPlanReview
});
module.exports = __toCommonJS(index_exports);

// src/client/ask-ai.ts
var AskAiError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "AskAiError";
  }
};
var CHANNEL = "/dsh-plannotator";
var ENDPOINT = "ask";
function randomId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `ask-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function isResult(value) {
  if (value === null || typeof value !== "object") return false;
  const result = value;
  return result.ok === true || result.ok === false;
}
function unwrap(result) {
  if (!result.ok) {
    if (result.error.code === "cancelled") {
      throw new DOMException(result.error.message, "AbortError");
    }
    throw new AskAiError(result.error.message, result.error.code);
  }
  const value = result.value;
  if (value === null || typeof value !== "object" || typeof value.answer !== "string") {
    throw new AskAiError("the host returned a malformed Ask AI answer", "internal");
  }
  return value.answer;
}
async function callViaFetch(request, signal) {
  const rpcId = randomId();
  const response = await fetch(`${CHANNEL}/${ENDPOINT}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "client-request", rpcId, method: ENDPOINT, payload: request }),
    signal
  });
  if (!response.ok) {
    throw new AskAiError(`transport failure: HTTP ${response.status}`, "transport");
  }
  const full = await response.json();
  if (full.type !== "server-response" || full.rpcId !== rpcId || !isResult(full.result)) {
    throw new AskAiError("the host returned a malformed Ask AI response", "transport");
  }
  return unwrap(full.result);
}
async function callViaConnection(connection, request, signal) {
  try {
    return unwrap(await connection.rpc.call(CHANNEL, ENDPOINT, request, signal));
  } catch (cause) {
    if (cause instanceof Error && cause.name === "ZodError") {
      throw new AskAiError("the plan Q&A service returned an invalid response", "internal");
    }
    throw cause;
  }
}
var activeConnection;
function setAskAiConnection(next) {
  activeConnection = next;
}
function callAskAi(request, signal) {
  if (activeConnection !== void 0) return callViaConnection(activeConnection, request, signal);
  return callViaFetch(request, signal);
}

// src/client/PlannotatorPanel.tsx
var import_react2 = require("react");
var import_react_dom = require("react-dom");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/AskAISection.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime = require("react/jsx-runtime");
function AskAISection({
  entries,
  draft,
  onDraftChange,
  stagedQuote,
  onClearQuote,
  busy,
  onSend,
  onStop,
  onRetry,
  copy,
  inputId
}) {
  const listRef = (0, import_react.useRef)(null);
  const inputRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (stagedQuote !== null) inputRef.current?.focus();
  }, [stagedQuote]);
  (0, import_react.useEffect)(() => {
    const list = listRef.current;
    if (list !== null) list.scrollTop = list.scrollHeight;
  }, [entries]);
  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!busy && draft.trim() !== "") onSend();
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "dsh-plannotator-ask", "aria-label": copy.label, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref: listRef, className: "dsh-plannotator-ask-thread", children: [
      entries.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-plannotator-empty", children: copy.empty }),
      entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { className: "dsh-plannotator-ask-entry", children: [
        entry.quote !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-plannotator-quote", children: entry.quote }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-plannotator-ask-question", children: entry.question }),
        entry.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-plannotator-ask-pending", role: "status", children: copy.answering }),
        entry.status === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-plannotator-ask-answer", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.MarkdownText, { text: entry.answer }) }),
        entry.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-plannotator-ask-error", role: "alert", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: entry.error }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { size: "sm", variant: "ghost", disabled: busy, onClick: () => {
            onRetry(entry);
          }, children: copy.retry })
        ] })
      ] }, entry.id))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-plannotator-ask-composer", children: [
      stagedQuote !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsh-plannotator-ask-quote-chip", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: stagedQuote }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-label": copy.clearQuote, onClick: onClearQuote, children: "\xD7" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsh-plannotator-visually-hidden", htmlFor: inputId, children: copy.placeholder }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "textarea",
        {
          id: inputId,
          ref: inputRef,
          className: "dsh-plannotator-textarea",
          value: draft,
          placeholder: copy.placeholder,
          onChange: (event) => {
            onDraftChange(event.target.value);
          },
          onKeyDown
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsh-plannotator-mini-actions", children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { size: "sm", variant: "outline", onClick: onStop, children: copy.stop }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_dsh_client_ui_primitives.Button,
        {
          size: "sm",
          className: "dsh-plannotator-blue-button",
          disabled: draft.trim() === "",
          onClick: onSend,
          children: copy.send
        }
      ) })
    ] })
  ] });
}

// src/client/feedback.ts
function planRevision(plan) {
  let hash = 2166136261;
  for (let index = 0; index < plan.length; index += 1) {
    hash ^= plan.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function blockquote(value) {
  return value.split("\n").map((line) => `> ${line}`).join("\n");
}
function renderPlanFeedback(annotations, general, revision) {
  const ordered = [...annotations].sort((left, right) => left.start - right.start || left.createdAt - right.createdAt || left.id.localeCompare(right.id));
  const sections = ordered.map((annotation, index) => [
    `## ${index + 1}. Comment on selected plan text`,
    "",
    blockquote(annotation.quote),
    "",
    `**Requested change:** ${annotation.comment.trim()}`
  ].join("\n"));
  if (general.trim() !== "") {
    sections.push([
      "## Overall feedback",
      "",
      general.trim()
    ].join("\n"));
  }
  return [
    "# Plan Review Feedback",
    "",
    "Revise the plan to address every item below, then present the updated plan for review.",
    "",
    `Plan revision: \`${revision}\``,
    "",
    ...sections.join("\n\n").split("\n")
  ].join("\n").trim();
}
function parseStoredDraft(value, revision) {
  if (value === null) return void 0;
  try {
    const parsed = JSON.parse(value);
    if (parsed.revision !== revision || !Array.isArray(parsed.annotations) || typeof parsed.general !== "string") return void 0;
    const annotations = [];
    for (const item of parsed.annotations) {
      if (item === null || typeof item !== "object") return void 0;
      const candidate = item;
      if (typeof candidate.id !== "string" || typeof candidate.start !== "number" || !Number.isSafeInteger(candidate.start) || typeof candidate.end !== "number" || !Number.isSafeInteger(candidate.end) || candidate.start < 0 || candidate.end <= candidate.start || typeof candidate.quote !== "string" || candidate.quote === "" || typeof candidate.prefix !== "string" || typeof candidate.suffix !== "string" || typeof candidate.comment !== "string" || candidate.comment.trim() === "" || typeof candidate.createdAt !== "number" || !Number.isSafeInteger(candidate.createdAt)) {
        return void 0;
      }
      annotations.push(candidate);
    }
    return { revision, annotations, general: parsed.general };
  } catch {
    return void 0;
  }
}

// src/client/plan-review.ts
function planReviewOf(wait) {
  const questions = wait.payload.questions;
  if (questions.length !== 1) return void 0;
  const question = questions[0];
  if (question === void 0) return void 0;
  if (question.intent?.kind !== "plan-review" || question.detail === void 0) return void 0;
  if (question.multiSelect === true) return void 0;
  const options = question.options ?? [];
  if (options.length === 0 || options.length > 2) return void 0;
  const approveLabel = question.intent.approve;
  if (approveLabel === void 0) return void 0;
  const approve = options.find((option) => option.label === approveLabel);
  if (approve === void 0) return void 0;
  const decline = options.find((option) => option.label !== approveLabel);
  return {
    wait,
    id: question.id,
    question: question.question,
    plan: question.detail,
    approve,
    ...decline === void 0 ? {} : { decline }
  };
}
function selectPlanReview({ interactions }) {
  for (const interaction of interactions) {
    if (interaction.kind !== "question") continue;
    const wait = interaction;
    if (planReviewOf(wait) !== void 0) return wait;
  }
  return null;
}
async function accepted(receipt) {
  const result = await receipt;
  if (!result.accepted) {
    throw new Error(`plan review response rejected: ${result.reason ?? "unknown reason"}`);
  }
}
function approvePlan(review) {
  return accepted(review.wait.respond({
    ok: true,
    value: {
      sessionId: review.wait.sessionId,
      answer: { answers: [{ id: review.id, selected: [review.approve.label] }] }
    }
  }));
}
function requestPlanChanges(review, feedback) {
  if (feedback.trim() === "") throw new Error("plan review feedback must not be empty");
  return accepted(review.wait.respond({
    ok: true,
    value: {
      sessionId: review.wait.sessionId,
      answer: { answers: [{ id: review.id, selected: [], custom: feedback }] }
    }
  }));
}
function dismissPlanReview(review) {
  return accepted(review.wait.respond({
    ok: false,
    error: {
      code: "cancelled",
      message: "the user closed this plan review to discuss it",
      details: {}
    }
  }));
}

// src/client/selection.ts
function anchorFromRange(root, range) {
  const before = document.createRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const raw = range.toString();
  const leading = raw.length - raw.trimStart().length;
  const quote = raw.trim();
  if (quote === "" || quote.length > 800) return void 0;
  const start = before.toString().length + leading;
  const end = start + quote.length;
  const fullText = root.textContent ?? "";
  const rect = range.getBoundingClientRect();
  return {
    start,
    end,
    quote,
    prefix: fullText.slice(Math.max(0, start - 48), start),
    suffix: fullText.slice(end, end + 48),
    rect: { left: rect.left, bottom: rect.bottom }
  };
}
function selectionAnchor(root) {
  const selection = window.getSelection();
  if (selection === null || selection.rangeCount !== 1 || selection.isCollapsed) return void 0;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return void 0;
  return anchorFromRange(root, range);
}
function elementAnchor(root, element) {
  if (element === root || !root.contains(element)) return void 0;
  const range = document.createRange();
  range.selectNodeContents(element);
  return anchorFromRange(root, range);
}
function rangeForAnchor(root, start, end) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let startNode;
  let startOffset = 0;
  let endNode;
  let endOffset = 0;
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node;
    const next = offset + text.data.length;
    if (startNode === void 0 && start >= offset && start <= next) {
      startNode = text;
      startOffset = start - offset;
    }
    if (end >= offset && end <= next) {
      endNode = text;
      endOffset = end - offset;
      break;
    }
    offset = next;
  }
  if (startNode === void 0 || endNode === void 0) return void 0;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}
function applyAnnotationHighlights(root, annotations) {
  const highlights = CSS.highlights;
  if (highlights === void 0 || typeof Highlight === "undefined") return () => void 0;
  const ranges = annotations.flatMap((annotation) => {
    const range = rangeForAnchor(root, annotation.start, annotation.end);
    if (range === void 0 || range.toString().trim() !== annotation.quote.trim()) return [];
    return [range];
  });
  const key = "dsh-plannotator-annotations";
  if (ranges.length > 0) highlights.set(key, new Highlight(...ranges));
  else highlights.delete(key);
  return () => {
    highlights.delete(key);
  };
}

// src/client/layout.ts
var SHEET_MAX_WIDTH = 640;
var DOCKED_MIN_WIDTH = 1480;
function panelModeForWidth(width) {
  if (width <= SHEET_MAX_WIDTH) return "sheet";
  if (width >= DOCKED_MIN_WIDTH) return "docked";
  return "drawer";
}

// src/client/PlannotatorPanel.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function readPanelMode() {
  return panelModeForWidth(window.innerWidth);
}
function usePanelMode() {
  const [mode, setMode] = (0, import_react2.useState)(readPanelMode);
  (0, import_react2.useEffect)(() => {
    const docked = window.matchMedia("(min-width: 1480px)");
    const sheet = window.matchMedia("(max-width: 640px)");
    const sync = () => {
      setMode(sheet.matches ? "sheet" : docked.matches ? "docked" : "drawer");
    };
    docked.addEventListener("change", sync);
    sheet.addEventListener("change", sync);
    return () => {
      docked.removeEventListener("change", sync);
      sheet.removeEventListener("change", sync);
    };
  }, []);
  return mode;
}
function copyOf(t) {
  return {
    header: t("header"),
    ready: t("ready"),
    readyHint: t("readyHint"),
    open: t("open"),
    reopen: t("reopen"),
    collapse: t("collapse"),
    annotation: (count) => t(count === 1 ? "annotationOne" : "annotationMany", { count }),
    selectHint: t("selectHint"),
    newComment: t("newComment"),
    commentPlaceholder: t("commentPlaceholder"),
    add: t("add"),
    cancel: t("cancel"),
    overall: t("overall"),
    overallPlaceholder: t("overallPlaceholder"),
    discuss: t("discuss"),
    approve: t("approve"),
    approveAnyway: t("approveAnyway"),
    discardConfirm: t("discardConfirm"),
    send: (count) => t(count === 1 ? "sendOne" : "sendMany", { count }),
    commentButton: t("commentButton"),
    delete: (number) => t("delete", { number }),
    goTo: (number) => t("goTo", { number }),
    shortcut: t("shortcut"),
    annotationsTab: t("annotationsTab"),
    askTab: t("askTab"),
    askButton: t("askButton"),
    ask: {
      label: t("askTab"),
      placeholder: t("askPlaceholder"),
      send: t("askSend"),
      stop: t("askStop"),
      retry: t("askRetry"),
      empty: t("askEmpty"),
      clearQuote: t("askClearQuote"),
      answering: t("askAnswering")
    }
  };
}
function draftKey(wait) {
  return `dsh-plannotator:draft:v1:${wait.sessionId}:${wait.key}`;
}
function annotationId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function readDraft(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeDraft(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
}
function removeDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
  }
}
function PlannotatorPanel({
  matched,
  t
}) {
  const review = planReviewOf(matched);
  if (review === void 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PlannotatorReview, { matched, review, t }, `${matched.sessionId}:${matched.key}`);
}
function PlannotatorReview({
  matched,
  review,
  t
}) {
  const copy = copyOf(t);
  const revision = (0, import_react2.useMemo)(() => planRevision(review.plan), [review.plan]);
  const storageKey = (0, import_react2.useMemo)(() => draftKey(matched), [matched]);
  const restored = (0, import_react2.useMemo)(() => parseStoredDraft(readDraft(storageKey), revision), [storageKey, revision]);
  const [annotations, setAnnotations] = (0, import_react2.useState)(restored?.annotations ?? []);
  const [general, setGeneral] = (0, import_react2.useState)(restored?.general ?? "");
  const [selection, setSelection] = (0, import_react2.useState)(null);
  const [comment, setComment] = (0, import_react2.useState)("");
  const [tab, setTab] = (0, import_react2.useState)("annotations");
  const [askEntries, setAskEntries] = (0, import_react2.useState)([]);
  const [askDraft, setAskDraft] = (0, import_react2.useState)("");
  const [askQuote, setAskQuote] = (0, import_react2.useState)(null);
  const askAbortRef = (0, import_react2.useRef)(null);
  const [busy, setBusy] = (0, import_react2.useState)(null);
  const [error, setError] = (0, import_react2.useState)(null);
  const [confirmApprove, setConfirmApprove] = (0, import_react2.useState)(false);
  const mode = usePanelMode();
  const previousMode = (0, import_react2.useRef)(mode);
  const [openByMode, setOpenByMode] = (0, import_react2.useState)({
    docked: true,
    drawer: false,
    sheet: false
  });
  const panelOpen = openByMode[mode];
  const panelId = `dsh-plannotator-panel-${(0, import_react2.useId)().replaceAll(":", "")}`;
  const documentRef = (0, import_react2.useRef)(null);
  const commentRef = (0, import_react2.useRef)(null);
  const launcherRef = (0, import_react2.useRef)(null);
  const panelTitleRef = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    if (annotations.length === 0 && general.trim() === "") {
      removeDraft(storageKey);
      return;
    }
    writeDraft(storageKey, JSON.stringify({ revision, annotations, general }));
  }, [annotations, general, revision, storageKey]);
  (0, import_react2.useEffect)(() => {
    const root = documentRef.current;
    if (root === null) return;
    return applyAnnotationHighlights(root, annotations);
  }, [annotations, panelOpen]);
  (0, import_react2.useEffect)(() => {
    if (selection !== null && tab === "annotations") commentRef.current?.focus();
  }, [selection, tab]);
  (0, import_react2.useEffect)(() => () => {
    askAbortRef.current?.abort();
  }, []);
  (0, import_react2.useEffect)(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setComment("");
  }, [mode]);
  const openPanel = () => {
    setOpenByMode((current) => ({ ...current, [mode]: true }));
    requestAnimationFrame(() => {
      panelTitleRef.current?.focus();
    });
  };
  const closePanel = () => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setComment("");
    setOpenByMode((current) => ({ ...current, [mode]: false }));
    requestAnimationFrame(() => {
      launcherRef.current?.focus();
    });
  };
  const captureSelection = (0, import_react2.useCallback)(() => {
    const root = documentRef.current;
    if (root === null) return;
    const next = selectionAnchor(root);
    if (next !== void 0) {
      setSelection(next);
      setComment("");
      setConfirmApprove(false);
    }
  }, []);
  const captureBlock = (event) => {
    const root = documentRef.current;
    if (root === null || !(event.target instanceof Element)) return;
    const block = event.target.closest("p,li,h1,h2,h3,h4,h5,h6,strong,code");
    if (!(block instanceof HTMLElement)) return;
    const next = elementAnchor(root, block);
    if (next === void 0) return;
    setSelection(next);
    setComment("");
    setConfirmApprove(false);
  };
  const repositionSelection = () => {
    const root = documentRef.current;
    if (root === null) return;
    setSelection((current) => {
      if (current === null) return null;
      const range = rangeForAnchor(root, current.start, current.end);
      if (range === void 0) return current;
      const rect = range.getBoundingClientRect();
      if (rect.left === current.rect.left && rect.bottom === current.rect.bottom) return current;
      return { ...current, rect: { left: rect.left, bottom: rect.bottom } };
    });
  };
  const onKeyUp = (event) => {
    if (event.key === "Shift" || event.shiftKey) captureSelection();
  };
  const addComment = () => {
    if (selection === null || comment.trim() === "") return;
    setAnnotations((current) => [...current, {
      id: annotationId(),
      start: selection.start,
      end: selection.end,
      quote: selection.quote,
      prefix: selection.prefix,
      suffix: selection.suffix,
      comment: comment.trim(),
      createdAt: Date.now()
    }]);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setComment("");
  };
  const beginAsk = () => {
    if (selection === null) return;
    setAskQuote(selection.quote);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setComment("");
    setTab("ask");
  };
  const launchAsk = (entry, history) => {
    const controller = new AbortController();
    askAbortRef.current = controller;
    void callAskAi({
      sessionId: review.wait.sessionId,
      plan: review.plan,
      question: entry.question,
      ...entry.quote !== void 0 ? { quote: entry.quote } : {},
      history
    }, controller.signal).then((answer) => {
      setAskEntries((current) => current.map((item) => item.id === entry.id ? { ...item, status: "done", answer } : item));
    }).catch((cause) => {
      if (controller.signal.aborted || cause instanceof DOMException && cause.name === "AbortError") {
        setAskEntries((current) => current.filter((item) => item.id !== entry.id));
        return;
      }
      const message = cause instanceof Error ? cause.message : String(cause);
      setAskEntries((current) => current.map((item) => item.id === entry.id ? { ...item, status: "error", error: message } : item));
    }).finally(() => {
      if (askAbortRef.current === controller) askAbortRef.current = null;
    });
  };
  const askHistory = (excludeId) => askEntries.filter((item) => item.status === "done" && item.id !== excludeId).map((item) => ({ question: item.question.slice(0, 8e3), answer: item.answer.slice(0, 32e3) })).slice(-20);
  const sendAsk = () => {
    const question = askDraft.trim();
    if (question === "" || askAbortRef.current !== null) return;
    const entry = {
      id: annotationId(),
      ...askQuote !== null ? { quote: askQuote } : {},
      question,
      answer: "",
      status: "pending"
    };
    const history = askHistory();
    setAskEntries((current) => [...current, entry]);
    setAskDraft("");
    setAskQuote(null);
    launchAsk(entry, history);
  };
  const retryAsk = (entry) => {
    if (askAbortRef.current !== null) return;
    const pending = {
      id: entry.id,
      ...entry.quote !== void 0 ? { quote: entry.quote } : {},
      question: entry.question,
      answer: "",
      status: "pending"
    };
    setAskEntries((current) => current.map((item) => item.id === entry.id ? pending : item));
    launchAsk(pending, askHistory(entry.id));
  };
  const stopAsk = () => {
    askAbortRef.current?.abort();
  };
  const settle = (kind, send) => {
    setBusy(kind);
    setError(null);
    void send().then(() => {
      removeDraft(storageKey);
    }).catch((cause) => {
      setBusy(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    });
  };
  const hasFeedback = annotations.length > 0 || general.trim() !== "";
  const sendFeedback = () => {
    const feedback = renderPlanFeedback(annotations, general, revision);
    settle("feedback", () => requestPlanChanges(review, feedback));
  };
  const approve = () => {
    if (hasFeedback && !confirmApprove) {
      setConfirmApprove(true);
      return;
    }
    settle("approve", () => approvePlan(review));
  };
  const focusAnnotation = (annotation) => {
    const root = documentRef.current;
    if (root === null) return;
    const range = rangeForAnchor(root, annotation.start, annotation.end);
    const element = range?.startContainer.parentElement;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    element?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  };
  const feedbackCount = annotations.length + (general.trim() === "" ? 0 : 1);
  const panel = panelOpen ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "aside",
    {
      id: panelId,
      className: "dsh-plannotator-panel",
      "aria-labelledby": `${panelId}-title`,
      "aria-busy": busy !== null || void 0,
      "data-dsh-plannotator": "",
      "data-plan-review-panel": "",
      "data-panel-mode": mode,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "dsh-plannotator-panel-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-plannotator-panel-heading", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsh-plannotator-dot" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { id: `${panelId}-title`, ref: panelTitleRef, tabIndex: -1, children: copy.header }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: copy.annotation(annotations.length) })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              type: "button",
              className: "dsh-plannotator-collapse",
              "aria-label": copy.collapse,
              "aria-controls": panelId,
              "aria-expanded": "true",
              onClick: closePanel,
              children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconChevronRightOutline14, {})
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-plannotator-workspace", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "div",
            {
              ref: documentRef,
              className: "dsh-plannotator-document",
              "data-plannotator-document": "",
              onMouseUp: captureSelection,
              onDoubleClick: captureBlock,
              onKeyUp,
              onScroll: repositionSelection,
              children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.MarkdownText, { text: review.plan })
            }
          ),
          selection !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "div",
            {
              className: "dsh-plannotator-selection-action",
              style: {
                left: Math.min(window.innerWidth - 220, Math.max(8, selection.rect.left)),
                top: Math.min(window.innerHeight - 48, selection.rect.bottom)
              },
              onMouseDown: (event) => {
                event.preventDefault();
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { type: "button", onClick: () => {
                  setTab("annotations");
                }, children: [
                  "\uFF0B ",
                  copy.commentButton
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { type: "button", onClick: beginAsk, children: [
                  "\u2726 ",
                  copy.askButton
                ] })
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "dsh-plannotator-review", "aria-label": copy.annotation(annotations.length), children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-plannotator-tabs", role: "tablist", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "button",
                {
                  type: "button",
                  role: "tab",
                  "aria-selected": tab === "annotations",
                  className: tab === "annotations" ? "dsh-plannotator-tab dsh-plannotator-tab-active" : "dsh-plannotator-tab",
                  onClick: () => {
                    setTab("annotations");
                  },
                  children: [
                    copy.annotationsTab,
                    annotations.length > 0 ? ` (${annotations.length})` : ""
                  ]
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  type: "button",
                  role: "tab",
                  "aria-selected": tab === "ask",
                  className: tab === "ask" ? "dsh-plannotator-tab dsh-plannotator-tab-active" : "dsh-plannotator-tab",
                  onClick: () => {
                    setTab("ask");
                  },
                  children: copy.askTab
                }
              )
            ] }),
            tab === "ask" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              AskAISection,
              {
                entries: askEntries,
                draft: askDraft,
                onDraftChange: setAskDraft,
                stagedQuote: askQuote,
                onClearQuote: () => {
                  setAskQuote(null);
                },
                busy: askAbortRef.current !== null,
                onSend: sendAsk,
                onStop: stopAsk,
                onRetry: retryAsk,
                copy: copy.ask,
                inputId: `${panelId}-ask`
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-plannotator-review-title", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: copy.annotation(annotations.length) }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: copy.shortcut })
              ] }),
              selection !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "dsh-plannotator-new", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsh-plannotator-annotation-head", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: copy.newComment }) }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsh-plannotator-quote", children: selection.quote }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "dsh-plannotator-visually-hidden", htmlFor: `${panelId}-comment`, children: copy.newComment }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "textarea",
                  {
                    id: `${panelId}-comment`,
                    ref: commentRef,
                    className: "dsh-plannotator-textarea",
                    value: comment,
                    placeholder: copy.commentPlaceholder,
                    onChange: (event) => {
                      setComment(event.target.value);
                    },
                    onKeyDown: (event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") addComment();
                      if (event.key === "Escape") {
                        setSelection(null);
                        setComment("");
                      }
                    }
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-plannotator-mini-actions", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { size: "sm", variant: "ghost", onClick: () => {
                    setSelection(null);
                    setComment("");
                  }, children: copy.cancel }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { size: "sm", className: "dsh-plannotator-blue-button", disabled: comment.trim() === "", onClick: addComment, children: copy.add })
                ] })
              ] }),
              annotations.map((annotation, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "dsh-plannotator-annotation", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-plannotator-annotation-head", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                    "button",
                    {
                      type: "button",
                      className: "dsh-plannotator-icon-button",
                      "aria-label": copy.goTo(index + 1),
                      onClick: () => {
                        focusAnnotation(annotation);
                      },
                      children: [
                        "#",
                        index + 1
                      ]
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "dsh-plannotator-icon-button",
                      "aria-label": copy.delete(index + 1),
                      onClick: () => {
                        setAnnotations((current) => current.filter((item) => item.id !== annotation.id));
                        setConfirmApprove(false);
                      },
                      children: "\xD7"
                    }
                  )
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dsh-plannotator-icon-button dsh-plannotator-quote", onClick: () => {
                  focusAnnotation(annotation);
                }, children: annotation.quote }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsh-plannotator-comment", children: annotation.comment })
              ] }, annotation.id)),
              selection === null && annotations.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsh-plannotator-empty", children: copy.selectHint }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "dsh-plannotator-general", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "dsh-plannotator-annotation-head", htmlFor: `${panelId}-overall`, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: copy.overall }) }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                  "textarea",
                  {
                    id: `${panelId}-overall`,
                    className: "dsh-plannotator-textarea",
                    value: general,
                    placeholder: copy.overallPlaceholder,
                    onChange: (event) => {
                      setGeneral(event.target.value);
                      setConfirmApprove(false);
                    }
                  }
                )
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("footer", { className: "dsh-plannotator-footer", children: [
          error !== null ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsh-plannotator-status", role: "alert", children: error }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dsh-plannotator-status", role: "status", "aria-live": "polite", children: confirmApprove ? copy.discardConfirm : "" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-plannotator-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_dsh_client_ui_primitives2.Button,
              {
                size: "sm",
                variant: "ghost",
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconEditOutline16, { size: 14 }),
                disabled: busy !== null,
                onClick: () => {
                  settle("dismiss", () => dismissPlanReview(review));
                },
                children: copy.discuss
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_dsh_client_ui_primitives2.Button,
              {
                size: "sm",
                variant: "outline",
                className: hasFeedback ? "dsh-plannotator-blue-button" : void 0,
                disabled: busy !== null || !hasFeedback,
                onClick: sendFeedback,
                children: busy === "feedback" ? "\u2026" : copy.send(feedbackCount)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_dsh_client_ui_primitives2.Button,
              {
                size: "sm",
                variant: "outline",
                className: confirmApprove ? "dsh-plannotator-danger-button" : hasFeedback ? void 0 : "dsh-plannotator-blue-button",
                disabled: busy !== null,
                onClick: approve,
                children: busy === "approve" ? "\u2026" : confirmApprove ? copy.approveAnyway : copy.approve
              }
            )
          ] })
        ] })
      ]
    }
  ) : mode === "docked" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "button",
    {
      type: "button",
      className: "dsh-plannotator-rail-button",
      "data-panel-mode": mode,
      "aria-label": copy.open,
      "aria-expanded": "false",
      onClick: openPanel,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconChevronLeftOutline14, {}),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: copy.reopen }),
        annotations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: annotations.length })
      ]
    }
  ) : null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-plannotator-launcher", "data-plan-review-key": matched.key, "data-dsh-plannotator-launcher": "", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dsh-plannotator-dot" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dsh-plannotator-launcher-copy", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: copy.ready }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: copy.readyHint })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          ref: launcherRef,
          className: "dsh-plannotator-blue-button",
          "aria-controls": panelOpen ? panelId : void 0,
          "aria-expanded": panelOpen,
          onClick: openPanel,
          children: copy.open
        }
      )
    ] }),
    (0, import_react_dom.createPortal)(panel, document.body)
  ] });
}

// src/client/styles.ts
var STYLE_ID = "dsh-plannotator-styles";
var STYLE_OWNERS = "data-dsh-plannotator-style-owners";
var CSS_TEXT = String.raw`
.dsh-plannotator-launcher,.dsh-plannotator-panel,.dsh-plannotator-panel *,.dsh-plannotator-rail-button{box-sizing:border-box}
.dsh-plannotator-launcher{display:flex;align-items:center;gap:11px;margin:6px calc(var(--dsh-composer-side-clearance,16px) + 16px) 10px;padding:9px 10px 9px 12px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 38%,var(--dsw-alias-border-l2,#d9dce3));border-radius:16px;background:color-mix(in srgb,var(--dsw-alias-state-business-tertiary,#edf3ff) 72%,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#20242c);box-shadow:var(--dsw-shadow-lv1,0 3px 12px rgba(30,64,175,.08))}
.dsh-plannotator-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-business-primary,#4d6bfe);box-shadow:0 0 0 4px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 12%,transparent)}
.dsh-plannotator-launcher-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:1px}.dsh-plannotator-launcher-copy strong{font-size:13px;line-height:18px}.dsh-plannotator-launcher-copy span{overflow:hidden;color:var(--dsw-alias-label-secondary,#596273);font-size:11px;line-height:16px;text-overflow:ellipsis;white-space:nowrap}
.dsh-plannotator-blue-button{display:inline-flex;min-height:28px;align-items:center;justify-content:center;padding:4px 11px;border:1px solid var(--dsw-alias-button-info-fill,var(--dsw-alias-state-business-primary,#4d6bfe));border-radius:14px;background:var(--dsw-alias-button-info-fill,var(--dsw-alias-state-business-primary,#4d6bfe));color:var(--dsw-alias-label-primary-foreground,#fff);font:600 12px/18px var(--dsw-font-family,system-ui);cursor:pointer}.dsh-plannotator-blue-button:hover:not(:disabled){background:var(--dsw-alias-button-info-hover,#3e5dde);border-color:var(--dsw-alias-button-info-hover,#3e5dde)}.dsh-plannotator-blue-button:disabled{cursor:not-allowed;opacity:.4}
.dsh-plannotator-panel{position:fixed;z-index:80;top:56px;right:8px;bottom:12px;display:flex;min-width:0;overflow:hidden;flex-direction:column;width:min(420px,calc(100vw - 72px));border:1px solid var(--dsw-alias-border-l2,#d9dce3);border-radius:18px;background:var(--dsw-alias-bg-base,#fff);box-shadow:var(--dsw-shadow-lv2,0 16px 48px rgba(17,24,39,.16));color:var(--dsw-alias-label-primary,#20242c);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);animation:dsh-plannotator-in var(--ds-transition-duration-slow,180ms) var(--ds-ease-in-out,ease)}
@keyframes dsh-plannotator-in{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
.dsh-plannotator-panel-header{display:flex;min-height:54px;flex:none;align-items:center;justify-content:space-between;gap:12px;padding:10px 10px 10px 16px;border-bottom:1px solid var(--dsw-alias-border-l2,#d9dce3);background:color-mix(in srgb,var(--dsw-alias-state-business-tertiary,#edf3ff) 66%,var(--dsw-alias-bg-base,#fff))}
.dsh-plannotator-panel-heading{display:flex;min-width:0;align-items:center;gap:11px}.dsh-plannotator-panel-heading>div{display:flex;min-width:0;flex-direction:column}.dsh-plannotator-panel-heading h2{overflow:hidden;margin:0;border-radius:5px;font-size:14px;font-weight:600;line-height:20px;text-overflow:ellipsis;white-space:nowrap}.dsh-plannotator-panel-heading h2:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4d6bfe);outline-offset:2px}.dsh-plannotator-panel-heading span:last-child{color:var(--dsw-alias-label-secondary,#596273);font-size:11px;line-height:15px}
.dsh-plannotator-collapse{display:inline-flex;width:30px;height:30px;flex:none;align-items:center;justify-content:center;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary,#596273);cursor:pointer}.dsh-plannotator-collapse:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.dsh-plannotator-workspace{display:flex;min-height:0;flex:1;flex-direction:column;background:var(--dsw-alias-bg-base,#fff)}
.dsh-plannotator-document{position:relative;min-width:0;min-height:200px;flex:1 1 58%;overflow:auto;padding:18px 20px 32px;overflow-wrap:anywhere;overscroll-behavior:contain;scrollbar-gutter:stable;font-size:13px;line-height:1.62}.dsh-plannotator-document pre{overflow-x:auto}.dsh-plannotator-document code{overflow-wrap:normal}
.dsh-plannotator-document ::selection{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 22%,transparent)}
::highlight(dsh-plannotator-annotations){background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 18%,transparent);text-decoration:underline;text-decoration-color:var(--dsw-alias-state-business-primary,#4d6bfe);text-decoration-thickness:2px;text-underline-offset:3px}
.dsh-plannotator-selection-action{position:fixed;z-index:90;display:flex;gap:6px;transform:translateY(8px)}.dsh-plannotator-selection-action>button{padding:6px 10px;border:1px solid var(--dsw-alias-state-business-primary,#4d6bfe);border-radius:9px;background:var(--dsw-alias-button-info-fill,var(--dsw-alias-state-business-primary,#4d6bfe));box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.18));color:var(--dsw-alias-label-primary-foreground,#fff);font:600 12px/18px var(--dsw-font-family,system-ui);cursor:pointer}
 .dsh-plannotator-tabs{display:flex;gap:4px;margin:0 2px 9px;border-bottom:1px solid var(--dsw-alias-border-l2,#d9dce3);padding-bottom:7px}
 .dsh-plannotator-tab{padding:3px 9px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#596273);font:600 11px/16px var(--dsw-font-family,system-ui);cursor:pointer}.dsh-plannotator-tab:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1))}.dsh-plannotator-tab-active{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 12%,transparent);color:var(--dsw-alias-state-business-primary,#4d6bfe)}
 .dsh-plannotator-ask{display:flex;min-height:0;flex-direction:column;gap:8px}
 .dsh-plannotator-ask-thread{display:flex;min-height:60px;max-height:300px;flex-direction:column;gap:8px;overflow:auto;overscroll-behavior:contain}
 .dsh-plannotator-ask-entry{padding:9px 10px;border:1px solid var(--dsw-alias-border-l2,#d9dce3);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#fff)}
 .dsh-plannotator-ask-question{margin-bottom:6px;font-size:12px;font-weight:600;line-height:18px;white-space:pre-wrap}
 .dsh-plannotator-ask-answer{font-size:12px;line-height:1.6}.dsh-plannotator-ask-answer pre{overflow-x:auto}
 .dsh-plannotator-ask-pending{color:var(--dsw-alias-label-tertiary,#8991a2);font-size:11px;line-height:16px}
 .dsh-plannotator-ask-error{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--dsw-alias-state-error-primary,#cc3d4a);font-size:11px;line-height:16px}
 .dsh-plannotator-ask-composer{display:flex;flex-direction:column;gap:7px}
 .dsh-plannotator-ask-quote-chip{display:flex;align-items:flex-start;gap:7px;padding:7px 9px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 40%,var(--dsw-alias-border-l2,#d9dce3));border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-business-tertiary,#edf3ff) 72%,var(--dsw-alias-bg-base,#fff))}.dsh-plannotator-ask-quote-chip span{display:-webkit-box;overflow:hidden;flex:1;color:var(--dsw-alias-label-secondary,#596273);font:11px/17px ui-monospace,SFMono-Regular,Menlo,monospace;-webkit-line-clamp:2;-webkit-box-orient:vertical}.dsh-plannotator-ask-quote-chip button{flex:none;padding:0 4px;border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#8991a2);cursor:pointer}
.dsh-plannotator-review{min-width:0;min-height:148px;max-height:44%;flex:0 1 auto;overflow:auto;padding:12px;border-top:1px solid var(--dsw-alias-border-l2,#d9dce3);background:var(--dsw-alias-bg-layer-1,#f7f8fa);overflow-wrap:anywhere;overscroll-behavior:contain}
.dsh-plannotator-review-title{display:flex;align-items:center;justify-content:space-between;margin:0 2px 9px;color:var(--dsw-alias-label-secondary,#596273);font-size:11px;font-weight:650}.dsh-plannotator-review-title span:last-child{color:var(--dsw-alias-label-tertiary,#8991a2);font-weight:400}
.dsh-plannotator-empty{padding:20px 12px;border:1px dashed var(--dsw-alias-border-l2,#d9dce3);border-radius:12px;color:var(--dsw-alias-label-tertiary,#8991a2);font-size:11px;line-height:1.55;text-align:center}
.dsh-plannotator-annotation,.dsh-plannotator-new,.dsh-plannotator-general{margin-bottom:9px;padding:10px;border:1px solid var(--dsw-alias-border-l2,#d9dce3);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#fff)}
.dsh-plannotator-new{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 10%,transparent)}
.dsh-plannotator-general{margin-top:9px;margin-bottom:0}.dsh-plannotator-quote{display:-webkit-box;overflow:hidden;margin:0 0 7px;color:var(--dsw-alias-label-secondary,#596273);font:11px/17px ui-monospace,SFMono-Regular,Menlo,monospace;text-align:left;-webkit-line-clamp:3;-webkit-box-orient:vertical}.dsh-plannotator-quote:before{content:'“';color:var(--dsw-alias-state-business-primary,#4d6bfe)}.dsh-plannotator-quote:after{content:'”';color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.dsh-plannotator-comment{white-space:pre-wrap;font-size:12px;line-height:18px}.dsh-plannotator-annotation-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;color:var(--dsw-alias-label-tertiary,#8991a2);font-size:11px}
.dsh-plannotator-icon-button{padding:2px 5px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary,#8991a2);cursor:pointer}.dsh-plannotator-icon-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.dsh-plannotator-textarea{display:block;width:100%;min-height:72px;resize:vertical;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2,#cfd4df);border-radius:9px;outline:none;background:var(--dsw-specific-input-major,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#20242c);font:12px/18px var(--dsw-font-family,system-ui)}.dsh-plannotator-textarea:focus{border-color:var(--dsw-alias-state-business-primary,#4d6bfe);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 16%,transparent)}
.dsh-plannotator-mini-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:7px}
.dsh-plannotator-footer{display:flex;flex:none;flex-direction:column;gap:7px;padding:9px 10px 10px;border-top:1px solid var(--dsw-alias-border-l2,#d9dce3);background:var(--dsw-alias-bg-base,#fff)}.dsh-plannotator-status{min-height:16px;color:var(--dsw-alias-state-error-primary,#cc3d4a);font-size:11px;line-height:16px}.dsh-plannotator-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px}.dsh-plannotator-actions>button{white-space:nowrap}
.dsh-plannotator-danger-button{border-color:var(--dsw-alias-state-error-primary,#cc3d4a)!important;background:var(--dsw-alias-state-error-primary,#cc3d4a)!important;color:var(--dsw-alias-label-primary-foreground,#fff)!important}
.dsh-plannotator-rail-button{position:fixed;z-index:79;top:50%;right:0;display:flex;width:44px;min-height:138px;align-items:center;justify-content:center;gap:8px;padding:10px 8px;border:1px solid var(--dsw-alias-state-business-primary,#4d6bfe);border-right:0;border-radius:15px 0 0 15px;background:var(--dsw-alias-state-business-tertiary,#edf3ff);box-shadow:var(--dsw-shadow-lv1,0 6px 20px rgba(30,64,175,.12));color:var(--dsw-alias-state-business-primary,#4d6bfe);cursor:pointer;transform:translateY(-50%);writing-mode:vertical-rl}.dsh-plannotator-rail-button:hover{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 16%,var(--dsw-alias-bg-base,#fff))}.dsh-plannotator-rail-button span{font-size:12px;font-weight:650;letter-spacing:.04em}.dsh-plannotator-rail-button strong{display:inline-flex;min-width:19px;height:19px;align-items:center;justify-content:center;border-radius:10px;background:var(--dsw-alias-state-business-primary,#4d6bfe);color:var(--dsw-alias-label-primary-foreground,#fff);font-size:10px;writing-mode:horizontal-tb}
.dsh-plannotator-visually-hidden{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;clip-path:inset(50%)!important}
.dsh-plannotator-panel button:focus-visible,.dsh-plannotator-launcher button:focus-visible,.dsh-plannotator-rail-button:focus-visible,.dsh-plannotator-selection-action button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4d6bfe);outline-offset:2px}
@media(min-width:1480px){body:has(>.dsh-plannotator-panel[data-panel-mode='docked'])>#root{width:calc(100% - clamp(440px,28vw,560px))}body:has(>.dsh-plannotator-rail-button[data-panel-mode='docked'])>#root{width:calc(100% - 44px)}.dsh-plannotator-panel[data-panel-mode='docked']{top:0;right:0;bottom:0;width:clamp(440px,28vw,560px);max-width:none;border-width:0 0 0 1px;border-radius:0;box-shadow:none;animation:none}.dsh-plannotator-rail-button[data-panel-mode='docked']{top:0;right:0;bottom:0;width:44px;min-height:0;border-width:0 0 0 1px;border-radius:0;box-shadow:none;transform:none}}
@media(max-width:1479px){.dsh-plannotator-launcher-copy span{display:none}.dsh-plannotator-rail-button{display:none}}
@media(max-width:640px){.dsh-plannotator-launcher{margin-right:8px;margin-left:8px}.dsh-plannotator-panel{top:auto;right:8px;bottom:8px;left:8px;width:auto;height:min(68dvh,620px);border-radius:18px}.dsh-plannotator-document{min-height:160px;padding:16px 16px 24px}.dsh-plannotator-review{max-height:46%}.dsh-plannotator-actions{display:grid;grid-template-columns:1fr 1fr}.dsh-plannotator-actions>button:first-child{grid-column:1/-1}.dsh-plannotator-rail-button{bottom:90px;top:auto;min-height:120px;transform:none}}
@media(prefers-reduced-motion:reduce){.dsh-plannotator-panel{animation:none}.dsh-plannotator-document *{scroll-behavior:auto!important}}
`;
function installStyles() {
  let style = document.getElementById(STYLE_ID);
  if (style !== null && !style.hasAttribute(STYLE_OWNERS)) {
    style.remove();
    style = null;
  }
  if (style === null) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.append(style);
  }
  if (style.textContent !== CSS_TEXT) style.textContent = CSS_TEXT;
  const owners = Number.parseInt(style.getAttribute(STYLE_OWNERS) ?? "0", 10);
  style.setAttribute(STYLE_OWNERS, String(Number.isSafeInteger(owners) ? owners + 1 : 1));
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    const current = Number.parseInt(style.getAttribute(STYLE_OWNERS) ?? "1", 10);
    if (current <= 1) style.remove();
    else style.setAttribute(STYLE_OWNERS, String(current - 1));
  };
}

// src/client/locales.ts
var en = {
  header: "Plannotator",
  ready: "Plan ready for review",
  readyHint: "Comment on exact plan text before implementation starts.",
  open: "Open review",
  reopen: "Review plan",
  collapse: "Collapse review sidebar",
  annotationOne: "{count} annotation",
  annotationMany: "{count} annotations",
  selectHint: "Select text for a precise comment, or double-click a plan block.",
  newComment: "New annotation",
  commentPlaceholder: "What should the agent change here?",
  add: "Add comment",
  cancel: "Cancel",
  overall: "Overall feedback",
  overallPlaceholder: "Optional feedback about the plan as a whole\u2026",
  discuss: "Chat about it",
  approve: "Approve",
  approveAnyway: "Approve anyway",
  discardConfirm: "Your unsent annotations will be discarded.",
  sendOne: "Send {count} comment",
  sendMany: "Send {count} comments",
  commentButton: "Comment",
  delete: "Delete annotation {number}",
  goTo: "Go to annotation {number}",
  shortcut: "Add with Ctrl/\u2318 Enter",
  annotationsTab: "Annotations",
  askTab: "Ask AI",
  askButton: "Ask AI",
  askPlaceholder: "Ask a question about this plan\u2026",
  askSend: "Send",
  askStop: "Stop",
  askRetry: "Retry",
  askEmpty: "Ask anything about this plan. Select plan text first to quote it.",
  askClearQuote: "Remove the quoted excerpt",
  askAnswering: "The plan Q&A agent is answering\u2026"
};
var zh = {
  header: "Plannotator",
  ready: "\u8BA1\u5212\u5DF2\u53EF\u5BA1\u9605",
  readyHint: "\u5728\u5F00\u59CB\u5B9E\u73B0\u524D\uFF0C\u76F4\u63A5\u5BF9\u8BA1\u5212\u539F\u6587\u6DFB\u52A0\u7CBE\u51C6\u610F\u89C1\u3002",
  open: "\u6253\u5F00\u5BA1\u9605\u680F",
  reopen: "\u5BA1\u9605\u8BA1\u5212",
  collapse: "\u6536\u8D77\u8BA1\u5212\u5BA1\u9605\u680F",
  annotationOne: "{count} \u6761\u6279\u6CE8",
  annotationMany: "{count} \u6761\u6279\u6CE8",
  selectHint: "\u62D6\u9009\u6587\u5B57\u505A\u7CBE\u786E\u6279\u6CE8\uFF0C\u6216\u53CC\u51FB\u4EFB\u610F\u8BA1\u5212\u5757\u5FEB\u901F\u6279\u6CE8\u3002",
  newComment: "\u65B0\u6279\u6CE8",
  commentPlaceholder: "\u5E0C\u671B Agent \u5728\u8FD9\u91CC\u4FEE\u6539\u4EC0\u4E48\uFF1F",
  add: "\u6DFB\u52A0\u6279\u6CE8",
  cancel: "\u53D6\u6D88",
  overall: "\u6574\u4F53\u610F\u89C1",
  overallPlaceholder: "\u5BF9\u6574\u4EFD\u8BA1\u5212\u7684\u8865\u5145\u610F\u89C1\uFF08\u53EF\u9009\uFF09\u2026",
  discuss: "\u7EE7\u7EED\u8BA8\u8BBA",
  approve: "\u6279\u51C6\u8BA1\u5212",
  approveAnyway: "\u4ECD\u7136\u6279\u51C6",
  discardConfirm: "\u5C1A\u672A\u53D1\u9001\u7684\u6279\u6CE8\u5C06\u88AB\u4E22\u5F03\u3002",
  sendOne: "\u53D1\u9001 {count} \u6761\u53CD\u9988",
  sendMany: "\u53D1\u9001 {count} \u6761\u53CD\u9988",
  commentButton: "\u6DFB\u52A0\u6279\u6CE8",
  delete: "\u5220\u9664\u7B2C {number} \u6761\u6279\u6CE8",
  goTo: "\u8DF3\u8F6C\u5230\u7B2C {number} \u6761\u6279\u6CE8",
  shortcut: "Ctrl/\u2318 Enter \u6DFB\u52A0",
  annotationsTab: "\u6279\u6CE8",
  askTab: "\u95EE AI",
  askButton: "\u95EE AI",
  askPlaceholder: "\u5C31\u8FD9\u4EFD\u8BA1\u5212\u63D0\u95EE\u2026",
  askSend: "\u53D1\u9001",
  askStop: "\u505C\u6B62",
  askRetry: "\u91CD\u8BD5",
  askEmpty: "\u5173\u4E8E\u8FD9\u4EFD\u8BA1\u5212\u7684\u4EFB\u4F55\u95EE\u9898\u90FD\u53EF\u4EE5\u95EE\uFF1B\u5148\u9009\u4E2D\u8BA1\u5212\u539F\u6587\u5373\u53EF\u5F15\u7528\u3002",
  askClearQuote: "\u79FB\u9664\u5F15\u7528\u7684\u6458\u5F55",
  askAnswering: "\u8BA1\u5212\u95EE\u7B54 Agent \u6B63\u5728\u56DE\u7B54\u2026"
};

// src/client/index.ts
var name = "dsh-plannotator-client";
var inject = ["slots", "locale"];
var NS = "dsh-plannotator";
function apply(ctx) {
  ctx.effect(() => installStyles(), "dsh-plannotator: styles");
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-plannotator: locale");
  ctx.effect(() => {
    setAskAiConnection(ctx.get("connection"));
    return () => {
      setAskAiConnection(void 0);
    };
  }, "dsh-plannotator: ask-ai connection");
  ctx.slots.inject("conversation.composer", () => ctx.slots.register({
    name: "conversation.composer",
    priority: -10,
    locale: NS,
    select: selectPlanReview
  }, PlannotatorPanel));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
