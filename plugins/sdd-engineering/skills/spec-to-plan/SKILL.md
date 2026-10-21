---
name: spec-to-plan
description: "Use FIRST whenever the user asks to prepare or write a spec, requirements or a PRD for a feature, and/or an implementation plan — entry point of the spec-driven workflow. Orchestrates sdd-engineering:spec-creator (question rounds, lint, human approval) and then sdd-engineering:implementation-planner (requirements review, plan file). Ends with a plan ready for /sdd-engineering:run-plan. Not for questions about existing code, bug fixes, or implementing anything."
allowed-tools: Read Glob Grep AskUserQuestion SendMessage Bash(node ${CLAUDE_SKILL_DIR}/../spec-writing/scripts/spec-lint.mjs:*) Bash(node ${CLAUDE_SKILL_DIR}/../spec-writing/scripts/spec-admin.mjs:*) Bash(node ${CLAUDE_SKILL_DIR}/../run-plan/scripts/plan-admin.mjs show:*) Bash(git status:*) Bash(git branch:*) Bash(ls:*)
---

# Spec → plan

You orchestrate the first half of the workflow in the main session. The agents do the
writing; you relay questions, carry answers back, and run the human-only approval step.
You never write the spec or the plan yourself.

## Paths

`specsDir` / `plansDir` come from `.sdd/config.json`, else `specs/` and `docs/plans/`.
Scripts: `${CLAUDE_SKILL_DIR}/../spec-writing/scripts/` (`spec-lint.mjs`, `spec-admin.mjs`).

## 1. Scope

- Derive a kebab-case slug from the feature (`note-tags`). If `<specsDir>/<slug>.md`
  already exists, this is a revision — say so.
- If a repository fact decides the scope and you can't see it quickly (where a concept
  lives, who calls it), delegate one question to `research-tools:researcher` first and
  pass its answer to the spec-creator as context.

## 2. Spec rounds (at most 3)

1. Spawn `sdd-engineering:spec-creator` **in the foreground** with: the feature in the
   user's words, the slug, any designs/links the user gave, and the researcher's answer.
2. Its report ends with `### Questions`. Ask the human with `AskUserQuestion` (≤4 per
   call, recommended option first, as the report lists them). If you cannot ask — a
   headless run, or the user told you to decide — pick each question's **(Recommended)**
   option and say so in your summary.
3. Send the answers back with `SendMessage` to the same spec-creator (it keeps its
   context). On round 3 add "final round — ask no new questions".
4. Stop when its report says `Questions: None.` and lint shows 0 errors.

## 3. Approve the spec (the human's decision)

Run `node ${CLAUDE_SKILL_DIR}/../spec-writing/scripts/spec-lint.mjs <spec> --strict`.
Show the counts and the defaults it applied, then ask **"Approve this spec?"** Only on an
explicit yes — in this conversation, or stated up front by the user — run
`node ${CLAUDE_SKILL_DIR}/../spec-writing/scripts/spec-admin.mjs approve <spec>`. Without a
yes, stop here: the spec stays `draft` and planning waits.

## 4. Plan

1. Spawn `sdd-engineering:implementation-planner` **in the foreground**:
   `Plan the approved spec <spec path>. Phase A first.`
2. Relay its Phase A questions (including `RUN-1` review mode) exactly like step 2, then
   send the answers with `SendMessage`: `Answers: … Write the plan (Phase B).`
3. When it reports the plan path, run
   `node ${CLAUDE_SKILL_DIR}/../run-plan/scripts/plan-admin.mjs show <plan>` and report
   status, step count, review mode and any blocking question.

## 5. Report

```markdown
**Spec:** <path> (<status>, lint <E>/<W>, AC <n>) · **Plan:** <path> (<status>, <n> steps, review <mode>)
**Decisions taken for you:** <the Recommended options you picked, or "none — all answered by you">
**Next:** review the plan, then `/sdd-engineering:run-plan <plan>` (it asks for approval first).
```

Do not implement anything, and do not run `/sdd-engineering:run-plan` yourself.
