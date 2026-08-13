# dsh-plannotator

<div align="center">

### Review the plan before your coding agent writes the code.

Select exact plan text, attach precise comments, and return one structured
review to the agent—without leaving DeepSeek Harness.

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-Web-111827)](https://github.com/dsh2026/test-titanwings)
[![Plan Review](https://img.shields.io/badge/workflow-Plan_Review-4D6BFE)](#features)
[![MIT License](https://img.shields.io/badge/license-MIT-2563EB)](LICENSE)

**English** · [简体中文](README.zh-CN.md)

[Why it exists](#why-dsh-plannotator) · [Features](#features) · [Install](#install)

</div>

![A real plan review in a collapsible right-side panel inside DeepSeek Harness](docs/01-sidebar-open-en.png)

> “Change the third step” is vague. A comment attached to the exact sentence
> preserves the context the agent needs to revise the plan correctly.

**Select exact text → comment on several risks → send one review → approve when ready.**

## Why dsh-plannotator

Coding agents are good at producing plans, but a binary **Approve / Reject**
decision is too coarse for serious work. Architecture migrations, API changes,
security fixes, and rollout plans often need several independent corrections
before implementation begins.

`dsh-plannotator` turns DSH's native Plan Review into a compact gate plus a
collapsible right-side review panel. The composer stays small while the full
review remains one click away; collapse it to a slim edge rail whenever you
need the conversation back. Your comments travel through DSH's existing
response flow as structured Markdown, so the agent can revise the proposal in
plan mode and ask for review again.

This is an unofficial integration inspired by
[Plannotator](https://github.com/backnotprop/plannotator).

## Features

### Comment on the exact claim—not “somewhere in the plan”

Drag over text for a precise annotation, or double-click a paragraph, list
item, heading, bold phrase, or code fragment. The review keeps the quote and
comment together within the current plan revision.

![Writing a precise annotation in the right-side review panel](docs/02-precise-annotation-en.png)

### Review the whole plan in one pass

Collect multiple comments across compatibility, security, rollback, and tests;
add overall feedback; click an annotation in the review panel to return to its
source; then send one coherent review. This is much faster and less ambiguous
than a sequence of chat messages.

![Three anchored comments and overall feedback in one review](docs/03-multi-comment-sidebar-en.png)

### Collapse the review without losing your place

The review panel can shrink to a blue edge rail while the compact composer gate
remains visible. Reopen either control to continue with the same comments and
overall feedback.

![The review collapsed to an edge rail while the conversation remains usable](docs/04-collapsed-rail-en.png)

### Return actionable feedback to the agent

**Send feedback** answers the real `exit_plan_mode` interaction. DSH records the
quoted plan text, each requested change, and the overall feedback in the tool
result and Session Log. The agent remains in plan mode and can immediately
produce a revised proposal.

### Protect unfinished reviews

Unsent comments are saved locally in the browser, isolated by Session, pending
request, and plan revision. If you try to approve while feedback is still
pending, the plugin requires an explicit second confirmation instead of
silently discarding your work.

![Approval requires confirmation when comments have not been sent](docs/05-safe-approval-en.png)

| Capability | What you get |
| --- | --- |
| Precise annotations | Text selection plus a reliable double-click block fallback |
| Multi-comment review | Anchored comments, source navigation, deletion, and overall feedback |
| Compact right panel | A small composer gate, collapsible review panel, and edge-rail reopen control |
| Native DSH loop | Approve, request changes, or return to chat through the existing pending interaction |
| Draft recovery | Best-effort local recovery without a plugin server or third-party service |
| Review safeguards | Stale-plan draft rejection and explicit confirmation before discarding feedback |
| UI fit | English and Chinese copy, keyboard shortcuts, responsive layout, and DSH theme tokens |

## Built for real coding plans

The screenshots above use a production authentication migration, not placeholder
copy. The same workflow is useful whenever several plan details must be correct
before the first edit:

| Plan | Useful review comments |
| --- | --- |
| Database or auth migration | Compatibility window, idempotent migration, rollback threshold, zero-downtime sequencing |
| Public API refactor | Contract preservation, deprecation path, versioning, mobile or SDK compatibility |
| Security change | Trust boundaries, CSRF and secret handling, audit evidence, failure behavior |
| Deployment rollout | Feature-flag phases, observable stop conditions, owners, rollback rehearsal |
| Test strategy | Missing failure cases, concurrency, restart recovery, regression and acceptance criteria |

## How it works

1. Ask the coding agent to create a plan in DSH Plan mode.
2. When `exit_plan_mode` reaches Plan Review, DSH shows a compact gate and opens
   the right-side review panel on desktop.
3. Select the exact text that needs work. Collapse and reopen the panel at any
   time without settling the review.
4. Add as many targeted comments as necessary, plus optional overall feedback.
5. Choose **Send feedback**. The agent receives one structured review and stays
   in plan mode.
6. Review the revision and choose **Approve** when it is ready to implement.

**Chat about it** dismisses the gate and returns to the ordinary composer.
Removing the plugin restores DSH's built-in Plan Review automatically.

## Install

Install the GitHub bundle into the DSH Web profile, then restart `dsh web`:

```bash
dsh plugin --profile web add github:dsh-external/dsh-plannotator#main
```

For a repeatable installation, replace `main` with a reviewed commit SHA.
Git-based dependencies run their `prepare` script on the host; pnpm 10+ may
require an `allowBuilds` entry for `@dsh-external/dsh-plannotator`.

<details>
<summary>Install from a local checkout</summary>

Use Node.js 22.19+:

```bash
pnpm install
pnpm check

cd /path/to/deepseek-harness
pnpm dsh plugin --profile web add /path/to/dsh-plannotator
```

Restart `dsh web` after changing the installed Client plugin set.

</details>

## Compatibility and boundaries

- Designed for the DeepSeek Harness **Web** client and Node.js 22.19+.
- Claims only a valid, single-question DSH `plan-review` interaction. Other
  questions fall through to the built-in renderer.
- Reviews Markdown plans; it is not a general document editor, Git diff viewer,
  PR publisher, file tree, or the full standalone Plannotator SPA.
- Drafts live in the current browser's local storage. They are not cloud-synced
  and are intentionally rejected when the plan revision changes.
- The desktop review is a non-modal right-side drawer. It does not claim DSH's
  core-owned `details` slot, scrape host DOM, or rewrite the AppFrame grid; on
  small screens it becomes a compact bottom sheet.
- No custom Host route, third-party service, or telemetry is used. Feedback
  travels through DSH's existing response channel.

<details>
<summary>How it fits DSH's Cordis architecture</summary>

The bundle inserts one Cordis Loader row. Its Host entry is deliberately a
no-op; `package.json#dsh.client` exposes the Web bundle. The Client registers
its locale namespace and a `conversation.composer` chain entry at priority
`-10`, ahead of the default question renderer, and selects only Plan Review
requests. That contribution renders the compact gate and a React portal for the
non-modal right-side review panel.

There is no DSH core patch, parallel agent loop, duplicate persistence layer,
or custom scheduler. Unloading the Cordis row removes the slot contribution and
reveals the built-in UI again.

</details>

## Development

```bash
pnpm typecheck
pnpm test
pnpm build
```

The browser bundle follows DSH's `window.__ModuleLoader__` contract and treats
React, ReactDOM, and DSH UI primitives as platform modules, preserving one React
runtime.

## Attribution

This project is an unofficial integration and is not endorsed by the
Plannotator maintainers. Its interaction model is inspired by Plannotator,
which is available under MIT or Apache-2.0. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[LICENSES/Plannotator-MIT.txt](LICENSES/Plannotator-MIT.txt).
