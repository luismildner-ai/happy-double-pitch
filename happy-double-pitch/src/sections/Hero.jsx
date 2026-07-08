import { motion } from 'framer-motion';
import { content } from '../content.js';
import ProductImage from '../components/ProductImage.jsx';

export default function Hero() {
  const { hero } = content;
  const [riskWord, runWord] = hero.tagline.split('. ').map((w, i) => (i === 0 ? `${w}.` : w));

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16">
      {/* Ambient neon glow behind the product shot — subtle, not a spotlight. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            'radial-gradient(circle, var(--color-neon-pink) 0%, var(--color-neon-green) 55%, transparent 75%)',
        }}
      />

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative font-body text-xs font-semibold uppercase tracking-[0.22em]"
        style={{ color: 'var(--color-neon-green)' }}
      >
        {hero.eyebrow}
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="font-display relative mt-4 text-center text-6xl font-extrabold leading-[0.95] tracking-tight text-[color:var(--color-text-primary)] sm:text-7xl md:text-8xl"
      >
        {hero.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="font-display relative mt-3 text-center text-2xl font-bold tracking-wide sm:text-3xl"
      >
        <span style={{ color: 'var(--color-neon-pink)' }}>{riskWord} </span>
        <span style={{ color: 'var(--color-neon-green)' }}>{runWord}</span>
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="relative mt-5 max-w-md text-center text-base text-[color:var(--color-text-muted)] sm:text-lg"
      >
        {hero.hook}
      </motion.p>

      <motion.ul
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="relative mt-7 flex flex-wrap items-center justify-center gap-2"
      >
        {hero.specs.map((spec) => (
          <li
            key={spec}
            className="rounded-full border px-3.5 py-1.5 font-body text-xs font-medium text-[color:var(--color-text-muted)]"
            style={{ borderColor: 'var(--color-surface-border)' }}
          >
            {spec}
          </li>
        ))}
      </motion.ul>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-10 w-full max-w-2xl"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ProductImage image={hero.image} className="w-full" rounded="rounded-3xl" />
        </motion.div>
      </motion.div>

      <motion.a
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        href={hero.ctaTarget}
        className="relative mt-10 inline-flex items-center gap-2 font-body text-sm font-semibold text-[color:var(--color-text-primary)] transition-opacity hover:opacity-70"
      >
        {hero.ctaLabel}
        <motion.span
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          ↓
        </motion.span>
      </motion.a>
    </section>
  );
}
