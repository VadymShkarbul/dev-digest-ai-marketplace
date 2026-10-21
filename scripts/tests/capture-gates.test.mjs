// capture-gates.sh runs only commands that open a numbered gate line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../plugins/sdd-engineering/skills/run-plan/scripts/capture-gates.sh');

test('capture-gates: a note with backticks is not executed; NOT FOUND is not a pass', () => {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'cg-'));
  spawnSync('git', ['init', '-q'], { cwd: repo });
  spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x'], { cwd: repo });
  writeFileSync(path.join(repo, 'p.plan.md'), '# Plan\n\n## Verification gates (run in this order)\n1. `true` — source: test\n2. Audit from the Test plan. Expected: only `a.test.tsx:81` matches\n3. Test command: NOT FOUND (searched: package.json)\n\n## Out of scope\n');
  const art = mkdtempSync(path.join(os.tmpdir(), 'cg-art-'));
  const r = spawnSync('bash', [SCRIPT, path.join(repo, 'p.plan.md'), art], { cwd: repo, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const gates = readFileSync(path.join(art, 'gates.md'), 'utf8');
  assert.match(gates, /\| 1 \| `true` \| 0 \| ✅ pass \|/);
  assert.match(gates, /\| 2 \| — \| — \| not run — no command/);
  assert.match(gates, /\| 3 \| — \| — \| not run — no command/);
  assert.doesNotMatch(gates, /a\.test\.tsx:81` \| 127/);
});
