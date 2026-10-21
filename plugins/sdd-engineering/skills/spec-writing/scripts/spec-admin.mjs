#!/usr/bin/env node
// spec-admin.mjs — the human's status changes on a spec. Main-session only: the plugin's
// agent-guard hook denies it to every sdd-engineering subagent.
//
//   node spec-admin.mjs approve <spec.md>              draft → approved (strict lint must pass)
//   node spec-admin.mjs status <spec.md> <status>      set draft | approved | implemented
//
// Exit 0 ok, 1 refused, 2 usage.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { lint } from './spec-lint.mjs';

const die = (msg, code = 1) => {
  process.stderr.write(`spec-admin: ${msg}\n`);
  process.exit(code);
};
const today = () => new Date().toISOString().slice(0, 10);

const [, , cmd, target, value] = process.argv;
if (!['approve', 'status'].includes(cmd) || !target) die('usage: spec-admin.mjs approve <spec.md> | status <spec.md> <draft|approved|implemented>', 2);
const abs = path.resolve(target);
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (path.relative(root, abs).startsWith('..')) die(`${target} is outside the repository`, 2);
if (!existsSync(abs)) die(`${target} not found`, 2);

let text = readFileSync(abs, 'utf8');
const next = cmd === 'approve' ? 'approved' : value;
if (!['draft', 'approved', 'implemented'].includes(next)) die(`unknown status "${value}"`, 2);

if (next === 'approved') {
  const res = lint(text, { strict: true });
  if (res.errors.length) die(`strict lint failed — ${res.errors.length} error(s):\n${res.errors.map((e) => `  ${e.line}: ${e.msg}`).join('\n')}`);
}

const h1 = /^(# Spec: .+\| Status: )(draft|approved|implemented)\s*$/m;
const m = h1.exec(text);
if (!m) die('no "| Status: …" in the H1');
if (m[2] === next) die(`already ${next}`);
text = text.replace(h1, `$1${next}`);
text = text.replace(/(## Changelog\s*\n)/, `$1- ${today()} — status ${m[2]} → ${next} (spec-admin, by the human).\n`);
writeFileSync(abs, text);
process.stdout.write(`${target}: ${m[2]} → ${next}\n`);
