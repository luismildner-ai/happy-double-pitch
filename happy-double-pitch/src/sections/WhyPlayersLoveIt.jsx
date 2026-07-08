import { content } from '../content.js';
import Reveal from '../components/Reveal.jsx';

export default function WhyPlayersLoveIt() {
  const { whyPlayersLoveIt: s } = content;
  return (
    <section id="why-players" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-neon-pink)' }}>
          {s.eyebrow}
        </p>
        <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-[color:var(--color-text-primary)] sm:text-5xl">
          {s.title}
        </h2>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {s.points.map((point, i) => (
          <Reveal key={point.title} delay={i * 0.08}>
            <div
              className="h-full rounded-2xl border p-7 transition-colors duration-300 hover:border-[color:var(--color-neon-green)]"
              style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-surface)' }}
            >
              <h3 className="font-display text-xl font-bold text-[color:var(--color-text-primary)]">{point.title}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-[color:var(--color-text-muted)]">{point.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
