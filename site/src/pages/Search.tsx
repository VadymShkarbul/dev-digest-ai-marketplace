import type { Catalog } from '../catalog';
import { KIND_LABEL, KINDS, displayName, metaLabel, runSearch } from '../catalog';
import type { Route } from '../router';
import { artifactHref, navigate, pluginHref, searchHref } from '../router';
import { CopyButton, KindBadge } from '../components/common';
import type { Entry } from '../types';

type SearchRoute = Extract<Route, { name: 'search' }>;

export function Search({ cat, route }: { cat: Catalog; route: SearchRoute }) {
  const { q, kinds, kws, author, sort } = route;
  const all = runSearch(cat, q);
  let list = all;
  if (kinds.length) list = list.filter((x) => kinds.includes(x.entry.kind));
  if (kws.length) list = list.filter((x) => kws.some((k) => x.entry.keywords.includes(k)));
  if (author) list = list.filter((x) => x.entry.author === author);
  list = [...list].sort((a, b) => {
    if (sort === 'name') return displayName(a.entry).localeCompare(displayName(b.entry));
    if (sort === 'updated') return (b.entry.updated ?? '').localeCompare(a.entry.updated ?? '');
    return b.score - a.score || displayName(a.entry).localeCompare(displayName(b.entry));
  });

  const set = (patch: Partial<SearchRoute>) => navigate(searchHref({ q, kinds, kws, author, sort, ...patch }));
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const countKind = (k: string) => all.filter((x) => x.entry.kind === k).length;
  const keywords = [...new Set(cat.entries.flatMap((e) => e.keywords))].sort();
  const authors = [...new Set(cat.entries.map((e) => e.author))].sort();

  return (
    <main className="page page-search">
      <aside className="facets">
        <div className="facets-head">
          <span className="facet-title">Фільтри</span>
          <button type="button" className="link" onClick={() => navigate(searchHref({}))}>
            Скинути
          </button>
        </div>
        <div className="facet-label">Тип</div>
        <div className="facet-list">
          {KINDS.map((k) => (
            <button key={k} type="button" className={`facet${kinds.includes(k) ? ' on' : ''}`} aria-pressed={kinds.includes(k)} onClick={() => set({ kinds: toggle(kinds, k) })}>
              <span className={`dot kind-${k}`} />
              <span className="grow cap">{KIND_LABEL[k]}</span>
              <span className="mono faint">{countKind(k)}</span>
            </button>
          ))}
        </div>
        <div className="facet-label">Keywords</div>
        <div className="kw-list">
          {keywords.map((k) => (
            <button key={k} type="button" className={`kw${kws.includes(k) ? ' on' : ''}`} aria-pressed={kws.includes(k)} onClick={() => set({ kws: toggle(kws, k) })}>
              {k}
            </button>
          ))}
        </div>
        <div className="facet-label">Автор</div>
        <div className="facet-list">
          {authors.map((a) => (
            <button key={a} type="button" className={`facet${author === a ? ' on' : ''}`} aria-pressed={author === a} onClick={() => set({ author: author === a ? null : a })}>
              <span className="grow ellipsis">{a}</span>
              <span className="mono faint">{cat.entries.filter((e) => e.author === a).length}</span>
            </button>
          ))}
        </div>
      </aside>

      <section>
        <div className="results-head">
          <div>
            <h1>{q ? `Результати: “${q}”` : 'Огляд каталогу'}</h1>
            <div className="muted">
              {list.length} {list.length === 1 ? 'артефакт' : 'артефактів'}
            </div>
          </div>
          <label className="sort">
            Сортувати
            <select value={sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="relevance">За релевантністю</option>
              <option value="name">За назвою</option>
              <option value="updated">Нещодавно оновлені</option>
            </select>
          </label>
        </div>
        {list.length ? (
          <div className="cards">
            {list.map(({ entry }) => (
              <Card key={entry.id} e={entry} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="big" aria-hidden>
              🔍
            </div>
            <h3>Нічого не знайшли</h3>
            <p>Спробуйте скинути фільтри або змінити запит.</p>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(searchHref({}))}>
              Скинути фільтри
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Card({ e }: { e: Entry }) {
  const href = e.kind === 'plugin' ? pluginHref(e.name) : artifactHref(e.id);
  return (
    <article className="card">
      <div className="card-body">
        <div className="card-top">
          <KindBadge kind={e.kind} />
          <span className="mono faint">v{e.version}</span>
        </div>
        <a className="card-title" href={href}>
          {e.kind === 'plugin' ? e.displayName : e.qualifiedName}
        </a>
        <p className="card-desc">{e.description}</p>
        <div className="card-kws">
          {e.keywords.slice(0, 3).map((k) => (
            <span key={k} className="mono faint">
              #{k}
            </span>
          ))}
        </div>
      </div>
      <div className="card-foot">
        <span className="faint ellipsis">{metaLabel(e)}</span>
        <div className="row">
          <CopyButton text={e.installCommand} id={`c:${e.id}`} />
          <a className="btn btn-primary btn-sm" href={href}>
            Відкрити
          </a>
        </div>
      </div>
    </article>
  );
}
