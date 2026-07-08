import { content } from '../content.js';

export default function Nav() {
  const { nav } = content;
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[color:var(--color-surface-border)] bg-[color:var(--color-background)]/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <span className="font-display text-sm font-bold tracking-[0.14em]">{nav.logoText}</span>
        <a
          href="#lets-partner"
          className="rounded-full border px-4 py-2 font-body text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-200 hover:text-[color:var(--color-background)]"
          style={{
            borderColor: 'var(--color-neon-pink)',
            color: 'var(--color-neon-pink)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-neon-pink)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {nav.cta}
        </a>
      </div>
    </header>
  );
}
