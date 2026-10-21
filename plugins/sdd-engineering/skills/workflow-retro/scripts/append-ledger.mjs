#!/usr/bin/env node
// append-ledger.mjs — the ONLY writer of .sdd/ledger.md, the committed, append-only table of
// analysed multi-agent runs (spec, plan, run-plan, …) so runs can be compared over time.
// Orchestrator-only: agent-guard.mjs denies it to every subagent and blocks agent writes under .sdd/.
//
//   append-ledger.mjs --metrics <dir|metrics.json> --pipeline spec|plan|run-plan|other --label "<slug>"
//                     [--learnings N] [--improvements N] [--note "<one line>"]
//
// <metrics> is what `workflow-check.mjs --out <dir>` writes (metrics.json, the --json shape).
// Refuses: a run already in the ledger (same session + window start); a bad pipeline; a label/note
// with a newline or `|`, or too long; secret-looking text. Appends only — earlier rows are never
// rewritten (checked before the file is replaced).
// Exit 0 appended, 1 refused, 2 usage.

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const FILE = path.join(ROOT, '.sdd/ledger.md');
const PIPELINES = ['spec', 'plan', 'run-plan', 'other'];
const SECRET = /\b(sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|github_pat_\w{20,}|AKIA[0-9A-Z]{16})\b|(?:password|secret|api[_-]?key)\s*[=:]\s*\S+/i;

const die = (msg, code = 1) => {
  process.stderr.write(`append-ledger: ${msg}\n`);
  process.exit(code);
};

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const known = new Set(['--metrics', '--pipeline', '--label', '--learnings', '--improvements', '--note']);
for (let i = 0; i < args.length; i += 2) {
  if (!known.has(args[i])) die(`unknown argument "${args[i]}"`, 2);
  if (args[i + 1] === undefined) die(`${args[i]} needs a value`, 2);
}

const metricsArg = flag('--metrics');
const pipeline = flag('--pipeline');
const label = (flag('--label') ?? '').trim();
const note = (flag('--note') ?? '').trim();
if (!metricsArg || !pipeline || !label) {
  die('usage: append-ledger.mjs --metrics <dir|metrics.json> --pipeline spec|plan|run-plan|other --label "<slug>" [--learnings N] [--improvements N] [--note "…"]', 2);
}
if (!PIPELINES.includes(pipeline)) die(`--pipeline must be one of ${PIPELINES.join(', ')}`, 2);

const count = (name) => {
  const v = flag(name);
  if (v === undefined) return 0;
  if (!/^\d{1,3}$/.test(v)) die(`${name} must be a whole number`, 2);
  return Number(v);
};
const learnings = count('--learnings');
const improvements = count('--improvements');

const cell = (name, text, max) => {
  if (/[\n\r|]/.test(text)) die(`${name} must be one line without "|"`);
  if (text.length > max) die(`${name} is longer than ${max} chars`);
  if (SECRET.test(text)) die(`${name} looks like it contains a secret — rephrase without it`);
  return text;
};
cell('--label', label, 60);
cell('--note', note, 160);

// ── read the workflow-check metrics ────────────────────────────────────────
let metricsFile = path.resolve(metricsArg);
if (existsSync(metricsFile) && statSync(metricsFile).isDirectory()) metricsFile = path.join(metricsFile, 'metrics.json');
if (!existsSync(metricsFile)) die(`no metrics at ${metricsArg} — run workflow-check.mjs --out <dir> first`, 2);
let m;
try {
  m = JSON.parse(readFileSync(metricsFile, 'utf8'));
} catch {
  die(`${metricsFile} is not valid JSON`, 2);
}
if (typeof m?.session !== 'string' || !m.window || !Array.isArray(m.agents) || !m.totals) {
  die(`${metricsFile} is not a workflow-check metrics.json`, 2);
}

// ── format one row ─────────────────────────────────────────────────────────
const session8 = m.session.slice(0, 8);
const since = m.window.since ?? null;
const until = m.window.until ?? null;
const isoMin = (iso) => (iso ? String(iso).replace(/:\d{2}(\.\d+)?Z$/, 'Z') : '…');
const dur = (ms) => {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const s = Math.round(ms / 1000);
  return s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
};
const usd = (v, knownCost = true) => (v == null ? '—' : `$${v.toFixed(2)}${knownCost ? '' : '+'}`);
const k = (n) => (n == null ? '—' : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));

const byType = {};
for (const a of m.agents) byType[a.type] = (byType[a.type] ?? 0) + 1;
const agentsCell = m.agents.length
  ? `${m.agents.length} (${Object.entries(byType).map(([t, n]) => (n > 1 ? `${t}×${n}` : t)).join(', ')})`
  : '0';
const errors = m.agents.reduce((n, a) => n + (Array.isArray(a.errors) ? a.errors.length : Number(a.errors) || 0), 0);
const t = m.totals;
const mainCost = m.main?.totals?.cost;
const parallel = typeof m.parallelism === 'number' ? ` ×${m.parallelism.toFixed(2)}` : '';
const date = (since ?? new Date().toISOString()).slice(0, 10);
const key = `${session8} · ${isoMin(since)}`;

const row = [
  date,
  `${pipeline} · ${label}`,
  `${key} → ${isoMin(until)}`,
  agentsCell,
  dur(m.wallMs),
  `${dur(m.agentTimeMs)}${parallel}`,
  `${usd(t.cost, t.costKnown !== false)}${mainCost != null ? ` (main ${usd(mainCost)})` : ''}`,
  `${k(t.in)}/${k(t.out)} · cr ${k(t.cr)} · cw ${k(t.cw)}`,
  // Agents' `completed` is not used: background agents that hand back via SubagentHandback read as
  // unfinished in the transcript, which would mislead a run-over-run comparison.
  String(errors),
  String(Array.isArray(m.flags) ? m.flags.length : 0),
  String(learnings),
  String(improvements),
  note || '—',
];

// ── append (never rewrite earlier rows) ────────────────────────────────────
const HEADER = `# Retro ledger

<!-- Append-only. Written ONLY by /sdd-engineering:workflow-retro via
the sdd-engineering workflow-retro skill's append-ledger.mjs — one row per analysed multi-agent run.
Agents may not edit this file (agent-guard.mjs). Fix a wrong row with a reviewed human edit. -->

One row per analysed multi-agent run (spec, plan, run-plan, …), so runs can be compared
over time. Numbers come from \`workflow-check.mjs\` (Claude Code transcripts, prices from \`pricing.json\`);
*Learnings* / *Improvements* are what the human kept in \`/sdd-engineering:workflow-retro\`. Window = session · start → end (UTC).
Tokens = input/output · cache-read · cache-write. Cost ending in \`+\` includes a model with no known price.

| Date | Pipeline · label | Window | Agents | Wall-clock | Agent time (×parallel) | Cost | Tokens | Errors | Flags | Learnings | Improvements | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
`;

const before = existsSync(FILE) ? readFileSync(FILE, 'utf8') : null;
if (before !== null && before.split('\n').some((l) => l.startsWith('| ') && l.includes(`| ${key} → `))) {
  die(`run ${key} is already in ${path.relative(ROOT, FILE)} — nothing appended`);
}
const base = before === null ? HEADER : before.replace(/\n*$/, '\n');
const after = `${base}| ${row.join(' | ')} |\n`;
if (before !== null && !after.startsWith(before.replace(/\n*$/, '\n'))) die('internal: refusing a change that would alter existing lines');

mkdirSync(path.dirname(FILE), { recursive: true });
const tmp = `${FILE}.tmp-${process.pid}`;
writeFileSync(tmp, after);
renameSync(tmp, FILE);
const rows = after.split('\n').filter((l) => /^\| \d{4}-\d{2}-\d{2} \|/.test(l)).length;
process.stdout.write(`${path.relative(ROOT, FILE)}: row ${rows} — ${pipeline} · ${label} (${key})\n`);
