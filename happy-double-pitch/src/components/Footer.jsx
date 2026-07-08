import { content } from '../content.js';

export default function Footer() {
  const { footer, nav } = content;
  return (
    <footer className="border-t px-6 py-10" style={{ borderColor: 'var(--color-surface-border)' }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="font-display text-sm font-bold tracking-[0.14em]">{nav.logoText}</span>
        <p className="font-body text-xs text-[color:var(--color-text-muted)]">{footer.copy}</p>
      </div>
    </footer>
  );
}
