import type { Catalog } from '../catalog';
import { KIND_LABEL, KINDS } from '../catalog';
import { navigate, pluginHref, searchHref } from '../router';

export function Home({ cat, query, onQuery }: { cat: Catalog; query: string; onQuery: (q: string) => void }) {
  const { entries, releases, index } = cat;
  const countBy = (k: string) => entries.filter((e) => e.kind === k).length;
  const kw: Record<string, number> = {};
  for (const p of index.plugins) for (const k of p.keywords) kw[k] = (kw[k] ?? 0) + 1;
  const chips = Object.keys(kw).sort((a, b) => kw[b] - kw[a] || a.localeCompare(b)).slice(0, 7);
  const displayOf = (n: string) => index.plugins.find((p) => p.name === n)?.displayName ?? n;

  return (
    <main className="page page-home">
      <section className="hero">
        <div className="eyebrow">Marketplace плагінів · скілів · агентів</div>
        <h1>
          Знайди потрібний артефакт
          <br />і постав його одним copy-paste
        </h1>
        <p className="lead">Клієнтський пошук по описах, frontmatter і тілу markdown. Без бекенду — уся статика зібрана в CI.</p>
        <div className="hero-search">
          <span className="icon" aria-hidden>
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(searchHref({ q: query }))}
            placeholder='Опиши, що треба — напр. "скіл для тестування React"'
            aria-label="Пошук по каталогу"
          />
        </div>
        <div className="chips">
          {chips.map((c) => (
            <a key={c} className="chip" href={searchHref({ kws: [c] })}>
              #{c}
            </a>
          ))}
        </div>
      </section>

      {entries.length === 0 ? (
        <section className="empty">
          <div className="big" aria-hidden>
            📦
          </div>
          <h2>Каталог порожній</h2>
          <p>Ще немає жодного плагіна. Додай перший — і він одразу зʼявиться тут після білду індексу в CI.</p>
          <div className="row">
            <a className="btn btn-primary" href="#/getting-started">
              Як почати
            </a>
            <a className="btn btn-ghost" href={`${index.marketplace.repoUrl}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">
              CONTRIBUTING.md
            </a>
          </div>
        </section>
      ) : (
        <>
          <section className="stats">
            {(
              [
                ['plugin', 'плагінів'],
                ['skill', 'скілів'],
                ['agent', 'агентів'],
                ['hook', 'hooks'],
              ] as const
            ).map(([k, label]) => (
              <a key={k} className="stat" href={searchHref({ kinds: [k] })}>
                <div className="num">{countBy(k)}</div>
                <div className="lbl">{label}</div>
              </a>
            ))}
            <div className="stat stat-static">
              <div className="num">{index.plugins.reduce((s, p) => s + p.dependencies.length, 0)}</div>
              <div className="lbl">залежностей</div>
            </div>
          </section>

          <section className="block">
            <div className="block-head">
              <h2>Що нового</h2>
              <a href="#/whats-new" className="muted">
                Уся стрічка →
              </a>
            </div>
            <div className="list">
              {releases.slice(0, 4).map((r) => (
                <a key={`${r.plugin}@${r.version}`} className="release" href={pluginHref(r.plugin)}>
                  <span className="badge version kind-plugin">v{r.version}</span>
                  <div className="grow">
                    <div className="strong">{displayOf(r.plugin)}</div>
                    <div className="muted ellipsis">{r.summary}</div>
                  </div>
                  <span className="mono faint">{r.date}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="block">
            <h2>Переглянути за типом</h2>
            <div className="browse">
              {KINDS.map((k) => (
                <a key={k} className="browse-kind" href={searchHref({ kinds: [k] })}>
                  <span className={`dot kind-${k}`} />
                  <span className="cap">{KIND_LABEL[k]}</span>
                  <span className="mono faint">{countBy(k)}</span>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
