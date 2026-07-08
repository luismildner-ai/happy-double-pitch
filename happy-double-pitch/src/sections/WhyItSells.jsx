import { content } from '../content.js';
import Reveal from '../components/Reveal.jsx';
import CountUp from '../components/CountUp.jsx';
import ProductImage from '../components/ProductImage.jsx';

export default function WhyItSells() {
  const { whyItSells: s } = content;
  return (
    <section id="why-it-sells" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-neon-green)' }}>
          {s.eyebrow}
        </p>
        <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-[color:var(--color-text-primary)] sm:text-5xl">
          {s.title}
        </h2>
      </Reveal>

      {/* Animated stat counters */}
      <Reveal className="mt-14">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {s.stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border p-6 text-center"
              style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-surface)' }}
            >
              <div className="font-display text-5xl font-extrabold tabular-nums" style={{ color: 'var(--color-neon-pink)' }}>
                <CountUp value={stat.value} />
                {stat.suffix}
              </div>
              <p className="mt-2 font-body text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Market pitch points + box shot */}
      <div className="mt-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-4">
          {s.points.map((point, i) => (
            <Reveal key={point.title} delay={i * 0.06}>
              <div className="flex gap-4">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: 'var(--color-neon-green)', boxShadow: '0 0 10px var(--color-neon-green)' }}
                />
                <div>
                  <h3 className="font-display text-lg font-bold text-[color:var(--color-text-primary)]">{point.title}</h3>
                  <p className="mt-1 font-body text-sm leading-relaxed text-[color:var(--color-text-muted)]">{point.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <ProductImage image={s.boxBackImage} className="w-full" />
        </Reveal>
      </div>
    </section>
  );
}
