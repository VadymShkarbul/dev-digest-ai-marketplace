// Shapes of the files scripts/build-index.mjs writes into site/public/ (see docs/SITE-SPEC.md).

export type Kind = 'plugin' | 'skill' | 'agent' | 'command' | 'hook';

export interface ChangelogEntry {
  version: string;
  date: string | null;
  summary: string;
  yanked?: boolean;
}

export interface PluginEntry {
  id: string;
  kind: 'plugin';
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string;
  keywords: string[];
  license: string;
  category: string;
  compatibility: string;
  updated: string | null;
  dependencies: { name: string; version: string | null }[];
  dependents: string[];
  installCommand: string;
  sourcePath: string;
  counts: Record<'skill' | 'agent' | 'command' | 'hook', number>;
  changelog: ChangelogEntry[];
  body: string;
  searchText: string;
}

export interface ArtifactEntry {
  id: string;
  kind: Exclude<Kind, 'plugin'>;
  plugin: string;
  name: string;
  qualifiedName: string;
  description: string;
  keywords: string[];
  invocation: string;
  tools: string[];
  model: string | null;
  userInvocable: boolean;
  modelInvocable: boolean;
  version: string;
  author: string;
  updated: string | null;
  installCommand: string;
  sourcePath: string;
  body: string;
  searchText: string;
}

export type Entry = PluginEntry | ArtifactEntry;

export interface CatalogIndex {
  schema: number;
  generatedAt: string;
  commit: string;
  marketplace: { name: string; description: string; owner: string; repoUrl: string };
  plugins: PluginEntry[];
  artifacts: ArtifactEntry[];
}

export interface Release {
  plugin: string;
  version: string;
  date: string | null;
  summary: string;
  yanked?: boolean;
}
