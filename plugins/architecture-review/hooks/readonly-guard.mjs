#!/usr/bin/env node
// readonly-guard.mjs — PreToolUse guard that keeps this plugin's subagents read-only.
//
// Plugin agents cannot carry `hooks:` frontmatter, so this is wired from hooks/hooks.json
// for every session and acts only when the hook input's `agent_type` is one of OWN_AGENTS.
// Everything else (the main session, other plugins) is allowed untouched. Exit 0 = allow,
// exit 2 = block. A denylist over the command text: it stops accidental mutation, not a
// determined bypass — the agent's `tools:` allowlist (no Write/Edit) is the primary control.

import { readFileSync } from 'node:fs';

const OWN_AGENTS = new Set(process.argv.slice(2));

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.stderr.write('readonly-guard: BLOCKED — could not parse hook input (failing closed)\n');
  process.exit(2);
}
const agent = typeof input.agent_type === 'string' ? input.agent_type : '';
if (!OWN_AGENTS.has(agent)) process.exit(0);

const block = (msg) => {
  process.stderr.write(`readonly-guard (${agent}): BLOCKED — ${msg}\n`);
  process.exit(2);
};

if (['Edit', 'Write', 'NotebookEdit', 'MultiEdit'].includes(input.tool_name)) block('this agent is read-only — report the change instead of making it');
if (input.tool_name !== 'Bash') process.exit(0);

const cmd = input?.tool_input?.command;
if (typeof cmd !== 'string') block('no command in tool input');
const bare = cmd.replace(/'[^']*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');

const CMD = String.raw`(?:^|[;&|(\x60]|\$\()\s*(?:(?:sudo|env|xargs|command|exec)(?:\s+-\S+)*\s+)*`;
const at = (word) => new RegExp(CMD + String.raw`(?:${word})(?=\s|$|;|&|\|)`);
const DENY = [
  [at('rm|rmdir|mv|cp|ln|mkdir|touch|chmod|chown|truncate|dd|install|shred|unlink|patch'), 'filesystem mutation'],
  [at('tee'), 'tee writes files'],
  [new RegExp(CMD + String.raw`(?:sed|perl|ruby)(?:\s[^;&|]*?)?\s(?:-[a-zA-Z]*i|--in-place)`), 'in-place edit'],
  [/\bfind\b[^;&|]*\s(?:-delete|-exec(?:dir)?\s+(?:rm|mv|cp|sed|chmod)\b)/, 'find with a mutating action'],
  [/\bgit\s+(?:(?:-C|-c)\s+\S+\s+|--\S+\s+)*(?:add|commit|push|pull|checkout|switch|reset|restore|stash|apply|am|rebase|merge|cherry-pick|revert|clean|rm|mv|tag|worktree|update-ref|config|init|clone)\b/, 'git write'],
  [/\b(?:pnpm|npm|yarn|pip|pip3|uv|poetry|cargo)\s+(?:add|install|i|ci|remove|rm|uninstall|up|update|upgrade|link|dlx|publish)\b/, 'dependency change'],
  [/\bnpx\b|\bpnpx\b/, 'npx runs arbitrary packages'],
  [/\bgh\s+(?:pr|issue|release|repo|workflow|run)\s+(?:create|merge|comment|edit|close|reopen|review|delete|rerun|cancel|fork)\b/, 'GitHub write'],
  [/\b(?:curl|wget)\b/, 'network from the shell — use WebFetch if this agent has it'],
];
const redir = bare
  .replace(/\d*>&\d+/g, '')
  .replace(/&?\d*>>?\s*\/dev\/null\b/g, '')
  .replace(/\d*>>?\s*(?:"|')?(?:\/private)?\/tmp\/\S*/g, '')
  .replace(/\d*>>?\s*(?:"|')?\/var\/folders\/\S*/g, '')
  .replace(/\d*>>?\s*(?:"|')?\$\{?TMPDIR\}?\S*/g, '');
if (/>/.test(redir.replace(/=>|->|<=|>=/g, ''))) block('output redirection into a repository file');
for (const [re, why] of DENY) if (re.test(bare)) block(`${why}: \`${cmd.slice(0, 160)}\``);
process.exit(0);
