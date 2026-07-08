import { content } from '../content.js';
import Reveal from '../components/Reveal.jsx';
import DiceDemo from '../components/DiceDemo.jsx';
import ActionCards from '../components/ActionCards.jsx';
import PillPhoto from '../components/PillPhoto.jsx';

export default function HowItPlays() {
  const { howItPlays } = content;
  return (
    <section id="how-it-plays" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal className="text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-neon-green)' }}>
          {howItPlays.eyebrow}
        </p>
        <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-[color:var(--color-text-primary)] sm:text-5xl">
          {howItPlays.title}
        </h2>
      </Reveal>

      {/* 5 steps */}
      <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border sm:grid-cols-5" style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-surface-border)' }}>
        {howItPlays.steps.map((step, i) => (
          <Reveal key={step.n} delay={i * 0.08}>
            <div className="flex h-full flex-col gap-2 p-5" style={{ background: 'var(--color-background)' }}>
              <span className="font-display text-sm font-bold" style={{ color: 'var(--color-neon-pink)' }}>
                {step.n}
              </span>
              <span className="font-display text-lg font-bold text-[color:var(--color-text-primary)]">{step.title}</span>
              <span className="font-body text-sm leading-relaxed text-[color:var(--color-text-muted)]">{step.body}</span>
            </div>
          </Reveal>
        ))}
      </div>

      {/* "In the box" — DenkRiesen-style pill-label feature cards */}
      <Reveal className="mt-16">
        <h3 className="font-display mb-6 text-center text-xl font-bold text-[color:var(--color-text-primary)]">
          {howItPlays.componentsTitle}
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {howItPlays.components.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.08}>
              <PillPhoto item={item} />
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* Interactive dice demo + reactive owls */}
      <Reveal className="mt-14">
        <DiceDemo />
      </Reveal>

      {/* Flippable action cards */}
      <Reveal className="mt-14">
        <ActionCards />
      </Reveal>
    </section>
  );
}
