# UX copy in criteria

A criterion that shows text quotes the **exact** string, so the test can assert it.

- **Voice:** short, plain, and specific. Sentence case. No "Oops", no exclamation marks.
- **Empty state:** say what's missing and what to do next: "No findings in this run." /
  "Run a review to see findings."
- **Error:** say what failed, why if known, and the next step: "Export failed — storage
  unavailable. Retry in a minute."
- **Loading:** name the activity when it takes more than about 1 s: "Running 3 agents…".
- **Disabled control:** a tooltip that gives the reason: "No findings to export".
- **Confirm a destructive action:** the verb plus the object, and the consequence:
  "Delete agent 'security'? Its past runs stay."
- **Numbers:** a count with its noun ("3 findings", "1 finding"); USD to 2 decimals
  ("$0.04"); the empty value is "—".
- **Enumerated labels** (statuses, severities) use the product's existing vocabulary
  exactly; never invent a parallel scale.
- **Reuse existing strings** before writing new ones: grep the product's message/i18n
  files.
  Copy that already exists keeps the product consistent, and an i18n key may already
  exist.
