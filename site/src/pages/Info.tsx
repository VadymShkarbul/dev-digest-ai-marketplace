import type { Catalog } from '../catalog';
import { pluginHref } from '../router';
import { CopyButton } from '../components/common';

export function WhatsNew({ cat }: { cat: Catalog }) {
  const name = (n: string) => cat.index.plugins.find((p) => p.name === n)?.displayName ?? n;
  return (
    <main className="page page-narrow">
      <a className="back" href="#/">
        ← На головну
      </a>
      <div className="row between">
        <h1>Що нового</h1>
        <a className="btn btn-ghost btn-sm mono" href={`${cat.index.marketplace.repoUrl}/tags`} target="_blank" rel="noreferrer">
          Releases ↗
        </a>
      </div>
      <div className="list">
        {cat.releases.map((r) => (
          <a key={`${r.plugin}@${r.version}`} className="release release-full" href={pluginHref(r.plugin)}>
            <div className="release-ver">
              <div className="mono strong kind-text-plugin">v{r.version}</div>
              <div className="mono faint small">{r.date}</div>
            </div>
            <div className="grow">
              <div className="strong">{name(r.plugin)}</div>
              <div className="muted small">{r.summary}</div>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}

export function GettingStarted({ cat }: { cat: Catalog }) {
  const mk = cat.index.marketplace.name;
  const repo = cat.index.marketplace.repoUrl.replace('https://github.com/', '');
  const steps = [
    { title: 'Додати marketplace як джерело', desc: 'Реєструє репозиторій каталогу у твоєму Claude Code (для команди — зі scope project).', cmd: `claude plugin marketplace add ${repo} --scope project` },
    { title: 'Встановити потрібний плагін', desc: 'Залежності (engineering-paved-path, research-tools, architecture-review) встановляться автоматично.', cmd: `claude plugin install sdd-engineering@${mk} --scope project` },
    { title: 'Перевірити, що все зарезолвилось', desc: 'Жодного dependency-unsatisfied чи dependency-version-unsatisfied у errorDetails.', cmd: 'claude plugin list --json' },
    { title: 'Оновлювати', desc: 'Спершу список джерел, потім сам плагін; після цього /reload-plugins або нова сесія.', cmd: `claude plugin marketplace update ${mk} && claude plugin update sdd-engineering@${mk} --scope project` },
  ];
  return (
    <main className="page page-narrow">
      <a className="back" href="#/">
        ← На головну
      </a>
      <h1>Як підключити marketplace</h1>
      <p className="muted">Спершу додай marketplace як джерело, потім став окремі плагіни. Усередині Claude Code ті самі команди доступні як /plugin ….</p>
      <div className="steps">
        {steps.map((s, i) => (
          <div key={i} className="step">
            <div className="step-n">{i + 1}</div>
            <div className="grow">
              <h3>{s.title}</h3>
              <p className="muted small">{s.desc}</p>
              <div className="install-cmd">
                <span className="dollar">$</span>
                <code>{s.cmd}</code>
                <CopyButton text={s.cmd} id={`s:${i}`} variant="link" label="Copy" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="note">
        <strong>marketplace update vs plugin update.</strong> Перше оновлює список джерел (звідки брати плагіни), друге — код конкретного встановленого плагіна.
      </div>
      <div className="note">
        <strong>Stable channel.</strong> Для перевіреної версії додай окремий marketplace <code>{mk}-stable</code>, закріплений на release tag — див.{' '}
        <a href={`${cat.index.marketplace.repoUrl}/blob/main/docs/RELEASES.md`} target="_blank" rel="noreferrer">
          RELEASES.md
        </a>
        .
      </div>
    </main>
  );
}
