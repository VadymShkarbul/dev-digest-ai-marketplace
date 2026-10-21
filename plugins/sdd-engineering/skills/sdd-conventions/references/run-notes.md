# Run notes

Every sdd-engineering agent ends its final message with this section, after everything
its output format requires. One line each, covering every round since its first launch
(resumes included); "none" is a fine answer. `/sdd-engineering:workflow-retro` parses it.

```markdown
## Run notes
- Hard: <what slowed you down: an unclear instruction (cite file:line), a missing input, a blocked tool> | none
- Easy: <what the inputs made straightforward> | none
- Duplicated: <what you re-read or re-derived that an earlier stage already had> | none
- Missing: <input you needed but didn't get; anything you may have missed, and why> | none
```
