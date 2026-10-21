import type { Catalog } from '../catalog';
import { KIND_LABEL } from '../catalog';
import { artifactHref, pluginHref, searchHref } from '../router';
import { InstallLine, KindBadge, Markdown } from '../components/common';
import type { ArtifactEntry } from '../types';

export function PluginPage({ cat, name }: { cat: Catalog; name: string }) {
  const p = cat.index.plugins.find((x) => x.name === name);
  if (!p) return <NotFound what={`плагін “${name}”`} />;
  const groups = (['skill', 'agent', 'command', 'hook'] as const)
    .map((k) => ({ kind: k, items: cat.index.artifacts.filter((a) => a.plugin === p.name && a.kind === k) }))
    .filter((g) => g.items.length);
  const repo = cat.index.marketplace.repoUrl;

  return (
    <main className="page page-detail">
      <a className="back" href={searchHref({})}>
        ← Назад
      </a>
      <div className="detail-head">
        <div className="detail-icon" aria-hidden>
          ◆
        </div>
        <div className="grow">
          <div className="row wrap">
            <h1>{p.displayName}</h1>
            <span className="badge version kind-plugin">v{p.version}</span>
            {p.compatibility && <span className="badge kind-skill">✓ {p.compatibility}</span>}
          </div>
          <p className="muted">{p.description}</p>
          <div className="mono faint small">
            {p.author} · оновлено {p.updated ?? '—'} · {p.license}
          </div>
        </div>
      </div>

      <div className="install-row">
        <InstallLine text={p.installCommand} id={`p:${p.name}`} />
        <a className="btn btn-ghost btn-lg" href={`${repo}/tree/main/${p.sourcePath}`} target="_blank" rel="noreferrer">
          View on GitHub ↗
        </a>
      </div>

      <section className="block">
        <h2>Склад плагіна</h2>
        {groups.map((g) => (
          <div key={g.kind} className="group">
            <div className="group-head">
              <span className={`dot kind-${g.kind}`} />
              <span className="upper">{KIND_LABEL[g.kind]}</span>
              <span className="mono faint">{g.items.length}</span>
            </div>
            <div className="comp-grid">
              {g.items.map((it) => (
                <a key={it.id} className="comp" href={artifactHref(it.id)}>
                  <div className="strong ellipsis">{it.name}</div>
                  {it.invocation && <div className="mono accent small ellipsis">{it.invocation}</div>}
                  <div className="muted small ellipsis">{it.description}</div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </section>

      {p.dependencies.length > 0 && (
        <section className="block">
          <h2>Залежності</h2>
          <div className="row wrap">
            {p.dependencies.map((d) => (
              <a key={d.name} className="dep" href={pluginHref(d.name)}>
                {d.name}@{d.version ?? '*'} ↗
              </a>
            ))}
          </div>
        </section>
      )}
      {p.dependents.length > 0 && (
        <section className="block">
          <h2>Використовується в</h2>
          <div className="row wrap">
            {p.dependents.map((d) => (
              <a key={d} className="dep" href={pluginHref(d)}>
                {d} ↗
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <h2>README</h2>
        <div className="panel">
          <Markdown path={p.body} />
        </div>
      </section>

      <section className="block">
        <h2>Changelog</h2>
        <div className="list">
          {p.changelog.map((c) => (
            <div key={c.version} className="change">
              <div className="row">
                <span className="mono strong kind-text-plugin">v{c.version}</span>
                <span className="faint small">{c.date}</span>
                {c.yanked && <span className="badge kind-hook">YANKED</span>}
              </div>
              <div className="muted small">{c.summary}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ArtifactPage({ cat, id }: { cat: Catalog; id: string }) {
  const a = cat.byId.get(id) as ArtifactEntry | undefined;
  if (!a || a.kind === ('plugin' as string)) return <NotFound what={`артефакт “${id}”`} />;
  const parent = cat.index.plugins.find((p) => p.name === a.plugin);
  return (
    <main className="page page-artifact">
      <div className="crumbs">
        <a href={searchHref({})}>Каталог</a>
        <span className="faint"> / </span>
        <a href={pluginHref(a.plugin)}>{parent?.displayName ?? a.plugin}</a>
        <span className="faint"> / {a.name}</span>
      </div>
      <div className="row wrap">
        <KindBadge kind={a.kind} />
        <h1>{a.qualifiedName}</h1>
        {a.invocation && <span className="invocation">{a.invocation}</span>}
      </div>
      <p className="muted">{a.description}</p>
      <div className="row wrap small faint">
        {a.model && <span className="mono">model: {a.model}</span>}
        {a.kind === 'skill' && !a.modelInvocable && <span className="mono">manual-only (disable-model-invocation)</span>}
        {a.kind === 'skill' && !a.userInvocable && <span className="mono">background reference (not in / menu)</span>}
      </div>
      {a.tools.length > 0 && (
        <div className="tools">
          <div className="facet-label">Tools / permissions</div>
          <div className="row wrap">
            {a.tools.map((t) => (
              <span key={t} className="tool">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="install-row">
        <InstallLine text={a.installCommand} id={`a:${a.id}`} />
      </div>
      <section className="block">
        <h2>Документація</h2>
        <div className="panel">
          <Markdown path={a.body} />
        </div>
      </section>
    </main>
  );
}

function NotFound({ what }: { what: string }) {
  return (
    <main className="page">
      <div className="empty">
        <h3>Не знайдено: {what}</h3>
        <a className="btn btn-ghost" href="#/">
          На головну
        </a>
      </div>
    </main>
  );
}
