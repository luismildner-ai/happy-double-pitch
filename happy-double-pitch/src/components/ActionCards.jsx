import { useState } from 'react';
import { content, theme } from '../content.js';

/*
 * Flippable Action Cards. Click (or keyboard Enter/Space) to flip a card and
 * reveal its effect. Three archetypes come from content.js: protect / push /
 * disrupt. Uses a CSS 3D flip; respects the shared reduced-motion rules.
 */
const colorFor = (key) => (key === 'neonGreen' ? theme.colors.neonGreen : theme.colors.neonPink);

function FlipCard({ card }) {
  const [flipped, setFlipped] = useState(false);
  const accent = colorFor(card.color);

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      className="group relative h-64 w-full [perspective:1200px]"
    >
      <div
        className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 [backface-visibility:hidden]"
          style={{ borderColor: accent, background: 'var(--color-surface)', boxShadow: `0 0 24px -12px ${accent}` }}
        >
          <span
            className="rounded-full px-3 py-1 font-body text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ background: accent, color: '#0a0a0a' }}
          >
            {card.tag}
          </span>
          <span className="font-display text-2xl font-bold text-[color:var(--color-text-primary)]">{card.front}</span>
          <span className="font-body text-xs text-[color:var(--color-text-muted)]">Tap to reveal</span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col justify-center gap-2 rounded-2xl border p-6 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ borderColor: accent, background: 'var(--color-background-elevated)' }}
        >
          <span className="font-display text-lg font-bold" style={{ color: accent }}>
            {card.front}
          </span>
          <p className="font-body text-sm leading-relaxed text-[color:var(--color-text-muted)]">{card.back}</p>
        </div>
      </div>
    </button>
  );
}

export default function ActionCards() {
  const { actionCards } = content.howItPlays;
  return (
    <div>
      <div className="mb-6 text-center">
        <h3 className="font-display text-xl font-bold text-[color:var(--color-text-primary)]">{actionCards.title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--color-text-muted)]">{actionCards.body}</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {actionCards.cards.map((card) => (
          <FlipCard key={card.front} card={card} />
        ))}
      </div>
    </div>
  );
}
