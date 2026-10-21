import { useEffect, useState } from 'react';

// Hash routes (GitHub Pages has no server-side rewrites):
//   #/  #/search?q=&kind=&kw=&author=&sort=  #/plugin/<name>  #/artifact/<id>  #/whats-new  #/getting-started
export type Route =
  | { name: 'home' }
  | { name: 'search'; q: string; kinds: string[]; kws: string[]; author: string | null; sort: string }
  | { name: 'plugin'; plugin: string }
  | { name: 'artifact'; id: string }
  | { name: 'whats-new' }
  | { name: 'getting-started' };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [p, qs = ''] = raw.split('?');
  const params = new URLSearchParams(qs);
  const parts = p.split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case 'search':
      return {
        name: 'search',
        q: params.get('q') ?? '',
        kinds: params.getAll('kind'),
        kws: params.getAll('kw'),
        author: params.get('author'),
        sort: params.get('sort') ?? 'relevance',
      };
    case 'plugin':
      return parts[1] ? { name: 'plugin', plugin: parts[1] } : { name: 'home' };
    case 'artifact':
      return parts[1] ? { name: 'artifact', id: parts.slice(1).join('/') } : { name: 'home' };
    case 'whats-new':
      return { name: 'whats-new' };
    case 'getting-started':
      return { name: 'getting-started' };
    default:
      return { name: 'home' };
  }
}

export function searchHref(s: { q?: string; kinds?: string[]; kws?: string[]; author?: string | null; sort?: string }): string {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  for (const k of s.kinds ?? []) p.append('kind', k);
  for (const k of s.kws ?? []) p.append('kw', k);
  if (s.author) p.set('author', s.author);
  if (s.sort && s.sort !== 'relevance') p.set('sort', s.sort);
  const qs = p.toString();
  return `#/search${qs ? `?${qs}` : ''}`;
}

export const pluginHref = (name: string) => `#/plugin/${encodeURIComponent(name)}`;
export const artifactHref = (id: string) => `#/artifact/${id.split('/').map(encodeURIComponent).join('/')}`;

export function navigate(href: string) {
  if (window.location.hash !== href) window.location.hash = href;
  window.scrollTo(0, 0);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
