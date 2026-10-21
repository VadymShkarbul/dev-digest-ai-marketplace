# Requirement-quality checklist ("unit tests for English")

Score the spec before every report. Each item asks whether the **requirements are well
written**, not whether the product works. Mark each **Clear / Partial / Missing**, and
report the counts before and after the round (e.g. `Clear 11/16 → 15/16`) plus anything
that regressed.

| # | Dimension | Item |
| --- | --- | --- |
| 1 | Completeness | Does every story have criteria for its main success path? |
| 2 | Completeness | Are empty, loading and error states specified for every new surface? |
| 3 | Completeness | Is behaviour for pre-existing data (records created before this feature) specified? |
| 4 | Clarity | Is every number, limit and threshold given as a value, not an adjective? |
| 5 | Clarity | Is every user-visible string quoted exactly? |
| 6 | Clarity | Is each domain term used in one sense only (see Glossary)? |
| 7 | Consistency | Do no two criteria contradict each other, or contradict an approved spec? |
| 8 | Consistency | Do the same entities shown on different surfaces have an agreement criterion? |
| 9 | Measurability | Is every success criterion checkable without the implementer's judgement? |
| 10 | Measurability | Is every LLM-dependent criterion phrased as a threshold, not exact output? |
| 11 | Coverage | Has every gap found in the sweep landed (AC/EC/NF/Q/P/non-goal)? |
| 12 | Coverage | Are all six core categories, plus the profile probes, covered or marked n/a with a reason? |
| 13 | Edge cases | Are concurrency (operation in progress), dependency failure and limits specified? |
| 14 | Non-functional | Are the relevant a11y, perf, cost and security needs stated with numbers? |
| 15 | Dependencies | Are assumptions recorded as `A-n`, and are dependencies on other specs named? |
| 16 | Scope | Do non-goals name what the design shows but this spec won't build? |

Phrase gaps as questions about the requirement: "Is the behaviour for records created before
this feature specified?" Never phrase them as a test step: "Verify old records render."
