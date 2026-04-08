---
name: discovery-interview
description: Structured requirements gathering through a 4-phase interview before building any feature. Produces user stories with acceptance criteria. Use when the user asks to build, add, or create something new, or when a request is ambiguous and needs scoping.
---

# Discovery Interview

Run this interview **before writing any code** when a user requests a new feature, a significant change, or something ambiguous. The goal is a shared understanding captured as user stories with acceptance criteria.

## When to Trigger

- User says "build X", "add X", "create X", or "I want X"
- The request touches multiple components or has unclear scope
- You are unsure about priorities, UX, or edge cases

Skip the interview for trivial tasks (rename a variable, fix a typo, add a comment).

## Process Overview

```
Phase 1: Problem → Phase 2: Scope → Phase 3: UX & Behavior → Phase 4: Acceptance Criteria
```

Complete each phase before moving to the next. Summarize your understanding at the end of each phase and get confirmation before continuing.

---

## Phase 1: Problem Understanding

Goal: understand *why* before *what*.

Ask (use AskQuestion for multi-choice, conversational for open-ended):

1. **What problem does this solve?** — What pain point or gap exists today?
2. **Who is this for?** — End user, admin, developer, automated system?
3. **What triggered this?** — New requirement, user feedback, missing capability?
4. **What exists today?** — Is there a partial solution, workaround, or nothing at all?

Summarize: "So the problem is [X], for [Y], because [Z]. Currently [existing state]. Correct?"

---

## Phase 2: Scope and Priorities

Goal: draw a clear boundary around what to build *now*.

Ask:

1. **Must-haves vs nice-to-haves** — What absolutely must work in the first version?

```
Example AskQuestion:
prompt: "Which of these are must-haves for the first version?"
options: [list features extracted from Phase 1]
allow_multiple: true
```

2. **Out of scope** — What should we explicitly *not* build yet?
3. **Dependencies** — Does this need data, APIs, or other features to exist first?
4. **Constraints** — Performance targets, device support, accessibility, data volume?

Summarize: "First version includes [A, B, C]. Deferred: [D, E]. Depends on: [F]. Correct?"

---

## Phase 3: UX and Behavior

Goal: agree on what the user sees and does.

Ask:

1. **User flow** — Walk me through the steps: the user opens [page], sees [what], does [action], then [result].
2. **Happy path** — What does success look like on screen?
3. **Empty state** — What shows when there's no data yet?
4. **Error state** — What happens when something goes wrong (invalid input, network failure, no results)?
5. **Edge cases** — Large data sets, unusual inputs, concurrent actions?
6. **Reference point** — "Is this like [known product/pattern] but with [difference]?"

```
Example AskQuestion:
prompt: "How should data be displayed?"
options: ["Table with sorting/filtering", "Card grid", "Chart/visualization", "List view", "Let me describe it"]
```

If the feature has visual output, describe the layout in text:

```
┌─────────────────────────┐
│ Header / Title          │
├────────────┬────────────┤
│ Filter bar │ Action btn │
├────────────┴────────────┤
│ Data area               │
│ (table / cards / chart) │
└─────────────────────────┘
```

Summarize the flow and get confirmation.

---

## Phase 4: Acceptance Criteria

Goal: produce a concrete spec the agent follows during implementation.

### Step 1: Write User Stories

For each distinct piece of functionality, write:

```
### [Short title]

**As a** [user role]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria:**
- Given [context], when [action], then [expected result]
- Given [context], when [edge case], then [expected handling]
```

### Step 2: Present for Review

Show all user stories to the user in a single summary. Ask:

```
Example AskQuestion:
prompt: "Do these user stories capture what you want?"
options: ["Yes, start building", "Mostly, but I have corrections", "No, let's revisit"]
```

### Step 3: Iterate or Proceed

- **"Yes"** → Save the stories as a reference comment or doc, switch to implementation.
- **"Corrections"** → Ask what to change, update, re-confirm.
- **"Revisit"** → Return to the phase that needs rework.

---

## Output Template

After the interview, produce this summary (in your response, not as a file unless asked):

```markdown
# Feature: [Name]

## Problem
[1-2 sentences]

## Scope
- Must-have: [list]
- Deferred: [list]
- Dependencies: [list]

## User Flow
1. [Step 1]
2. [Step 2]
3. [Step 3]

## User Stories

### [Story 1 title]
**As a** [role] **I want to** [action] **So that** [benefit]
- Given ..., when ..., then ...
- Given ..., when ..., then ...

### [Story 2 title]
...
```

---

## Guidelines

- Ask **1-2 questions at a time**. Do not dump all questions in one message.
- Use **AskQuestion** for choices/prioritization. Use conversational text for open-ended exploration.
- Keep each phase brief. The whole interview should take 4-8 exchanges, not 20.
- If the user is clearly in a hurry ("just build it"), compress to Phase 1 + Phase 4 only and note assumptions.
- Do not start writing code until Phase 4 is confirmed.
