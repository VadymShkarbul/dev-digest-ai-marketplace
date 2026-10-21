#!/usr/bin/env node
// plan-admin.mjs — the human's approval stamp on a Development Plan. Main-session only: the
// plugin's agent-guard hook denies it to every sdd-engineering subagent, and refuses any
// planner Write that carries an "**Approved:**" line, so the stamp can only come from here.
//
//   node plan-admin.mjs show <plansDir>/NNN-slug.plan.md      header fields as key=value lines
//   node plan-admin.mjs approve <plansDir>/NNN-slug.plan.md   stamp "**Approved:** YYYY-MM-DD"
//
// `approve` refuses unless Status is `ready`, no *Blocking* open question remains, and the
// plan is not already approved. A planner revise rewrites the file without the stamp, so a
// changed plan always needs re-approval. Exit 0 ok, 1 refused, 2 usage.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const PLAN_FILE = /^\d{3}-[a-z0-9-]+\.plan\.md$/;

const die = (msg, code = 1) => {
  process.stderr.write(`plan-admin: ${msg}\n`);
  process.exit(code);
};
const today = () => new Date().toISOString().slice(0, 10);

export function readHeader(text) {
  const field = (name) => new RegExp(`\\*\\*${name}:\\*\\*\\s*([^·\\n]+)`).exec(text)?.[1]?.trim() ?? null;
  const open = /^## Open questions\s*$/m.exec(text);
  let blocking = null;
  if (open) {
    const rest = text.slice(open.index).split('\n').slice(1);
    const end = rest.findIndex((l) => /^## /.test(l));
    const body = (end < 0 ? rest : rest.slice(0, end)).join('\n');
    blocking = /^- \*\*Blocking:\*\*\s*(.+)$/m.exec(body)?.[1]?.trim() ?? null;
  }
  return { status: field('Status'), runMode: field('Run mode'), spec: field('Spec'), approved: field('Approved'), blocking };
}

function load(target) {
  const abs = path.resolve(ROOT, target ?? '');
  const rel = path.relative(ROOT, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) die(`${target} is outside the repository`, 2);
  if (!PLAN_FILE.test(path.basename(abs))) die(`not a plan file: ${target} (expected NNN-slug.plan.md)`, 2);
  if (!existsSync(abs)) die(`${rel} not found`, 2);
  return { rel, abs, text: readFileSync(abs, 'utf8') };
}

const [, , cmd, target] = process.argv;
if (cmd === 'show') {
  const { text } = load(target);
  for (const [k, v] of Object.entries(readHeader(text))) process.stdout.write(`${k}=${v ?? ''}\n`);
} else if (cmd === 'approve') {
  const { rel, abs, text } = load(target);
  const h = readHeader(text);
  if (h.approved) die(`${rel} is already approved (${h.approved})`);
  if (h.status !== 'ready') die(`${rel} has Status "${h.status ?? '?'}" — only a "ready" plan can be approved`);
  if (h.blocking && !/^None\.?$/i.test(h.blocking)) die(`${rel} still has a Blocking open question: ${h.blocking.slice(0, 160)}`);
  const lines = text.split('\n');
  let at = lines.findIndex((l) => /^# /.test(l)) + 1;
  while (at < lines.length && lines[at].trim() === '') at++;
  while (at < lines.length && /^\*\*[A-Z][\w ]*:\*\*/.test(lines[at])) at++;
  lines.splice(at, 0, `**Approved:** ${today()} — by the human (plan-admin)`);
  writeFileSync(abs, lines.join('\n'));
  process.stdout.write(`${rel}: approved ${today()}\n`);
} else {
  die('usage: plan-admin.mjs show|approve <plansDir>/NNN-slug.plan.md', 2);
}
