import { createContext, useContext, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { loadBody } from '../catalog';

// ── copy-to-clipboard with a shared toast ──────────────────────────────────
interface CopyCtx {
  copied: string | null;
  copy: (text: string, id: string) => void;
}
export const CopyContext = createContext<CopyCtx>({ copied: null, copy: () => {} });

export function useCopyState() {
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t1 = setTimeout(() => setCopied(null), 2000);
    const t2 = setTimeout(() => setToast(false), 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [copied]);
  const copy = (text: string, id: string) => {
    const done = () => {
      setCopied(id);
      setToast(true);
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => (fallback(), done()));
    else (fallback(), done());
  };
  return { copied, copy, toast };
}

export function CopyButton({ text, id, variant = 'ghost', label = 'Copy install' }: { text: string; id: string; variant?: 'ghost' | 'primary' | 'link'; label?: string }) {
  const { copied, copy } = useContext(CopyContext);
  const done = copied === id;
  return (
    <button
      type="button"
      className={`btn btn-${variant}${done ? ' is-done' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        copy(text, id);
      }}
      aria-label={`${label}: ${text}`}
    >
      {done ? (variant === 'link' ? '✓' : 'Скопійовано ✓') : label}
    </button>
  );
}

export function Toast({ show }: { show: boolean }) {
  return show ? (
    <div className="toast" role="status" aria-live="polite">
      <span className="ok">✓</span> Скопійовано в буфер
    </div>
  ) : null;
}

export function KindBadge({ kind }: { kind: string }) {
  return <span className={`badge kind-${kind}`}>{kind}</span>;
}

export function InstallLine({ text, id }: { text: string; id: string }) {
  return (
    <div className="install">
      <div className="install-cmd">
        <span className="dollar">$</span>
        <code>{text}</code>
      </div>
      <CopyButton text={text} id={id} variant="primary" />
    </div>
  );
}

// ── markdown: marked → DOMPurify (repository content is untrusted HTML) ────
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(md: string): string {
  const html = marked.parse(md, { async: false, gfm: true }) as string;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function Markdown({ path }: { path: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setHtml(null);
    loadBody(path).then((md) => live && setHtml(renderMarkdown(md)));
    return () => {
      live = false;
    };
  }, [path]);
  if (html === null) return <div className="md muted">Завантаження…</div>;
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}
