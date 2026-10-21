#!/usr/bin/env node
// cost-summary.mjs — compares eval-runner result files (series A vs B) for COST-BASELINE.md.
//
//   node scripts/cost-summary.mjs --a <scenario-A.json> [--a-suite <suite-A.json>] --b <scenario-B.json> [--b-suite <suite-B.json>]
//
// Prints a markdown table: per-run medians and min–max for cost, latency, tokens, API and
// tool calls; pass rate (all graders), runs without a critical failure, mean score; suite
// pass counts; provider-reported spend. A difference smaller than the spread of either
// series is labelled "within noise" — the script never claims a saving the data can't show.

import { readFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith('--') ? [...acc, [v.slice(2), a[i + 1]]] : acc), []));
if (!args.a || !args.b) {
  process.stderr.write('usage: cost-summary.mjs --a <A.json> [--a-suite <A-suite.json>] --b <B.json> [--b-suite <B-suite.json>]\n');
  process.exit(2);
}
const load = (f) => (f ? JSON.parse(readFileSync(f, 'utf8')) : null);
const median = (xs) => {
  const s = [...xs].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const range = (xs) => [Math.min(...xs), Math.max(...xs)];

function series(doc, suite) {
  const rs = doc.results;
  const m = (f) => rs.map(f);
  const s = {
    commit: doc.commit, model: doc.model, runs: rs.length,
    cost: m((r) => r.costUsd ?? 0), latency: m((r) => r.latencySec), api: m((r) => r.apiCalls), tools: m((r) => r.toolCalls),
    tin: m((r) => r.tokens.in), tout: m((r) => r.tokens.out), tcr: m((r) => r.tokens.cr), tcw: m((r) => r.tokens.cw),
    passAll: rs.filter((r) => r.pass).length, noCritical: rs.filter((r) => !r.criticalFailures.length).length,
    meanScore: rs.reduce((x, r) => x + r.score, 0) / rs.length, provider: doc.providerSpendUsd,
    criticals: rs.flatMap((r) => r.criticalFailures.map((c) => `#${r.run} ${c}`)),
  };
  if (suite) {
    s.suitePass = suite.results.filter((r) => r.pass).length;
    s.suiteTotal = suite.results.length;
    s.suiteFailed = suite.results.filter((r) => !r.pass).map((r) => `${r.case}${r.criticalFailures.length ? ' (critical)' : ''}`);
    s.suiteProvider = suite.providerSpendUsd;
  }
  return s;
}
const A = series(load(args.a), load(args['a-suite']));
const B = series(load(args.b), load(args['b-suite']));

const fmt = (k, d) => (v) => (k === '$' ? `$${v.toFixed(4)}` : k === 's' ? `${v.toFixed(0)} s` : k === 'k' ? `${(v / 1000).toFixed(1)}k` : v.toFixed(d ?? 0));
function row(label, key, f) {
  const a = A[key];
  const b = B[key];
  const ma = median(a);
  const mb = median(b);
  const [alo, ahi] = range(a);
  const [blo, bhi] = range(b);
  const delta = ma ? ((mb - ma) / ma) * 100 : 0;
  const spread = Math.max(ahi - alo, bhi - blo);
  const verdict = Math.abs(mb - ma) <= spread ? 'within noise' : delta < 0 ? 'lower' : 'higher';
  return `| ${label} | ${f(ma)} (${f(alo)}–${f(ahi)}) | ${f(mb)} (${f(blo)}–${f(bhi)}) | ${delta >= 0 ? '+' : ''}${delta.toFixed(0)} % · ${verdict} |`;
}

const out = [
  `| Metric (per run) | A · \`${A.commit}\` (n=${A.runs}) median (min–max) | B · \`${B.commit}\` (n=${B.runs}) median (min–max) | Δ median |`,
  '| --- | --- | --- | --- |',
  row('Cost, estimated', 'cost', fmt('$')),
  row('Latency', 'latency', fmt('s')),
  row('Input tokens (uncached)', 'tin', fmt('')),
  row('Output tokens', 'tout', fmt('k')),
  row('Cache-read tokens', 'tcr', fmt('k')),
  row('Cache-write tokens', 'tcw', fmt('k')),
  row('API calls', 'api', fmt('')),
  row('Tool calls', 'tools', fmt('')),
  `| Provider-reported spend, whole series | $${A.provider ?? '?'} | $${B.provider ?? '?'} | ${A.provider && B.provider ? `${(((B.provider / B.runs - A.provider / A.runs) / (A.provider / A.runs)) * 100).toFixed(0)} % per run` : '—'} |`,
  `| Runs passing every grader | ${A.passAll}/${A.runs} | ${B.passAll}/${B.runs} | |`,
  `| Runs without a critical failure | ${A.noCritical}/${A.runs} | ${B.noCritical}/${B.runs} | |`,
  `| Mean score | ${A.meanScore.toFixed(2)} | ${B.meanScore.toFixed(2)} | |`,
  `| Critical failures | ${A.criticals.join('; ') || 'none'} | ${B.criticals.join('; ') || 'none'} | |`,
];
if (A.suiteTotal != null && B.suiteTotal != null) {
  out.push(`| Eval set (1 run/case) | ${A.suitePass}/${A.suiteTotal} pass · failed: ${A.suiteFailed.join(', ') || '—'} · $${A.suiteProvider} | ${B.suitePass}/${B.suiteTotal} pass · failed: ${B.suiteFailed.join(', ') || '—'} · $${B.suiteProvider} | |`);
}
process.stdout.write(out.join('\n') + '\n');
