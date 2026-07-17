import { useState } from 'react';
import { content } from '../content.js';
import Reveal from '../components/Reveal.jsx';

/*
 * Closing CTA + contact block. Submits to /api/send-email (a Vercel serverless
 * function using Resend) in the background — no mailto, no page navigation.
 * Requires RESEND_API_KEY set as a Vercel environment variable; see
 * api/send-email.js. Local `npm run dev` does not run the function (Vite
 * doesn't serve /api) — use `vercel dev` or a deployed preview to test it.
 */
export default function LetsPartner() {
  const { letsPartner: s } = content;
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      name: data.get('name'),
      email: data.get('email'),
      message: data.get('message'),
    };
    setName(payload.name);
    setStatus('sending');
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('request failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
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
      </Reveal>

      <Reveal delay={0.1} className="relative mt-12">
        {status === 'sent' ? (
          <div
            className="mx-auto max-w-xl rounded-3xl border p-8 text-center"
            style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-surface)' }}
          >
            <h3 className="font-display text-2xl font-bold" style={{ color: 'var(--color-neon-green)' }}>
              {s.form.successTitle.replace('{name}', name)}
            </h3>
            <p className="mt-3 font-body text-sm leading-relaxed text-[color:var(--color-text-muted)]">
              {s.form.successBody}
            </p>
          </div>
        ) : (
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
                  disabled={status === 'sending'}
                  className="rounded-xl border px-4 py-3 font-body text-sm text-[color:var(--color-text-primary)] outline-none focus:border-[color:var(--color-neon-green)] disabled:opacity-60"
                  style={fieldStyle}
                />
              </label>
              <label className="flex flex-col gap-2 text-left">
                <span className="font-body text-sm font-medium text-[color:var(--color-text-primary)]">{s.form.emailLabel}</span>
                <input
                  name="email"
                  type="email"
                  required
                  disabled={status === 'sending'}
                  className="rounded-xl border px-4 py-3 font-body text-sm text-[color:var(--color-text-primary)] outline-none focus:border-[color:var(--color-neon-green)] disabled:opacity-60"
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
                disabled={status === 'sending'}
                className="resize-none rounded-xl border px-4 py-3 font-body text-sm text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--color-neon-green)] disabled:opacity-60"
                style={fieldStyle}
              />
            </label>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-body text-sm font-bold uppercase tracking-[0.1em] transition-transform duration-150 active:scale-[0.99] disabled:opacity-70"
              style={{ background: 'var(--color-neon-pink)', color: '#0a0a0a' }}
            >
              {status === 'sending' && (
                <span
                  aria-hidden
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              )}
              {status === 'sending' ? s.form.sendingLabel : s.form.submitLabel}
            </button>
            {status === 'error' && (
              <div className="mt-4 text-center">
                <p className="font-body text-sm" style={{ color: 'var(--color-neon-pink)' }}>
                  {s.form.errorMessage}{' '}
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="underline"
                    style={{ color: 'var(--color-neon-pink)' }}
                  >
                    {s.form.retryLabel}
                  </button>
                </p>
              </div>
            )}
            <p className="mt-4 text-center font-body text-sm text-[color:var(--color-text-muted)]">
              Or email{' '}
              <a href={`mailto:${s.contactEmail}`} className="underline" style={{ color: 'var(--color-neon-green)' }}>
                {s.contactEmail}
              </a>
            </p>
          </form>
        )}
      </Reveal>
    </section>
  );
}
