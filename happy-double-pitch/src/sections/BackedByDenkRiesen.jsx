import { content } from '../content.js';
import Reveal from '../components/Reveal.jsx';

export default function BackedByDenkRiesen() {
  const { backedByDenkRiesen: s } = content;
  return (
    <section id="backed-by" className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
      <Reveal>
        <div
          className="rounded-3xl border p-10 sm:p-14"
          style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-surface)' }}
        >
          <p className="font-body text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-neon-green)' }}>
            {s.eyebrow}
          </p>
          <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-[color:var(--color-text-primary)] sm:text-4xl">
            {s.title}
            <span className="ml-3 font-body text-base font-normal text-[color:var(--color-text-muted)]">{s.subtitle}</span>
          </h2>
          <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-[color:var(--color-text-muted)]">{s.body}</p>

          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {s.facts.map((fact) => (
              <div key={fact.label}>
                <p className="font-body text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">{fact.label}</p>
                <p className="font-display mt-1 text-base font-bold text-[color:var(--color-text-primary)]">{fact.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
