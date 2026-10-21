import { useEffect, useRef, useState } from 'react';
import type { Catalog } from './catalog';
import { displayName, loadCatalog, runSearch } from './catalog';
import { artifactHref, navigate, pluginHref, searchHref, useRoute } from './router';
import { CopyContext, Toast, useCopyState } from './components/common';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { ArtifactPage, PluginPage } from './pages/Detail';
import { GettingStarted, WhatsNew } from './pages/Info';
import type { Entry } from './types';

type Theme = 'dark' | 'light';
const THEME_KEY = 'catalog-theme';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function App() {
  const route = useRoute();
  const [cat, setCat] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [palette, setPalette] = useState(false);
  const [homeQuery, setHomeQuery] = useState('');
  const copyState = useCopyState();

  useEffect(() => {
    loadCatalog().then(setCat, (e) => setError(String(e)));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  useEffect(() => setPalette(false), [route]);

  const q = route.name === 'search' ? route.q : homeQuery;
  const onGlobalQuery = (v: string) => (route.name === 'search' ? navigate(searchHref({ ...route, q: v })) : (setHomeQuery(v), v && navigate(searchHref({ q: v }))));

  return (
    <CopyContext.Provider value={copyState}>
      <div className="app">
        <header className="topbar">
          <a className="brand" href="#/" onClick={() => setHomeQuery('')}>
            <span className="logo" aria-hidden>
              ◆
            </span>
            <span className="strong">Каталог</span>
            <span className="tag mono">dev-digest</span>
          </a>
          {route.name !== 'home' && (
            <div className="top-search">
              <span className="icon" aria-hidden>
                ⌕
              </span>
              <input value={q} onChange={(e) => onGlobalQuery(e.target.value)} placeholder="Пошук по каталогу…" aria-label="Пошук по каталогу" />
            </div>
          )}
          <div className="grow" />
          <button type="button" className="icon-btn mono" onClick={() => setPalette(true)} aria-label="Відкрити палітру команд (Cmd+K)">
            ⌘K
          </button>
          <button type="button" className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Перемкнути тему">
            {theme === 'dark' ? '☾' : '☀'}
          </button>
          {cat && (
            <a className="muted small" href={cat.index.marketplace.repoUrl} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          )}
        </header>

        {error && (
          <main className="page">
            <div className="empty">
              <h3>Не вдалося завантажити каталог</h3>
              <p className="muted mono small">{error}</p>
              <p className="muted small">Запусти node scripts/build-index.mjs перед збіркою сайту.</p>
            </div>
          </main>
        )}
        {!cat && !error && <main className="page muted">Завантаження каталогу…</main>}
        {cat && route.name === 'home' && <Home cat={cat} query={homeQuery} onQuery={onGlobalQuery} />}
        {cat && route.name === 'search' && <Search cat={cat} route={route} />}
        {cat && route.name === 'plugin' && <PluginPage cat={cat} name={route.plugin} />}
        {cat && route.name === 'artifact' && <ArtifactPage cat={cat} id={route.id} />}
        {cat && route.name === 'whats-new' && <WhatsNew cat={cat} />}
        {cat && route.name === 'getting-started' && <GettingStarted cat={cat} />}

        <footer className="footer faint small mono">
          {cat ? `${cat.index.marketplace.name} · index ${cat.index.commit} · ${cat.index.generatedAt.slice(0, 10)}` : ''} ·{' '}
          <a href="#/getting-started">Як почати</a>
        </footer>

        {cat && palette && <Palette cat={cat} onClose={() => setPalette(false)} />}
        <Toast show={copyState.toast} />
      </div>
    </CopyContext.Provider>
  );
}

function Palette({ cat, onClose }: { cat: Catalog; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const results = runSearch(cat, q).slice(0, 8).map((r) => r.entry);
  const open = (e: Entry) => navigate(e.kind === 'plugin' ? pluginHref(e.name) : artifactHref(e.id));
  return (
    <div className="overlay" onClick={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Перейти до артефакту" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <span className="faint" aria-hidden>
            ⌕
          </span>
          <input
            ref={input}
            value={q}
            onChange={(e) => (setQ(e.target.value), setSel(0))}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setSel((s) => Math.min(s + 1, results.length - 1));
              else if (e.key === 'ArrowUp') setSel((s) => Math.max(s - 1, 0));
              else if (e.key === 'Enter' && results[sel]) open(results[sel]);
            }}
            placeholder="Перейти до артефакту…"
            aria-label="Перейти до артефакту"
          />
          <span className="kbd mono">ESC</span>
        </div>
        <div className="palette-list">
          {results.map((e, i) => (
            <button key={e.id} type="button" className={`palette-item${i === sel ? ' on' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => open(e)}>
              <span className={`dot kind-${e.kind}`} />
              <span className="grow ellipsis">
                <span className="strong">{displayName(e)}</span> <span className="faint small">· {e.kind === 'plugin' ? 'плагін' : e.plugin}</span>
              </span>
              <span className="mono faint small cap">{e.kind}</span>
            </button>
          ))}
          {results.length === 0 && <div className="faint small center pad">Нічого не знайдено</div>}
        </div>
      </div>
    </div>
  );
}
