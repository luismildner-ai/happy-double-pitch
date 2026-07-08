import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { content } from '../content.js';
import Reveal from '../components/Reveal.jsx';

/*
 * Localization pitch. A language toggle swaps a sample of on-box / on-card text
 * between EN / DE / FR to show how easily the game adapts to a new market.
 * Dummy translations live in content.js (builtToTravel.languages).
 */
export default function BuiltToTravel() {
  const { builtToTravel: s } = content;
  const [active, setActive] = useState(0);
  const lang = s.languages[active];

  return (
    <section id="built-to-travel" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-neon-pink)' }}>
          {s.eyebrow}
        </p>
        <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-[color:var(--color-text-primary)] sm:text-5xl">
          {s.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-body text-base leading-relaxed text-[color:var(--color-text-muted)]">{s.body}</p>
      </Reveal>

      <Reveal className="mt-12">
        {/* Language toggle */}
        <div className="flex justify-center gap-2">
          {s.languages.map((l, i) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              className="rounded-full border px-5 py-2 font-body text-sm font-semibold transition-colors duration-200"
              style={{
                borderColor: active === i ? 'var(--color-neon-green)' : 'var(--color-surface-border)',
                background: active === i ? 'var(--color-neon-green)' : 'transparent',
                color: active === i ? '#0a0a0a' : 'var(--color-text-muted)',
              }}
            >
              {l.code}
            </button>
          ))}
        </div>

        {/* Sample "box panel" that swaps language */}
        <div className="mx-auto mt-8 max-w-md">
          <div
            className="relative overflow-hidden rounded-3xl border p-8"
            style={{ borderColor: 'var(--color-neon-pink)', background: 'var(--color-surface)', boxShadow: '0 0 40px -20px var(--color-neon-pink)' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={lang.code}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <p className="font-body text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{lang.label}</p>
                <p className="font-display mt-3 text-2xl font-extrabold" style={{ color: 'var(--color-neon-pink)' }}>
                  {lang.sample.tagline}
                </p>
                <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--color-surface-border)' }}>
                  <p className="font-body text-xs uppercase tracking-wider" style={{ color: 'var(--color-neon-green)' }}>
                    Action Card
                  </p>
                  <p className="font-display mt-1 text-lg font-bold text-[color:var(--color-text-primary)]">{lang.sample.card}</p>
                  <p className="mt-3 font-body text-sm leading-relaxed text-[color:var(--color-text-muted)]">{lang.sample.instruction}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="mt-4 text-center font-body text-xs text-[color:var(--color-text-muted)]">
            {/* DUMMY COPY — replace with reviewed translations before launch. */}
            Sample translations shown for demonstration.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
