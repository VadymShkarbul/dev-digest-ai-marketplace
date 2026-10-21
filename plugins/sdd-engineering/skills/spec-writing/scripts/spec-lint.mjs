#!/usr/bin/env node
// spec-lint.mjs — deterministic checker for sdd-engineering feature specs.
//
//   node spec-lint.mjs <specsDir>/<slug>.md [--strict] [--json]
//
// --strict is the approval gate: zero [NEEDS CLARIFICATION] markers, no open Q-n, no
// [proposed] proposals left. Read-only: never writes. Exit 0 = no errors (warnings
// allowed), 1 = errors, 2 = usage / unreadable file.
//
// What it cannot check (the agent's quality checklist owns these): whether a criterion is
// true, whether every gap was found, whether a story is worth building.

import { readFileSync } from 'node:fs';

export const SECTIONS = [
  'Problem & why',
  'Goals / Non-goals',
  'Success criteria',
  'User stories',
  'Acceptance criteria (EARS)',
  'Edge cases',
  'Non-functional',
  'Key entities & states',
  'Glossary',
  'Untrusted inputs',
  'Module interactions',
  'Assumptions',
  'Needs clarification',
  'Clarifications',
  'Changelog',
];

const H1 = /^# Spec: (.+?)(?: \| Spec ID: ([A-Z]+-\d+))? \| Status: (draft|approved|implemented)\s*$/;
const MARKER = /\[NEEDS CLARIFICATION:/g;
const VAGUE_ERR =
  /\b(properly|correctly|appropriate(?:ly)?|intuitive(?:ly)?|user[- ]friendly|seamless(?:ly)?|robust(?:ly)?|as needed|if possible|where possible|etc\.?|and\/or|works? well|graceful(?:ly)?|efficient(?:ly)?|fast|quickly|easily)\b/i;
const VAGUE_WARN = /\b(normal(?:ly)?|reasonable|sufficient|minimal|various|several|many|few|soon|instantly|large|small|some|simple)\b/i;
const WEAK_MODAL = /\b(should|must|will)\b/;
const LEAKS = [
  [/(?:^|[\s(`'"])[\w@.\[\]-]+(?:\/[\w@.\[\]-]+)+\.(?:tsx?|jsx?|mjs|cjs|py|go|rb|sql|json|css)\b/, 'file path'],
  [/\b[\w-]+\.(?:tsx?|jsx?|mjs|py|go|sql)\b/, 'source file name'],
  [/\b(?:GET|POST|PUT|PATCH|DELETE) \//, 'HTTP endpoint'],
  [/\b(?:SELECT .+ FROM|INSERT INTO|ALTER TABLE|CREATE TABLE|UPDATE \w+ SET)\b/i, 'SQL'],
  [/\buse[A-Z]\w*\(/, 'React hook'],
];
const EARS = /^(?:(?:WHERE|WHILE|WHEN|IF) .+?, (?:THEN )?)*(?:the system|The system) SHALL /;

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const stripQuoted = (s) => s.replace(/"[^"]*"|“[^”]*”|«[^»]*»|`[^`]*`/g, '""');

function sections(text) {
  const out = new Map();
  const re = /^## (.+?)\s*$/gm;
  const heads = [...text.matchAll(re)];
  heads.forEach((m, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    out.set(m[1], { body: text.slice(m.index + m[0].length, end), line: text.slice(0, m.index).split('\n').length + 1 });
  });
  return out;
}

// Bullets that open an ID: "- **AC-3** (US-1) WHEN …" → { id, refs, text, line }
function items(body, startLine, prefix) {
  const out = [];
  body.split('\n').forEach((l, i) => {
    const m = new RegExp(String.raw`^- \*\*(${prefix}-\d+)\*\*\s*(.*)$`).exec(l);
    if (!m) return;
    let rest = m[2];
    const refs = [];
    const r = /^\(([^)]*)\)\s*/.exec(rest);
    if (r && /\b[A-Z]{1,2}-\d+/.test(r[1])) {
      refs.push(...r[1].split(/[,\s]+/).filter(Boolean));
      rest = rest.slice(r[0].length);
    }
    out.push({ id: m[1], refs, text: rest, line: startLine + i, raw: l, next: body.split('\n')[i + 1] ?? '' });
  });
  return out;
}

export function lint(text, { strict = false } = {}) {
  const errors = [];
  const warns = [];
  const err = (line, msg) => errors.push({ line, msg });
  const warn = (line, msg) => warns.push({ line, msg });
  const clean = stripComments(text);
  const lines = clean.split('\n');

  const h1 = H1.exec(lines.find((l) => l.startsWith('# ')) ?? '');
  if (!h1) err(1, 'H1 must be "# Spec: <name> | Status: draft|approved|implemented" (optional " | Spec ID: XX-n" before Status)');
  const status = h1?.[3];

  const secs = sections(clean);
  for (const s of SECTIONS) if (!secs.has(s)) err(0, `missing section "## ${s}"`);

  const get = (name, prefix) => (secs.has(name) ? items(secs.get(name).body, secs.get(name).line, prefix) : []);
  const stories = get('User stories', 'US');
  const acs = get('Acceptance criteria (EARS)', 'AC');
  const ecs = get('Edge cases', 'EC');
  const nfs = get('Non-functional', 'NF');
  const scs = get('Success criteria', 'SC');

  if (stories.length === 0) err(secs.get('User stories')?.line ?? 0, 'no user stories (US-n)');
  if (acs.length === 0) err(secs.get('Acceptance criteria (EARS)')?.line ?? 0, 'no acceptance criteria (AC-n)');

  // Unique IDs per series.
  const seen = new Map();
  for (const m of clean.matchAll(/^- \*\*([A-Z]{1,2}-\d+)\*\*/gm)) {
    const id = m[1];
    const line = clean.slice(0, m.index).split('\n').length;
    if (/^Q-/.test(id)) continue; // a Q-n may appear in both Needs clarification and Clarifications history
    if (seen.has(id)) err(line, `duplicate id ${id} (first at line ${seen.get(id)})`);
    else seen.set(id, line);
  }

  const storyIds = new Set(stories.map((s) => s.id));
  for (const s of stories) {
    if (!/^\(P[123]\)/.test(s.text) && !/^P[123]\b/.test(s.refs.join(' '))) {
      if (!/\(P[123]\)/.test(s.raw)) err(s.line, `${s.id}: priority (P1|P2|P3) missing`);
    }
    if (!/Independent test:/.test(s.next)) warn(s.line, `${s.id}: no "Independent test:" line under the story`);
  }

  for (const c of [...acs, ...ecs, ...nfs]) {
    const body = stripQuoted(c.text.replace(/^\[[^\]]+\]\s*/, ''));
    const shalls = (body.match(/\bSHALL\b/g) ?? []).length;
    if (shalls !== 1) err(c.line, `${c.id}: exactly one SHALL required (found ${shalls})`);
    if (!EARS.test(body)) err(c.line, `${c.id}: not an EARS sentence (WHEN/WHILE/IF … THEN/WHERE …, the system SHALL …)`);
    if (WEAK_MODAL.test(body)) err(c.line, `${c.id}: weak modal (should/must/will) — use SHALL`);
    const v = VAGUE_ERR.exec(body);
    if (v) err(c.line, `${c.id}: vague word "${v[1]}" — give a number, a named state or exact copy`);
    const w = VAGUE_WARN.exec(body);
    if (w) warn(c.line, `${c.id}: possibly vague word "${w[1]}"`);
    for (const [re, what] of LEAKS) if (re.test(body)) err(c.line, `${c.id}: implementation detail (${what}) — say what, not how`);
  }

  for (const a of acs) {
    const cited = a.refs.filter((r) => /^US-\d+$/.test(r));
    if (cited.length === 0) err(a.line, `${a.id}: cite its story, e.g. "(US-1)"`);
    for (const r of cited) if (!storyIds.has(r)) err(a.line, `${a.id}: cites unknown ${r}`);
  }

  for (const s of scs) if (VAGUE_ERR.test(stripQuoted(s.text))) warn(s.line, `${s.id}: vague success criterion`);

  // 1.1.0: every mandatory requirement (a P1 or P2 story) needs at least one acceptance
  // criterion citing it — a spec with an uncovered mandatory story is not finished.
  const cited = new Set(acs.flatMap((a) => a.refs.filter((r) => /^US-\d+$/.test(r))));
  for (const s of stories) {
    const pri = /\((P[123])\)/.exec(s.raw)?.[1];
    if ((pri === 'P1' || pri === 'P2') && !cited.has(s.id)) err(s.line, `${s.id} (${pri}) is a mandatory requirement with no acceptance criterion — add an AC citing (${s.id})`);
  }

  // Clarification markers vs open questions.
  const markers = [...clean.matchAll(/\[NEEDS CLARIFICATION: (Q-\d+)/g)].map((m) => m[1]);
  const openQs = secs.has('Needs clarification') ? items(secs.get('Needs clarification').body, secs.get('Needs clarification').line, 'Q') : [];
  const openIds = new Set(openQs.map((q) => q.id));
  for (const id of new Set(markers)) if (!openIds.has(id)) err(0, `inline marker ${id} has no entry under "## Needs clarification"`);

  if (strict) {
    const n = (clean.match(MARKER) ?? []).length;
    if (n > 0) err(0, `strict: ${n} [NEEDS CLARIFICATION] marker(s) left`);
    if (openQs.length > 0) err(0, `strict: ${openQs.length} open question(s) under "## Needs clarification"`);
    if (/\[proposed\]/.test(clean)) err(0, 'strict: [proposed] proposals left undecided');
  }

  const nonEmpty = lines.filter((l) => l.trim()).length;
  if (nonEmpty > 220) warn(0, `${nonEmpty} non-empty lines — over ~3 pages; consider splitting the feature`);

  return { status, errors, warns, counts: { US: stories.length, AC: acs.length, EC: ecs.length, NF: nfs.length, SC: scs.length, openQ: openQs.length } };
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('spec-lint.mjs');
if (isMain) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    process.stderr.write('usage: spec-lint.mjs <spec.md> [--strict] [--json]\n');
    process.exit(2);
  }
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    process.stderr.write(`spec-lint: cannot read ${file}\n`);
    process.exit(2);
  }
  const res = lint(text, { strict: args.includes('--strict') });
  if (args.includes('--json')) process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  else {
    for (const e of res.errors) process.stdout.write(`ERROR ${file}:${e.line} ${e.msg}\n`);
    for (const w of res.warns) process.stdout.write(`WARN  ${file}:${w.line} ${w.msg}\n`);
    const c = res.counts;
    process.stdout.write(
      `${res.errors.length ? 'FAIL' : 'PASS'} ${file} — Status: ${res.status ?? '?'} · ${res.errors.length} errors, ${res.warns.length} warnings · US ${c.US} · AC ${c.AC} · EC ${c.EC} · NF ${c.NF} · SC ${c.SC} · open Q ${c.openQ}\n`,
    );
  }
  process.exit(res.errors.length ? 1 : 0);
}
