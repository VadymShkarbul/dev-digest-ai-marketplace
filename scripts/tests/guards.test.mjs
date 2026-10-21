// Unit tests for the plugin guard hooks and the deterministic SDD scripts. No model calls.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (...s) => path.join(ROOT, 'plugins', ...s);
const SDD_GUARD = P('sdd-engineering/hooks/agent-guard.mjs');
const RO_GUARD = P('research-tools/hooks/readonly-guard.mjs');

function hook(script, input, args = [], env = {}) {
  const r = spawnSync('node', [script, ...args], { input: typeof input === 'string' ? input : JSON.stringify(input), env: { ...process.env, CLAUDE_PROJECT_DIR: '/repo', ...env }, encoding: 'utf8' });
  return r.status;
}
const as = (agent, tool, tool_input) => ({ agent_type: agent, tool_name: tool, tool_input, cwd: '/repo' });

test('sdd guard: main session and other plugins are never blocked', () => {
  assert.equal(hook(SDD_GUARD, { tool_name: 'Bash', tool_input: { command: 'rm -rf src' } }), 0);
  assert.equal(hook(SDD_GUARD, as('other-plugin:agent', 'Write', { file_path: '/repo/x' })), 0);
});

test('sdd guard: spec-creator writes only specs', () => {
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:spec-creator', 'Write', { file_path: '/repo/specs/tags.md' })), 0);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:spec-creator', 'Write', { file_path: '/repo/src/a.js' })), 2);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:spec-creator', 'Write', { file_path: '/repo/specs/README.md' })), 2, 'README is Edit-only');
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:spec-creator', 'Bash', { command: 'curl https://example.com' })), 2);
});

test('sdd guard: planner cannot stamp approval or write outside plans', () => {
  const plan = { file_path: '/repo/docs/plans/001-tags.plan.md', content: '# Plan\n' };
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:implementation-planner', 'Write', plan)), 0);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:implementation-planner', 'Write', { ...plan, content: '# Plan\n**Approved:** 2026-10-21' })), 2);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:implementation-planner', 'Write', { file_path: '/repo/docs/plans/notes.md', content: 'x' })), 2);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:implementation-planner', 'Bash', { command: 'node /c/plan-admin.mjs approve docs/plans/001-a.plan.md' })), 2);
});

test('sdd guard: implementer may code but not edit plans/specs/.sdd or commit', () => {
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:implementer', 'Edit', { file_path: '/repo/src/a.js' })), 0);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:implementer', 'Edit', { file_path: '/repo/docs/plans/001-a.plan.md' })), 2);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:implementer', 'Write', { file_path: '/repo/.sdd/learnings/implementer.md' })), 2);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:implementer', 'Bash', { command: 'npm test' })), 0);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:implementer', 'Bash', { command: 'git commit -am wip' })), 2);
});

test('sdd guard: plan-verifier is read-only and respects .sdd/config.json dirs', () => {
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:plan-verifier', 'Bash', { command: 'npm test > out.txt' })), 2);
  assert.equal(hook(SDD_GUARD, as('sdd-engineering:plan-verifier', 'Bash', { command: 'npm test > /tmp/out.txt' })), 0);
  const repo = mkdtempSync(path.join(os.tmpdir(), 'guard-'));
  mkdirSync(path.join(repo, '.sdd'));
  writeFileSync(path.join(repo, '.sdd/config.json'), JSON.stringify({ specsDir: 'docs/specs' }));
  const env = { CLAUDE_PROJECT_DIR: repo };
  assert.equal(hook(SDD_GUARD, { ...as('sdd-engineering:spec-creator', 'Write', { file_path: path.join(repo, 'docs/specs/a.md') }), cwd: repo }, [], env), 0);
  assert.equal(hook(SDD_GUARD, { ...as('sdd-engineering:spec-creator', 'Write', { file_path: path.join(repo, 'specs/a.md') }), cwd: repo }, [], env), 2);
});

test('sdd guard fails closed on unparseable input', () => {
  assert.equal(hook(SDD_GUARD, 'not json'), 2);
});

test('readonly guard: only the named agent is restricted', () => {
  const A = ['research-tools:researcher'];
  assert.equal(hook(RO_GUARD, as('research-tools:researcher', 'Bash', { command: 'git log -S foo' }), A), 0);
  assert.equal(hook(RO_GUARD, as('research-tools:researcher', 'Bash', { command: 'sed -i s/a/b/ x' }), A), 2);
  assert.equal(hook(RO_GUARD, as('research-tools:researcher', 'Write', { file_path: '/repo/x' }), A), 2);
  assert.equal(hook(RO_GUARD, { tool_name: 'Bash', tool_input: { command: 'rm -rf x' } }, A), 0);
});

test('spec-lint: worked example passes strict; a criterion without SHALL fails', () => {
  const lint = P('sdd-engineering/skills/spec-writing/scripts/spec-lint.mjs');
  const ex = P('sdd-engineering/skills/spec-writing/references/example.md');
  assert.equal(spawnSync('node', [lint, ex, '--strict']).status, 0);
  const bad = path.join(mkdtempSync(path.join(os.tmpdir(), 'lint-')), 'bad.md');
  writeFileSync(bad, readFileSync(ex, 'utf8').replace('the system SHALL list', 'the system lists'));
  assert.equal(spawnSync('node', [lint, bad]).status, 1);
});

test('plan-admin: refuses to approve a plan with a blocking question', () => {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'plan-'));
  mkdirSync(path.join(repo, 'docs/plans'), { recursive: true });
  const f = path.join(repo, 'docs/plans/001-a.plan.md');
  const admin = P('sdd-engineering/skills/run-plan/scripts/plan-admin.mjs');
  writeFileSync(f, '# Plan: a — 001-a\n\n**Status:** ready · **Packages:** x\n\n## Open questions\n- **Blocking:** which db?\n');
  assert.equal(spawnSync('node', [admin, 'approve', f], { cwd: repo, env: { ...process.env, CLAUDE_PROJECT_DIR: repo } }).status, 1);
  writeFileSync(f, '# Plan: a — 001-a\n\n**Status:** ready · **Packages:** x\n\n## Open questions\n- **Blocking:** None.\n');
  assert.equal(spawnSync('node', [admin, 'approve', f], { cwd: repo, env: { ...process.env, CLAUDE_PROJECT_DIR: repo } }).status, 0);
  assert.match(readFileSync(f, 'utf8'), /\*\*Approved:\*\* \d{4}-\d{2}-\d{2}/);
});
