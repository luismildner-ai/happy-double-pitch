import { useState } from 'react';
import { content } from '../content.js';
import Reveal from '../components/Reveal.jsx';

/*
 * Closing CTA + contact block. The form is front-end only: on submit it opens a
 * prefilled mailto to the contact address. EDIT: wire form.onSubmit to a real
 * backend / form service (Formspree, your CRM, etc.) when ready.
 */
export default function LetsPartner() {
  const { letsPartner: s } = content;
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const subject = encodeURIComponent('Happy Double — sample / playtest request');
    const body = encodeURIComponent(
      `Name: ${data.get('name')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`
    );
    window.location.href = `mailto:${s.contactEmail}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  const fieldStyle = {
    borderColor: 'var(--color-surface-border)',
    background: 'var(--color-background)',
  };

  return (
    <section id="lets-partner" className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32">
      {/* ambient neon glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[500px] -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(circle, var(--color-neon-pink) 0%, transparent 70%)' }}
      />

      <Reveal className="relative text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-neon-pink)' }}>
          {s.eyebrow}
        </p>
        <h2 className="font-display mx-auto mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-[color:var(--color-text-primary)] sm:text-5xl">
          {s.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-body text-base leading-relaxed text-[color:var(--color-text-muted)]">{s.body}</p>
      </Reveal>

      <Reveal delay={0.1} className="relative mt-12">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-xl rounded-3xl border p-8"
          style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-surface)' }}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-left">
              <span className="font-body text-sm font-medium text-[color:var(--color-text-primary)]">{s.form.nameLabel}</span>
              <input
                name="name"
                type="text"
                required
                className="rounded-xl border px-4 py-3 font-body text-sm text-[color:var(--color-text-primary)] outline-none focus:border-[color:var(--color-neon-green)]"
                style={fieldStyle}
              />
            </label>
            <label className="flex flex-col gap-2 text-left">
              <span className="font-body text-sm font-medium text-[color:var(--color-text-primary)]">{s.form.emailLabel}</span>
              <input
                name="email"
                type="email"
                required
                className="rounded-xl border px-4 py-3 font-body text-sm text-[color:var(--color-text-primary)] outline-none focus:border-[color:var(--color-neon-green)]"
                style={fieldStyle}
              />
            </label>
          </div>
          <label className="mt-5 flex flex-col gap-2 text-left">
            <span className="font-body text-sm font-medium text-[color:var(--color-text-primary)]">{s.form.messageLabel}</span>
            <textarea
              name="message"
              rows={4}
              placeholder={s.form.messagePlaceholder}
              className="resize-none rounded-xl border px-4 py-3 font-body text-sm text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-neon-green)]"
              style={fieldStyle}
            />
          </label>
          <button
            type="submit"
            className="mt-6 w-full rounded-full py-3.5 font-body text-sm font-bold uppercase tracking-[0.1em] transition-transform duration-150 active:scale-[0.99]"
            style={{ background: 'var(--color-neon-pink)', color: '#0a0a0a' }}
          >
            {s.form.submitLabel}
          </button>
          {sent && (
            <p className="mt-4 text-center font-body text-sm" style={{ color: 'var(--color-neon-green)' }}>
              Opening your email app… or write us directly at {s.contactEmail}.
            </p>
          )}
          <p className="mt-4 text-center font-body text-sm text-[color:var(--color-text-muted)]">
            Or email{' '}
            <a href={`mailto:${s.contactEmail}`} className="underline" style={{ color: 'var(--color-neon-green)' }}>
              {s.contactEmail}
            </a>
          </p>
        </form>
      </Reveal>
    </section>
  );
}
