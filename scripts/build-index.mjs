#!/usr/bin/env node
// build-index.mjs — builds the static catalog index for the GitHub Pages site from the
// repository itself: .claude-plugin/marketplace.json, each plugin's plugin.json, README,
// CHANGELOG, COMPATIBILITY, and the frontmatter + body of every skill and agent.
//
//   node scripts/build-index.mjs            write site/public/{index,releases,stats}.json + bodies/
//   node scripts/build-index.mjs --check    run every check, write nothing
//
// Checks (both modes; any failure → exit 1): marketplace entries ↔ plugin.json names,
// SemVer versions, dependencies exist + carry a range + no cycles, README/CHANGELOG/
// COMPATIBILITY present, newest CHANGELOG entry == plugin.json version, no absolute home
// paths or secret-looking strings in plugin files. No network, no dependencies.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'public');
const CHECK = process.argv.includes('--check');
const REPO_URL = 'https://github.com/VadymShkarbul/dev-digest-ai-marketplace';
const problems = [];
const fail = (msg) => problems.push(msg);

// ── small YAML-frontmatter reader (scalars, quoted strings, inline and block lists) ──
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const [, key, rawVal] = kv;
    let v = rawVal.trim();
    if (v === '' || v === '|' || v === '>') {
      const items = [];
      const block = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
        const l = lines[++i];
        const li = /^\s+-\s+(.*)$/.exec(l);
        if (li) items.push(unquote(li[1].trim()));
        else block.push(l.trim());
      }
      data[key] = items.length ? items : block.join(v === '|' ? '\n' : ' ');
      continue;
    }
    if (/^\[.*\]$/.test(v)) data[key] = v.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
    else data[key] = unquote(v);
  }
  return { data, body: m[2] };
}
function unquote(v) {
  if (/^".*"$/.test(v)) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
  if (v === 'true' || v === 'false') return v === 'true';
  return v;
}

const read = (p) => readFileSync(p, 'utf8');
const readJson = (p) => {
  try {
    return JSON.parse(read(p));
  } catch (e) {
    fail(`${path.relative(ROOT, p)}: invalid JSON (${e.message})`);
    return null;
  }
};
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const toList = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(/[,\s]+/).filter(Boolean) : []);

// Changelog: "## 1.1.0 — 2026-10-21" headings, bullet text summarised to one line.
function parseChangelog(text) {
  const out = [];
  const re = /^## \[?(\d+\.\d+\.\d+[\w.-]*)\]?\s*(?:[—–-]\s*(\d{4}-\d{2}-\d{2}))?(.*)$/gm;
  const heads = [...text.matchAll(re)];
  heads.forEach((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const body = text.slice(h.index + h[0].length, end);
    const bullets = body.split('\n').filter((l) => /^- /.test(l)).map((l) => l.slice(2).replace(/`/g, '').trim());
    const summary = (bullets[0] ?? '').replace(/\s+/g, ' ');
    out.push({ version: h[1], date: h[2] ?? null, yanked: /YANKED/.test(h[3] + body), summary: summary.length > 220 ? summary.slice(0, 217) + '…' : summary });
  });
  return out;
}

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (['node_modules', '.git', 'results'].includes(f)) continue;
    const abs = path.join(dir, f);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

const HOME_PATH = /(?:\/Users\/[A-Za-z][\w.-]*\/|\/home\/[a-z][\w.-]*\/|[A-Z]:\\Users\\)/;
const SECRET = /\b(sk-(?:or-|ant-)?[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_\w{20,}|AKIA[0-9A-Z]{16}|xox[bp]-[\w-]{10,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/;

// ── load ───────────────────────────────────────────────────────────────────
const market = readJson(path.join(ROOT, '.claude-plugin', 'marketplace.json'));
if (!market) {
  process.stderr.write(problems.join('\n') + '\n');
  process.exit(1);
}
let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short=12 HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  /* not a git checkout */
}

const plugins = [];
const artifacts = [];
const bodies = new Map();
const releases = [];

for (const entry of market.plugins ?? []) {
  if (typeof entry.source !== 'string') {
    fail(`${entry.name}: only relative-path sources are indexed (got ${JSON.stringify(entry.source)})`);
    continue;
  }
  const dir = path.resolve(ROOT, entry.source);
  const rel = path.relative(ROOT, dir).split(path.sep).join('/');
  const manifest = readJson(path.join(dir, '.claude-plugin', 'plugin.json'));
  if (!manifest) continue;
  if (manifest.name !== entry.name) fail(`${rel}: plugin.json name "${manifest.name}" ≠ marketplace entry "${entry.name}"`);
  if (!SEMVER.test(manifest.version ?? '')) fail(`${entry.name}: version "${manifest.version}" is not SemVer`);
  if (entry.version) fail(`${entry.name}: marketplace entry repeats "version" — plugin.json is the source of truth`);
  for (const doc of ['README.md', 'CHANGELOG.md', 'COMPATIBILITY.md']) if (!existsSync(path.join(dir, doc))) fail(`${entry.name}: missing ${doc}`);

  const changelog = existsSync(path.join(dir, 'CHANGELOG.md')) ? parseChangelog(read(path.join(dir, 'CHANGELOG.md'))) : [];
  if (changelog[0] && changelog[0].version !== manifest.version) fail(`${entry.name}: newest CHANGELOG entry ${changelog[0].version} ≠ plugin.json ${manifest.version}`);
  for (const c of changelog) releases.push({ plugin: entry.name, ...c });
  const compat = existsSync(path.join(dir, 'COMPATIBILITY.md'))
    ? (/Claude Code[^`\n]*`([^`]+)`/.exec(read(path.join(dir, 'COMPATIBILITY.md')))?.[1] ?? '')
    : '';

  const deps = (manifest.dependencies ?? []).map((d) => (typeof d === 'string' ? { name: d.split('@')[0], version: null } : { name: d.name, version: d.version ?? null }));
  for (const d of deps) if (!d.version) fail(`${entry.name}: dependency ${d.name} has no version range`);

  for (const f of walk(dir)) {
    const text = read(f);
    const r = path.relative(ROOT, f);
    if (HOME_PATH.test(text)) fail(`${r}: absolute home path — use \${CLAUDE_PLUGIN_ROOT}/\${CLAUDE_SKILL_DIR} or a repo-relative path`);
    if (SECRET.test(text)) fail(`${r}: looks like it contains a secret`);
  }

  const install = `/plugin install ${entry.name}@${market.name}`;
  const updated = changelog[0]?.date ?? null;
  const counts = { skill: 0, agent: 0, command: 0, hook: 0 };
  const pid = `plugin:${entry.name}`;

  const addArtifact = (kind, name, file, fm, body) => {
    counts[kind]++;
    const id = `${kind}:${entry.name}/${name}`;
    const bodyKey = `${kind}__${entry.name}__${name}.md`;
    bodies.set(bodyKey, body.trim());
    const userInvocable = kind === 'skill' ? fm['user-invocable'] !== false : false;
    artifacts.push({
      id, kind, plugin: entry.name, name, qualifiedName: `${entry.name}:${name}`,
      description: String(fm.description ?? '').trim(), keywords: manifest.keywords ?? [],
      invocation: kind === 'agent' ? `@agent-${entry.name}:${name}` : kind === 'skill' && userInvocable ? `/${entry.name}:${name}` : '',
      tools: kind === 'skill' ? toList(fm['allowed-tools']).map((t) => t.replace(/\(.*$/, '')).filter((t, i, a) => a.indexOf(t) === i) : toList(fm.tools),
      model: fm.model ?? null, userInvocable, modelInvocable: fm['disable-model-invocation'] !== true,
      version: manifest.version, author: manifest.author?.name ?? '', updated,
      installCommand: install, sourcePath: path.relative(ROOT, file).split(path.sep).join('/'), body: `bodies/${bodyKey}`,
      searchText: body.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').slice(0, 4000),
    });
  };

  const skillsDir = path.join(dir, 'skills');
  if (existsSync(skillsDir)) {
    for (const s of readdirSync(skillsDir).sort()) {
      const f = path.join(skillsDir, s, 'SKILL.md');
      if (!existsSync(f)) continue;
      const { data, body } = parseFrontmatter(read(f));
      if (!data.description) fail(`${path.relative(ROOT, f)}: no description`);
      if (String(data.description ?? '').length > 1024) fail(`${path.relative(ROOT, f)}: description over 1024 chars`);
      if (body.split('\n').length > 500) fail(`${path.relative(ROOT, f)}: SKILL.md over 500 lines`);
      addArtifact('skill', data.name ?? s, f, data, body);
    }
  }
  const agentsDir = path.join(dir, 'agents');
  if (existsSync(agentsDir)) {
    for (const a of readdirSync(agentsDir).filter((x) => x.endsWith('.md')).sort()) {
      const f = path.join(agentsDir, a);
      const { data, body } = parseFrontmatter(read(f));
      if (!data.description) fail(`${path.relative(ROOT, f)}: no description`);
      for (const k of ['hooks', 'mcpServers', 'permissionMode']) if (k in data) fail(`${path.relative(ROOT, f)}: "${k}" is ignored for plugin agents — move it to hooks/hooks.json`);
      addArtifact('agent', data.name ?? a.replace(/\.md$/, ''), f, data, body);
    }
  }
  const hooksFile = path.join(dir, 'hooks', 'hooks.json');
  if (existsSync(hooksFile)) {
    const h = readJson(hooksFile);
    for (const [event, groups] of Object.entries(h?.hooks ?? {})) {
      const name = `${event}${groups[0]?.matcher ? ` (${groups[0].matcher})` : ''}`;
      const first = groups[0]?.hooks?.[0] ?? {};
      const script = [first.command, ...(first.args ?? [])].map((s) => /([\w-]+)\.(?:mjs|js|sh|py)\b/.exec(String(s ?? ''))?.[1]).find(Boolean);
      addArtifact('hook', script ?? event.toLowerCase(), hooksFile, { description: h.description ?? name }, `**${name}**\n\n${h.description ?? ''}\n\n\`\`\`json\n${JSON.stringify(groups, null, 2)}\n\`\`\``);
    }
  }

  const readme = existsSync(path.join(dir, 'README.md')) ? read(path.join(dir, 'README.md')) : '';
  bodies.set(`plugin__${entry.name}.md`, readme.trim());
  plugins.push({
    id: pid, kind: 'plugin', name: entry.name, displayName: entry.displayName ?? manifest.displayName ?? entry.name,
    version: manifest.version, description: manifest.description ?? entry.description ?? '', author: manifest.author?.name ?? '',
    keywords: manifest.keywords ?? [], license: manifest.license ?? '', category: entry.category ?? '', compatibility: compat ? `Claude Code ${compat}` : '',
    updated, dependencies: deps, dependents: [], installCommand: install, sourcePath: rel, counts,
    changelog, body: `bodies/plugin__${entry.name}.md`,
    searchText: readme.replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').slice(0, 4000),
  });
}

// dependencies: exist, no cycles, dependents
const byName = new Map(plugins.map((p) => [p.name, p]));
for (const p of plugins) for (const d of p.dependencies) {
  if (!byName.has(d.name)) fail(`${p.name}: depends on ${d.name}, which is not in the catalog`);
  else byName.get(d.name).dependents.push(p.name);
}
const visiting = new Set();
const done = new Set();
const visit = (n, trail) => {
  if (done.has(n)) return;
  if (visiting.has(n)) return fail(`dependency cycle: ${[...trail, n].join(' → ')}`);
  visiting.add(n);
  for (const d of byName.get(n)?.dependencies ?? []) visit(d.name, [...trail, n]);
  visiting.delete(n);
  done.add(n);
};
for (const p of plugins) visit(p.name, []);

releases.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.plugin.localeCompare(b.plugin));
const kwCount = {};
for (const p of plugins) for (const k of p.keywords) kwCount[k] = (kwCount[k] ?? 0) + 1;
const stats = {
  plugins: plugins.length,
  byKind: ['skill', 'agent', 'command', 'hook'].reduce((o, k) => ({ ...o, [k]: artifacts.filter((a) => a.kind === k).length }), {}),
  keywords: kwCount,
};

if (problems.length) {
  process.stderr.write(`build-index: ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join('\n')}\n`);
  process.exit(1);
}
const index = {
  schema: 1, generatedAt: new Date().toISOString(), commit,
  marketplace: { name: market.name, description: market.description ?? '', owner: market.owner?.name ?? '', repoUrl: REPO_URL },
  plugins, artifacts,
};
if (CHECK) {
  process.stdout.write(`build-index --check: OK — ${plugins.length} plugins, ${artifacts.length} artifacts, ${releases.length} releases\n`);
  process.exit(0);
}
rmSync(path.join(OUT, 'bodies'), { recursive: true, force: true });
mkdirSync(path.join(OUT, 'bodies'), { recursive: true });
writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index) + '\n');
writeFileSync(path.join(OUT, 'releases.json'), JSON.stringify(releases, null, 1) + '\n');
writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(stats, null, 1) + '\n');
for (const [k, v] of bodies) writeFileSync(path.join(OUT, 'bodies', k), v + '\n');
process.stdout.write(`build-index: ${plugins.length} plugins, ${artifacts.length} artifacts, ${releases.length} releases, ${bodies.size} bodies → site/public/\n`);
