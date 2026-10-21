import MiniSearch from 'minisearch';
import type { CatalogIndex, Entry, Release } from './types';

export interface Catalog {
  index: CatalogIndex;
  releases: Release[];
  entries: Entry[];
  byId: Map<string, Entry>;
  search: MiniSearch<Entry>;
}

export const KIND_LABEL: Record<string, string> = {
  plugin: 'плагіни',
  skill: 'скіли',
  agent: 'агенти',
  command: 'команди',
  hook: 'hooks',
};
export const KINDS = ['plugin', 'skill', 'agent', 'command', 'hook'] as const;

export async function loadCatalog(): Promise<Catalog> {
  const [index, releases] = await Promise.all([
    fetch('./index.json').then((r) => {
      if (!r.ok) throw new Error(`index.json: HTTP ${r.status}`);
      return r.json() as Promise<CatalogIndex>;
    }),
    fetch('./releases.json').then((r) => (r.ok ? (r.json() as Promise<Release[]>) : [])),
  ]);
  const entries: Entry[] = [...index.plugins, ...index.artifacts];
  const search = new MiniSearch<Entry>({
    idField: 'id',
    fields: ['name', 'displayName', 'keywordsText', 'description', 'searchText'],
    storeFields: ['id'],
    extractField: (doc, field) => {
      if (field === 'keywordsText') return doc.keywords.join(' ');
      if (field === 'displayName') return 'displayName' in doc ? doc.displayName : doc.qualifiedName;
      return String((doc as unknown as Record<string, unknown>)[field] ?? '');
    },
    searchOptions: {
      boost: { name: 5, displayName: 4, keywordsText: 3, description: 2, searchText: 1 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
    },
  });
  search.addAll(entries);
  return { index, releases, entries, byId: new Map(entries.map((e) => [e.id, e])), search };
}

export function displayName(e: Entry): string {
  return e.kind === 'plugin' ? e.displayName : e.name;
}

export function metaLabel(e: Entry): string {
  return e.kind === 'plugin' ? e.author : `${e.plugin} · ${e.author}`;
}

/** Ranked search; an empty query returns every entry in catalog order. */
export function runSearch(cat: Catalog, q: string): { entry: Entry; score: number }[] {
  const query = q.trim();
  if (!query) return cat.entries.map((entry) => ({ entry, score: 0 }));
  return cat.search.search(query).flatMap((r) => {
    const entry = cat.byId.get(String(r.id));
    return entry ? [{ entry, score: r.score }] : [];
  });
}

const bodyCache = new Map<string, Promise<string>>();
export function loadBody(path: string): Promise<string> {
  if (!bodyCache.has(path)) {
    bodyCache.set(path, fetch(`./${path}`).then((r) => (r.ok ? r.text() : `_Не вдалося завантажити ${path}_`)));
  }
  return bodyCache.get(path)!;
}
