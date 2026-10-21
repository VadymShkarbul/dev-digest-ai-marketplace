# engineering-insights — sources and rationale

Background for whoever maintains this skill. Not needed to *use* it — `SKILL.md` and
`examples.md` are self-contained.

## Primary source
[MindStudio — self-learning AI skill system](https://www.mindstudio.ai/blog/self-learning-ai-skill-system-learnings-md-wrap-up):
the `LEARNINGS.md` seven-section layout and the seven-step wrap-up sweep that `SKILL.md`
step 3 implements. Also the >30-minute threshold, the skip-trivial-sessions rule, and the
"extend or update, don't duplicate" rule.

## Deliberate divergences from that article
- **Per-module `INSIGHTS.md`, not one root `LEARNINGS.md`.** Directly mitigates the
  article's own "file bloat" failure mode, and scales to any number of packages.
- **Signal ranking** (user corrections › ruled-out approaches › recurring patterns ›
  one-offs) as the tie-break when a section is over budget. The article has no priority order.
- **Verified-only**, and **promote always-true rules to `CLAUDE.md`**. Both go beyond the article.
- **Reading moved to `CLAUDE.md`.** The article reads `LEARNINGS.md` from inside the skill;
  here the root and per-package `CLAUDE.md` files always load, so a skill that fires only
  when triggered is the weaker mechanism. The skill owns recording only.
- **Append via script, not by hand.** Per Anthropic's guidance to prefer scripts for
  deterministic, fragile operations — it makes append-only structural rather than a
  request the model can forget.

## Maintenance (from the article)
Treat `INSIGHTS.md` as a draft a human reviews, not an authoritative source nobody touches.
Review roughly quarterly: prune stale and conflicting entries, and promote anything that has
become always-true into the module's `CLAUDE.md`. The files are committed to version control
on purpose — the history is part of the record.

## Also studied
Skill-authoring guidance: [Anthropic best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
· [Claude Code skills reference](https://code.claude.com/docs/en/skills).
Reference skills: glebis/retrospective (signal ranking, exact-content entries) ·
Kulaxyz/self-learning (capture dead-ends) · xtone/lessons-md-manager (semantic de-dupe,
affirmative phrasing) · melodykoh/learning-loop (verify before persisting) · rohitg00/wrap-up.
