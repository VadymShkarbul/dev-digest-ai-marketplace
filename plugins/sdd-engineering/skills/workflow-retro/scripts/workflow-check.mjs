#!/usr/bin/env node
// workflow-check.mjs — deterministic metrics for a multi-agent run, read straight from Claude
// Code's own transcripts (no orchestrator bookkeeping needed). No LLM, no network.
//
//   workflow-check.mjs [--session <id|latest|path.jsonl>] [--since <ISO|90m|2h>] [--until <ISO>]
//                      [--project-dir <dir>] [--out <dir>] [--json] [--record] [--compare]
//
// Reads <project-dir>/<session>.jsonl (the main conversation) and
// <project-dir>/<session>/subagents/agent-*.jsonl + .meta.json (one file per spawned agent).
// <project-dir> defaults to ${CLAUDE_CONFIG_DIR:-~/.claude}/projects/<cwd with "/" → "-">.
//
// Per agent: billed tokens (input / cache read / cache write / output, de-duplicated per API
// request), USD cost (pricing.json), cache-hit ratio, peak context, duration and active time,
// tool calls by kind, errors (classified), hook blocks, files read (incl. via Bash), re-reads,
// resumes, the final report and its "Run notes". Per session: execution sequence, overlap
// (parallelism), files read by ≥2 agents, human interactions, anomaly flags.
//
// Output: markdown summary on stdout (or JSON with --json). --out <dir> (must be under /tmp or
// $TMPDIR) also writes a digest for the workflow-retro agent: summary.md, metrics.json,
// agents/<NN>-<type>-<id>.md. --record appends one line per run to
// .sdd/workflow-history.jsonl; --compare prints deltas vs that history per agent type.
//
// Privacy: excerpts are truncated and secret-looking strings are redacted. Exit 0 ok, 2 usage.

import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRICING = JSON.parse(readFileSync(path.join(HERE, 'pricing.json'), 'utf8')).models;
const OWN_PLUGINS = /^(?:sdd-engineering|research-tools|architecture-review):/;
const GAP_MS = 5 * 60 * 1000; // an idle gap longer than this is not "active" time
const READ_CMDS = /^(?:cat|sed|head|tail|nl|less|more|wc|awk|bat|jq)$/;
const SEARCH_CMDS = /^(?:rg|grep|ag|find|ls|git)$/;
const PATHISH = /(?:^|[\s'"=(])((?:\.{0,2}\/|~\/|\/)?[\w@.\[\]()+-]+(?:\/[\w@.\[\]()+-]+)*\.(?:md|mdx|ts|tsx|js|jsx|mjs|cjs|json|jsonl|sql|sh|yml|yaml|toml|css|txt))(?=$|[\s'":;|&)])/g;

const die = (msg) => {
  process.stderr.write(`workflow-check: ${msg}\n`);
  process.exit(2);
};

// ── args ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const a = { session: 'latest', json: false, record: false, compare: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i] ?? die(`${k} needs a value`);
    if (k === '--session') a.session = v();
    else if (k === '--since') a.since = v();
    else if (k === '--until') a.until = v();
    else if (k === '--project-dir') a.projectDir = v();
    else if (k === '--out') a.out = v();
    else if (k === '--json') a.json = true;
    else if (k === '--record') a.record = true;
    else if (k === '--compare') a.compare = true;
    else die(`unknown argument ${k}`);
  }
  return a;
}

function parseWhen(s, now = Date.now()) {
  if (!s) return null;
  const rel = /^(\d+)\s*(m|h|d)$/.exec(s);
  if (rel) return now - Number(rel[1]) * { m: 60e3, h: 3600e3, d: 86400e3 }[rel[2]];
  const t = Date.parse(s);
  if (Number.isNaN(t)) die(`cannot parse time "${s}" (ISO or 90m / 2h / 1d)`);
  return t;
}

const projectSlug = (cwd) => cwd.replace(/[\/.]/g, '-');

function resolveSession(projectDir, session) {
  if (session.endsWith('.jsonl')) return { file: path.resolve(session), id: path.basename(session, '.jsonl') };
  if (session !== 'latest') return { file: path.join(projectDir, `${session}.jsonl`), id: session };
  if (!existsSync(projectDir)) die(`no transcripts at ${projectDir}`);
  const files = readdirSync(projectDir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => ({ f, m: statSync(path.join(projectDir, f)).mtimeMs }))
    .sort((x, y) => y.m - x.m);
  if (!files.length) die(`no session transcripts in ${projectDir}`);
  return { file: path.join(projectDir, files[0].f), id: files[0].f.replace(/\.jsonl$/, '') };
}

// ── helpers ────────────────────────────────────────────────────────────────

function readJsonl(file) {
  if (!existsSync(file)) return [];
  const out = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* a torn last line while the session is live — skip */
    }
  }
  return out;
}

const redact = (s) =>
  String(s ?? '')
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|sk-ant-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[abp]-[A-Za-z0-9-]{10,})\b/g, '[REDACTED]')
    .replace(/((?:password|passwd|secret|token|api[_-]?key)\s*[=:]\s*)\S+/gi, '$1[REDACTED]');
const clip = (s, n) => {
  const t = redact(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
const textOf = (content) =>
  typeof content === 'string' ? content : Array.isArray(content) ? content.map((c) => (typeof c === 'string' ? c : c?.text ?? '')).join('\n') : '';

function costOf(model, u) {
  const p = PRICING[model] ?? PRICING[String(model).replace(/^anthropic\//, '').replace(/\./g, '-')];
  if (!p) return null;
  const w1h = u.cw1h ?? 0;
  const w5m = (u.cw ?? 0) - w1h;
  return (u.in * p.in + u.cr * p.cache_read + w5m * p.cache_write_5m + w1h * p.cache_write_1h + u.out * p.out) / 1e6;
}

function classifyError(text) {
  if (/^PreToolUse:\w+ hook error/.test(text)) return 'hook-block';
  if (/^The user doesn't want to proceed with this tool use/.test(text)) return 'rejected';
  if (/^Permission to use \w+ (?:has been|was) denied|^Claude requested permissions/.test(text)) return 'permission';
  if (/^Exit code \d+/.test(text)) return 'exit';
  if (/File has not been read yet|String to replace not found|not unique/i.test(text)) return 'edit-misuse';
  if (/ENOENT|No such file|does not exist|not found/i.test(text)) return 'not-found';
  return 'other';
}

function pathsInBash(cmd, cwd) {
  const reads = [];
  for (const seg of cmd.split(/&&|\|\||;|\|/)) {
    const words = seg.trim().split(/\s+/);
    let w = 0;
    while (w < words.length && /^(?:cd|sudo|env|xargs|command|\w+=\S*)$/.test(words[w])) w += words[w] === 'cd' ? 2 : 1;
    const head = path.basename(words[w] ?? '');
    if (!READ_CMDS.test(head) && !SEARCH_CMDS.test(head)) continue;
    const kind = READ_CMDS.test(head) ? 'read' : 'search';
    for (const m of seg.matchAll(PATHISH)) reads.push({ path: normPath(m[1], cwd), kind });
  }
  return reads;
}

function normPath(p, cwd) {
  if (!p) return p;
  const abs = p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : path.resolve(cwd ?? '/', p);
  return cwd && abs.startsWith(cwd + path.sep) ? path.relative(cwd, abs) : abs;
}

function runNotes(report) {
  const m = /^#{2,3} Run notes[^\n]*\n([\s\S]*?)(?=^#{1,3} |\s*$(?![\s\S]))/m.exec(report ?? '');
  if (!m) return null;
  const notes = {};
  for (const line of m[1].split('\n')) {
    const k = /^-\s*\**(Hard|Easy|Duplicated|Missing)\**\s*:\s*(.+)$/i.exec(line.trim());
    if (k) notes[k[1].toLowerCase()] = k[2].trim();
  }
  return Object.keys(notes).length ? notes : { raw: m[1].trim() };
}

// ── per-transcript analysis ────────────────────────────────────────────────

function analyse(records, { id, type, description, window }) {
  const inWin = (r) => {
    const t = Date.parse(r.timestamp);
    return !Number.isNaN(t) && (!window.since || t >= window.since) && (!window.until || t <= window.until);
  };
  const recs = records.filter(inWin);
  const a = {
    id,
    type,
    description,
    models: new Set(),
    requests: new Map(),
    tools: {},
    bashReads: 0,
    readToolReads: 0,
    errors: [],
    reads: new Map(),
    times: [],
    finalReport: null,
    askUser: 0,
    rejections: 0,
    interrupts: 0,
    spawns: [],
    sendMessages: [],
    agentResults: [],
    results: new Map(), // tool_use id -> { text, isError } (used to settle a spawn's outcome)
  };
  const pending = new Map(); // tool_use id -> name
  for (const r of recs) {
    a.times.push(Date.parse(r.timestamp));
    const m = r.message;
    if (r.type === 'assistant' && m) {
      if (m.model && m.model !== '<synthetic>') a.models.add(m.model);
      const key = r.requestId ?? m.id;
      const u = m.usage;
      if (key && u) {
        const prev = a.requests.get(key);
        if (!prev || (u.output_tokens ?? 0) >= prev.out) {
          a.requests.set(key, {
            model: m.model,
            in: u.input_tokens ?? 0,
            cr: u.cache_read_input_tokens ?? 0,
            cw: u.cache_creation_input_tokens ?? 0,
            cw1h: u.cache_creation?.ephemeral_1h_input_tokens ?? 0,
            out: u.output_tokens ?? 0,
          });
        }
      }
      const text = [];
      for (const b of Array.isArray(m.content) ? m.content : []) {
        if (b.type === 'text' && b.text?.trim()) text.push(b.text);
        if (b.type !== 'tool_use') continue;
        pending.set(b.id, b.name);
        a.tools[b.name] = (a.tools[b.name] ?? 0) + 1;
        const inp = b.input ?? {};
        if (b.name === 'Read' && inp.file_path) {
          a.readToolReads++;
          bump(a.reads, normPath(inp.file_path, r.cwd), 'read');
        } else if (b.name === 'Bash' && inp.command) {
          for (const p of pathsInBash(inp.command, r.cwd)) {
            if (p.kind === 'read') a.bashReads++;
            bump(a.reads, p.path, p.kind);
          }
        } else if (b.name === 'SubagentHandback') {
          a.finalReport = inp.message ?? textOf(inp.content);
        } else if (b.name === 'AskUserQuestion') {
          a.askUser += (inp.questions ?? []).length || 1;
        } else if (b.name === 'Agent' || b.name === 'Task') {
          a.spawns.push({ toolUseId: b.id, at: r.timestamp, type: inp.subagent_type ?? 'general-purpose', description: inp.description ?? '', background: inp.run_in_background !== false });
        } else if (b.name === 'SendMessage') {
          a.sendMessages.push({ to: inp.to, at: r.timestamp });
        }
      }
      if (text.length && !a.finalReport) a.lastText = text.join('\n');
    }
    if (r.type === 'user' && m) {
      if (typeof m.content === 'string' && /\[Request interrupted by user/.test(m.content)) a.interrupts++;
      for (const b of Array.isArray(m.content) ? m.content : []) {
        if (b.type === 'text' && /\[Request interrupted by user/.test(b.text ?? '')) a.interrupts++;
        if (b.type !== 'tool_result') continue;
        const txt = textOf(b.content);
        a.results.set(b.tool_use_id, { text: txt, isError: Boolean(b.is_error) });
        if (/^The user doesn't want to proceed with this tool use/.test(txt)) a.rejections++;
        if (b.is_error) {
          a.errors.push({ tool: pending.get(b.tool_use_id) ?? '?', kind: classifyError(txt), excerpt: clip(txt, 160), at: r.timestamp });
        }
      }
      const tur = r.toolUseResult;
      if (tur && typeof tur === 'object' && tur.agentId) a.agentResults.push({ ...tur, at: r.timestamp });
    }
  }
  if (!a.finalReport) a.finalReport = a.lastText ?? null;
  // totals
  const t = { in: 0, cr: 0, cw: 0, cw1h: 0, out: 0, cost: 0, costKnown: true, peak: 0 };
  for (const q of a.requests.values()) {
    for (const k of ['in', 'cr', 'cw', 'cw1h', 'out']) t[k] += q[k];
    const c = costOf(q.model, q);
    if (c == null) t.costKnown = false;
    else t.cost += c;
    t.peak = Math.max(t.peak, q.in + q.cr + q.cw);
  }
  const times = a.times.filter(Number.isFinite).sort((x, y) => x - y);
  let active = 0;
  for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] < GAP_MS) active += times[i] - times[i - 1];
  return {
    ...a,
    models: [...a.models],
    nRequests: a.requests.size,
    totals: t,
    cacheHit: t.in + t.cr + t.cw ? t.cr / (t.in + t.cr + t.cw) : null,
    start: times[0] ?? null,
    end: times[times.length - 1] ?? null,
    activeMs: active,
    toolCalls: Object.values(a.tools).reduce((x, y) => x + y, 0),
    runNotes: runNotes(a.finalReport),
    empty: !recs.length,
  };
}

function bump(map, p, kind) {
  if (!p) return;
  const e = map.get(p) ?? { read: 0, search: 0 };
  e[kind]++;
  map.set(p, e);
}

// ── session ────────────────────────────────────────────────────────────────

export function checkSession({ projectDir, session = 'latest', since, until }) {
  const window = { since: parseWhen(since), until: parseWhen(until) };
  const { file, id } = resolveSession(projectDir, session);
  if (!existsSync(file)) die(`session transcript not found: ${file}`);
  const main = analyse(readJsonl(file), { id: 'main', type: 'main (orchestrator)', description: 'main session', window });

  const subDir = path.join(projectDir, id, 'subagents');
  const agents = [];
  if (existsSync(subDir)) {
    for (const f of readdirSync(subDir).filter((n) => /^agent-.+\.jsonl$/.test(n))) {
      const agentId = f.replace(/^agent-|\.jsonl$/g, '');
      const metaFile = path.join(subDir, `agent-${agentId}.meta.json`);
      const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
      const r = analyse(readJsonl(path.join(subDir, f)), { id: agentId, type: meta.agentType ?? '?', description: meta.description ?? '', window });
      if (r.empty) continue;
      r.meta = meta;
      const result = main.agentResults.find((x) => x.agentId === agentId);
      r.harness = result
        ? { status: result.status, totalTokens: result.totalTokens, totalDurationMs: result.totalDurationMs, totalToolUseCount: result.totalToolUseCount, toolStats: result.toolStats }
        : null;
      r.resumes = main.sendMessages.filter((s) => s.to === agentId).length;
      r.background = meta.requestShape ? meta.requestShape !== 'foreground' : null;
      const spawnResult = meta.toolUseId ? main.results.get(meta.toolUseId) : null;
      r.status = result?.status ?? (spawnResult && /^The user doesn't want to proceed/.test(spawnResult.text) ? 'interrupted by user' : spawnResult?.isError ? 'failed' : r.finalReport ? 'unknown' : 'no report');
      // A background spawn's first result is only 'async_launched'; one that later
      // handed back a final report did finish.
      if (r.status === 'async_launched' && r.finalReport) r.status = 'completed (background)';
      r.completed = r.status === 'completed' || r.status === 'completed (background)' || (r.status === 'unknown' && Boolean(r.finalReport));
      agents.push(r);
    }
  }
  agents.sort((x, y) => (x.start ?? 0) - (y.start ?? 0));

  // overlap / parallelism
  for (const x of agents) x.overlaps = agents.filter((y) => y !== x && y.start < x.end && x.start < y.end).map((y) => y.id);
  const spans = agents.filter((x) => x.start && x.end);
  const agentTime = spans.reduce((s, x) => s + (x.end - x.start), 0);
  const startAll = Math.min(...[main.start, ...spans.map((x) => x.start)].filter(Number.isFinite));
  const endAll = Math.max(...[main.end, ...spans.map((x) => x.end)].filter(Number.isFinite));
  let union = 0;
  let cur = null;
  for (const s of [...spans].sort((x, y) => x.start - y.start)) {
    if (!cur || s.start > cur[1]) {
      if (cur) union += cur[1] - cur[0];
      cur = [s.start, s.end];
    } else cur[1] = Math.max(cur[1], s.end);
  }
  if (cur) union += cur[1] - cur[0];

  // duplication
  const all = [main, ...agents];
  const readers = new Map();
  for (const a of all) for (const [p, e] of a.reads) if (e.read) readers.set(p, [...(readers.get(p) ?? []), a.id === 'main' ? 'main' : `${a.type}#${a.id.slice(0, 6)}`]);
  const shared = [...readers.entries()].filter(([, who]) => new Set(who).size >= 2).map(([p, who]) => ({ path: p, agents: [...new Set(who)] }));
  const reReads = [];
  for (const a of all) for (const [p, e] of a.reads) if (e.read >= 3) reReads.push({ agent: a.id === 'main' ? 'main' : `${a.type}#${a.id.slice(0, 6)}`, path: p, times: e.read });

  const sum = (k) => all.reduce((s, a) => s + a.totals[k], 0);
  const totals = { in: sum('in'), cr: sum('cr'), cw: sum('cw'), out: sum('out'), cost: all.reduce((s, a) => s + a.totals.cost, 0), costKnown: all.every((a) => a.totals.costKnown) };
  const flags = buildFlags({ main, agents, totals, shared, reReads });
  return {
    session: id,
    file,
    window: { since: window.since ? new Date(window.since).toISOString() : null, until: window.until ? new Date(window.until).toISOString() : null },
    wallMs: Number.isFinite(endAll - startAll) ? endAll - startAll : null,
    agentTimeMs: agentTime,
    agentUnionMs: union,
    parallelism: union ? agentTime / union : null,
    totals,
    main,
    agents,
    shared,
    reReads,
    human: { questions: main.askUser, rejections: main.rejections, interrupts: main.interrupts },
    flags,
  };
}

function buildFlags({ main, agents, totals, shared, reReads }) {
  const f = [];
  const label = (a) => `${a.type}#${a.id.slice(0, 6)}`;
  for (const a of agents) {
    if (!a.completed) f.push(`${label(a)} did not complete (${a.status}) — its partial work still cost ${usd(a.totals.cost, a.totals.costKnown)}`);
    // Only marketplace/project agents are asked for "Run notes"; built-ins (Explore, Plan, …) can't be.
    const own = OWN_PLUGINS.test(a.type) || existsSync(path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.claude/agents', `${a.type}.md`));
    if (own && a.completed && !a.runNotes) f.push(`${label(a)} returned no "Run notes" section — self-report missing`);
    if (totals.cost && a.totals.cost / totals.cost > 0.4 && agents.length > 1) f.push(`${label(a)} is ${Math.round((a.totals.cost / totals.cost) * 100)}% of the run's cost`);
    if (a.cacheHit != null && a.nRequests >= 5 && a.cacheHit < 0.8) f.push(`${label(a)} cache-hit ratio ${(a.cacheHit * 100).toFixed(0)}% (< 80%) — prompt prefix churn?`);
    if (a.bashReads > Math.max(5, a.readToolReads * 2)) f.push(`${label(a)} read files via Bash ${a.bashReads}× vs Read ${a.readToolReads}× — Read gives line numbers and is cheaper to re-cite`);
    const hard = a.errors.filter((e) => e.kind !== 'exit');
    if (hard.length >= 3) f.push(`${label(a)} hit ${hard.length} non-trivial tool errors (${[...new Set(hard.map((e) => e.kind))].join(', ')})`);
    if (a.errors.some((e) => e.kind === 'hook-block')) f.push(`${label(a)} was blocked by agent-guard ${a.errors.filter((e) => e.kind === 'hook-block').length}× — instruction/permission mismatch?`);
    if (a.totals.peak > 150_000) f.push(`${label(a)} peaked at ${Math.round(a.totals.peak / 1000)}k context tokens`);
    if (a.status === 'unknown') f.push(`${label(a)} has no spawn result in the main transcript (spawned outside this window?)`);
  }
  if (shared.length >= 3) f.push(`${shared.length} files were read by ≥2 agents — candidates for passing a digest instead of re-reading`);
  if (reReads.length) f.push(`${reReads.length} file(s) re-read ≥3× by the same agent`);
  if (main.rejections) f.push(`the human rejected ${main.rejections} tool call(s) in the main session`);
  return f;
}

// ── rendering ──────────────────────────────────────────────────────────────

const k = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n));
const usd = (c, known = true) => (c == null ? '—' : `$${c.toFixed(c < 1 ? 3 : 2)}${known ? '' : '+'}`);
const dur = (ms) => {
  if (ms == null || !Number.isFinite(ms)) return 'n/a';
  const s = Math.round(ms / 1000);
  return s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m` : s >= 60 ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s` : `${s}s`;
};
const hhmm = (t) => (t ? new Date(t).toISOString().slice(11, 16) : '—');

export function renderMarkdown(r) {
  const out = [];
  const t = r.totals;
  out.push(`# Workflow check — session ${r.session.slice(0, 8)}${r.window.since ? ` · since ${r.window.since}` : ''}`);
  out.push('');
  out.push(
    `**Agents:** ${r.agents.length} · **Wall-clock:** ${dur(r.wallMs)} · **Agent time:** ${dur(r.agentTimeMs)} (parallelism ×${r.parallelism ? r.parallelism.toFixed(2) : 'n/a'}) · ` +
      `**Cost:** ${usd(t.cost, t.costKnown)} (main ${usd(r.main.totals.cost, r.main.totals.costKnown)}) · ` +
      `**Billed tokens:** in ${k(t.in)} · cache-read ${k(t.cr)} · cache-write ${k(t.cw)} · out ${k(t.out)}`,
  );
  out.push('');
  out.push('## Agents (execution order)');
  out.push('| # | Agent | Task | Start | Dur. (active) | Req. | Tokens in/cr/cw/out | Cost | Cache hit | Peak ctx | Tools | Errors | Resumes | Run notes |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  r.agents.forEach((a, i) => {
    const tools = Object.entries(a.tools).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([n, c]) => `${n} ${c}`).join(', ');
    const errs = a.errors.length ? `${a.errors.length} (${[...new Set(a.errors.map((e) => e.kind))].join('/')})` : '0';
    out.push(
      `| ${i + 1} | ${a.type} \`${a.id.slice(0, 6)}\`${a.completed ? '' : ' ⛔'} | ${clip(a.description, 40)} | ${hhmm(a.start)} | ${dur(a.end - a.start)} (${dur(a.activeMs)}) | ${a.nRequests} | ` +
        `${k(a.totals.in)}/${k(a.totals.cr)}/${k(a.totals.cw)}/${k(a.totals.out)} | ${usd(a.totals.cost, a.totals.costKnown)} | ${a.cacheHit == null ? '—' : `${Math.round(a.cacheHit * 100)}%`} | ${k(a.totals.peak)} | ${tools || '—'} | ${errs} | ${a.resumes ?? 0} | ${a.runNotes ? '✓' : '—'} |`,
    );
  });
  out.push(
    `| | main (orchestrator) | | ${hhmm(r.main.start)} | ${dur(r.main.end - r.main.start)} (${dur(r.main.activeMs)}) | ${r.main.nRequests} | ${k(r.main.totals.in)}/${k(r.main.totals.cr)}/${k(r.main.totals.cw)}/${k(r.main.totals.out)} | ${usd(r.main.totals.cost, r.main.totals.costKnown)} | ${r.main.cacheHit == null ? '—' : `${Math.round(r.main.cacheHit * 100)}%`} | ${k(r.main.totals.peak)} | ${r.main.toolCalls} calls | ${r.main.errors.length} | | |`,
  );
  out.push('');
  out.push('## Sequence');
  for (const a of r.agents) {
    const par = a.overlaps.length ? ` ∥ with ${a.overlaps.map((o) => o.slice(0, 6)).join(', ')}` : '';
    out.push(`- ${hhmm(a.start)}–${hhmm(a.end)} **${a.type}** \`${a.id.slice(0, 6)}\` — ${clip(a.description, 60)}${a.resumes ? ` · resumed ${a.resumes}×` : ''}${par}${a.completed ? '' : ' · ⛔ not completed'}`);
  }
  out.push('');
  out.push('## Duplication');
  out.push(r.shared.length ? r.shared.slice(0, 15).map((s) => `- \`${s.path}\` read by ${s.agents.join(', ')}`).join('\n') : '- No file was read by more than one agent.');
  if (r.reReads.length) out.push(r.reReads.slice(0, 10).map((s) => `- \`${s.path}\` re-read ${s.times}× by ${s.agent}`).join('\n'));
  out.push('');
  out.push('## Friction');
  const fr = [...r.agents, r.main].filter((a) => a.errors.length);
  out.push(fr.length ? fr.map((a) => `- **${a.type}** \`${a.id.slice(0, 6)}\`: ${a.errors.slice(0, 3).map((e) => `${e.tool} ${e.kind} — "${e.excerpt}"`).join('; ')}${a.errors.length > 3 ? ` (+${a.errors.length - 3})` : ''}`).join('\n') : '- No tool errors.');
  out.push('');
  out.push(`## Human\n- Questions asked: ${r.human.questions} · tool calls rejected: ${r.human.rejections} · interrupts: ${r.human.interrupts}`);
  out.push('');
  out.push('## Flags');
  out.push(r.flags.length ? r.flags.map((x) => `- ⚠ ${x}`).join('\n') : '- None.');
  out.push('');
  out.push('_Tokens are summed per API request from the transcripts (billed consumption, cache reads included); the harness "subagent_tokens" figure is the final context size, not consumption. Output tokens come from usage snapshots and may slightly undercount streamed output. Costs use pricing.json._');
  return out.join('\n') + '\n';
}

function toJson(r) {
  const slim = (a) => ({
    id: a.id,
    type: a.type,
    description: a.description,
    models: a.models,
    start: a.start && new Date(a.start).toISOString(),
    end: a.end && new Date(a.end).toISOString(),
    activeMs: a.activeMs,
    requests: a.nRequests,
    totals: a.totals,
    cacheHit: a.cacheHit,
    tools: a.tools,
    bashReads: a.bashReads,
    readToolReads: a.readToolReads,
    errors: a.errors,
    resumes: a.resumes ?? 0,
    completed: a.completed ?? true,
    status: a.status ?? null,
    harness: a.harness ?? null,
    overlaps: a.overlaps ?? [],
    runNotes: a.runNotes,
  });
  return { ...r, main: slim(r.main), agents: r.agents.map(slim) };
}

function writeDigest(r, out) {
  const real = path.resolve(out);
  const tmp = process.env.TMPDIR ? path.resolve(process.env.TMPDIR) : null;
  if (!/^(\/private)?\/tmp\//.test(real + '/') && !(tmp && real.startsWith(tmp + path.sep))) die('--out must be under /tmp or $TMPDIR');
  mkdirSync(path.join(real, 'agents'), { recursive: true });
  writeFileSync(path.join(real, 'summary.md'), renderMarkdown(r));
  writeFileSync(path.join(real, 'metrics.json'), JSON.stringify(toJson(r), null, 2));
  r.agents.forEach((a, i) => {

    const body = [
      `# ${a.type} \`${a.id}\` — ${redact(a.description)}`,
      '',
      `Models: ${a.models.join(', ') || '?'} · requests ${a.nRequests} · cost ${usd(a.totals.cost, a.totals.costKnown)} · cache hit ${a.cacheHit == null ? '—' : `${Math.round(a.cacheHit * 100)}%`} · peak ctx ${k(a.totals.peak)} · resumes ${a.resumes ?? 0} · status ${a.status}`,
      `Tools: ${JSON.stringify(a.tools)} · reads via Read ${a.readToolReads}, via Bash ${a.bashReads}`,
      '',
      '## Run notes (self-report)',
      a.runNotes ? Object.entries(a.runNotes).map(([kk, v]) => `- ${kk}: ${redact(v)}`).join('\n') : '- (none returned)',
      '',
      '## Errors',
      a.errors.length ? a.errors.map((e) => `- ${hhmm(Date.parse(e.at))} ${e.tool} [${e.kind}] ${e.excerpt}`).join('\n') : '- None.',
      '',
      '## Files read (path · read/search counts)',
      [...a.reads.entries()].slice(0, 60).map(([p, e]) => `- ${p} · ${e.read}/${e.search}`).join('\n') || '- None.',
      '',
      '## Final report (redacted, truncated to 12k chars)',
      redact(a.finalReport ?? '(none)').slice(0, 12000),

    ];
    writeFileSync(path.join(real, 'agents', `${String(i + 1).padStart(2, '0')}-${a.type.replace(/[^\w-]/g, '_')}-${a.id.slice(0, 8)}.md`), body.join('\n') + '\n');
  });
  return real;
}

function historyFile() {
  return path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.sdd/workflow-history.jsonl');
}

function record(r) {
  const file = historyFile();
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(
    file,
    JSON.stringify({
      at: new Date().toISOString(),
      session: r.session,
      since: r.window.since,
      cost: r.totals.cost,
      wallMs: r.wallMs,
      agents: r.agents.map((a) => ({ type: a.type, cost: a.totals.cost, tokens: a.totals.in + a.totals.cr + a.totals.cw + a.totals.out, activeMs: a.activeMs, errors: a.errors.length, completed: a.completed })),
    }) + '\n',
  );
  return file;
}

function compare(r) {
  const file = historyFile();
  if (!existsSync(file)) return '## Compared with history\n- No history yet (run with --record).\n';
  const hist = readJsonl(file).filter((h) => !(h.session === r.session && h.since === r.window.since));
  const byType = new Map();
  for (const h of hist) for (const a of h.agents ?? []) byType.set(a.type, [...(byType.get(a.type) ?? []), a]);
  const med = (xs) => {
    const s = [...xs].sort((x, y) => x - y);
    return s.length ? s[Math.floor(s.length / 2)] : null;
  };
  const lines = ['## Compared with history (median of earlier runs per agent type)', '| Agent type | Runs | Cost now vs median | Active time now vs median |', '| --- | --- | --- | --- |'];
  for (const a of r.agents) {
    const prev = byType.get(a.type) ?? [];
    const mc = med(prev.map((p) => p.cost ?? 0));
    const mt = med(prev.map((p) => p.activeMs ?? 0));
    const pct = (now, m) => (m ? `${now >= m ? '+' : ''}${Math.round(((now - m) / m) * 100)}%` : 'n/a');
    lines.push(`| ${a.type} | ${prev.length} | ${usd(a.totals.cost)} vs ${usd(mc)} (${pct(a.totals.cost, mc)}) | ${dur(a.activeMs)} vs ${dur(mt)} (${pct(a.activeMs, mt)}) |`);
  }
  return lines.join('\n') + '\n';
}

// ── main ───────────────────────────────────────────────────────────────────

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const projectDir = args.projectDir ?? path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects', projectSlug(cwd));
  const r = checkSession({ projectDir, session: args.session, since: args.since, until: args.until });
  if (args.json) process.stdout.write(JSON.stringify(toJson(r), null, 2) + '\n');
  else process.stdout.write(renderMarkdown(r));
  if (args.compare && !args.json) process.stdout.write('\n' + compare(r));
  if (args.out) process.stderr.write(`digest: ${writeDigest(r, args.out)}\n`);
  if (args.record) process.stderr.write(`recorded: ${record(r)}\n`);
}
