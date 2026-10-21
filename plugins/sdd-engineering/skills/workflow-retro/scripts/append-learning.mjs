#!/usr/bin/env node
// append-learning.mjs — the ONLY writer of .sdd/learnings/<agent>.md, the per-agent
// memory every repo agent reads at the start of a run. Orchestrator-only: agent-guard.mjs denies
// it to every subagent, and the hook refuses direct agent writes under .sdd/.
//
//   append-learning.mjs <agent> --text "<one cold-actionable line>" --source "<session8>/<agent6>"
//   append-learning.mjs <agent> --list
//
// Refuses: an unknown agent (not a marketplace agent and no .claude/agents/<agent>.md); text outside 20–300 chars or with a
// newline; secret-looking text; a near-duplicate of an existing entry (word-set Jaccard ≥ 0.6);
// a full file (25 entries — consolidate first, by hand, in a reviewed change).
// Exit 0 appended/listed, 1 refused, 2 usage.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CAP = 25;
const SECRET = /\b(sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|github_pat_\w{20,}|AKIA[0-9A-Z]{16})\b|(?:password|secret|api[_-]?key)\s*[=:]\s*\S+/i;

const die = (msg, code = 1) => {
  process.stderr.write(`append-learning: ${msg}\n`);
  process.exit(code);
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2));
const jaccard = (a, b) => {
  const inter = [...a].filter((w) => b.has(w)).length;
  return inter / (a.size + b.size - inter || 1);
};

const [, , agent, ...rest] = process.argv;
if (!agent || agent.startsWith('--')) die('usage: append-learning.mjs <agent> --text "…" --source "…" | --list', 2);
// Agents are named bare (`implementer`) or plugin-scoped (`sdd-engineering:implementer`).
const KNOWN = new Set(['spec-creator', 'implementation-planner', 'implementer', 'plan-verifier', 'researcher', 'architecture-reviewer']);
const bare = agent.replace(/^(?:sdd-engineering|research-tools|architecture-review):/, '');
if (!/^[a-z0-9][a-z0-9-]*$/.test(bare) || !(KNOWN.has(bare) || existsSync(path.join(ROOT, '.claude/agents', `${bare}.md`)))) {
  die(`unknown agent "${agent}" — not a marketplace agent and no .claude/agents/${bare}.md`, 2);
}
const file = path.join(ROOT, '.sdd/learnings', `${bare}.md`);
const entries = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => /^- \d{4}-\d{2}-\d{2} · /.test(l)) : [];

const flag = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};

if (rest.includes('--list')) {
  process.stdout.write(entries.length ? entries.join('\n') + '\n' : `no learnings for ${agent}\n`);
  process.exit(0);
}

const text = (flag('--text') ?? '').trim();
const source = (flag('--source') ?? '').trim();
if (!text) die('--text is required', 2);
if (!/^[\w-]+\/[\w-]+$/.test(source)) die('--source must be "<session8>/<agent6>"', 2);
if (text.includes('\n') || text.length < 20 || text.length > 300) die('a learning is ONE line of 20–300 chars');
if (SECRET.test(text)) die('text looks like it contains a secret — rephrase without it');
const w = words(text);
const dup = entries.findIndex((e) => jaccard(w, words(e.replace(/^- \S+ · [^·]+ · /, ''))) >= 0.6);
if (dup >= 0) die(`near-duplicate of existing entry ${dup + 1}: ${entries[dup]}`);
if (entries.length >= CAP) die(`${agent} already has ${CAP} learnings — consolidate the file (reviewed edit) before adding more`);

mkdirSync(path.dirname(file), { recursive: true });
const header = `# Learnings — ${agent}\n\n<!-- Read at the start of every ${agent} run: lessons from past runs, high-confidence guidance.\nWritten ONLY by /sdd-engineering:workflow-retro via append-learning.mjs after a human picked them. ≤${CAP} entries;\nconsolidate (reviewed edit) when full. Each line: date · source run · lesson. -->\n\n`;
const body = existsSync(file) ? readFileSync(file, 'utf8').replace(/\n*$/, '\n') : header;
writeFileSync(file, `${body}- ${today()} · ${source} · ${text}\n`);
process.stdout.write(`${path.relative(ROOT, file)}: entry ${entries.length + 1}/${CAP}\n`);
