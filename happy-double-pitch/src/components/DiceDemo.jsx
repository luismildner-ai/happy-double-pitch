import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { content, theme } from '../content.js';
import OwlCharacter from './OwlCharacter.jsx';

const PINK = theme.colors.neonPink;
const GREEN = theme.colors.neonGreen;
const roll12 = () => Math.floor(Math.random() * 12) + 1;

/*
 * Interactive push-your-luck demo. Two D12 dice the visitor rolls; the higher
 * result is highlighted (the keep-the-higher rule). ~1 in 6 rolls comes up a
 * duplicate, which triggers the "owl strikes — round wiped" beat. Two mascot
 * owls flank the dice and react to each outcome (watch → cheer / shock).
 */
function Die({ value, isHigher, wiped, rolling }) {
  return (
    <motion.div
      animate={
        rolling
          ? { rotate: [0, -8, 8, -6, 0], y: [0, -6, 0] }
          : wiped
            ? { x: [0, -5, 5, -4, 4, 0] }
            : { rotate: 0, y: 0 }
      }
      transition={rolling ? { duration: 0.4, repeat: Infinity } : { duration: 0.4 }}
      className="relative flex h-20 w-20 items-center justify-center rounded-2xl sm:h-24 sm:w-24"
      style={{
        background: '#0c0c0c',
        border: `2px solid ${wiped ? PINK : isHigher ? GREEN : 'rgba(255,255,255,0.14)'}`,
        boxShadow:
          !rolling && isHigher && !wiped
            ? `0 0 28px -4px ${GREEN}`
            : wiped
              ? `0 0 28px -4px ${PINK}`
              : 'none',
        transition: 'box-shadow 0.3s, border-color 0.3s',
      }}
    >
      <span
        className="font-display text-4xl font-extrabold tabular-nums"
        style={{ color: wiped ? PINK : isHigher ? GREEN : '#f5f5f5' }}
      >
        {value}
      </span>
      {!rolling && isHigher && !wiped && (
        <span
          className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 font-body text-[9px] font-bold uppercase tracking-wider"
          style={{ background: GREEN, color: '#0a0a0a' }}
        >
          {content.howItPlays.diceDemo.keepLabel}
        </span>
      )}
    </motion.div>
  );
}

export default function DiceDemo() {
  const { diceDemo } = content.howItPlays;
  const reduce = useReducedMotion();
  const [dice, setDice] = useState([7, 4]);
  const [phase, setPhase] = useState('idle'); // idle | rolling | kept | wiped
  // Owl reaction is its own state: react to the outcome, then return to idle
  // after a beat (a permanent cheer/shock pose reads as broken).
  const [owlMood, setOwlMood] = useState('idle');
  const intervalRef = useRef(null);
  const moodTimerRef = useRef(null);

  useEffect(
    () => () => {
      clearInterval(intervalRef.current);
      clearTimeout(moodTimerRef.current);
    },
    []
  );

  const roll = useCallback(() => {
    if (phase === 'rolling') return;
    setPhase('rolling');
    clearTimeout(moodTimerRef.current);
    setOwlMood('watching');

    // Spin the visible numbers for a beat, then settle.
    const spin = () => setDice([roll12(), roll12()]);
    if (!reduce) {
      intervalRef.current = setInterval(spin, 70);
    }

    const settle = () => {
      clearInterval(intervalRef.current);
      // Bias ~1 in 6 toward a duplicate so the owl-strike shows up naturally.
      let a = roll12();
      let b = roll12();
      if (Math.random() < 0.17) b = a; // forced duplicate
      setDice([a, b]);
      setPhase(a === b ? 'wiped' : 'kept');
      // One-shot owl reaction, then back to idle.
      setOwlMood(a === b ? 'shock' : 'cheer');
      moodTimerRef.current = setTimeout(() => setOwlMood('idle'), 2400);
    };

    setTimeout(settle, reduce ? 0 : 750);
  }, [phase, reduce]);

  const [a, b] = dice;
  const higherIdx = phase === 'kept' ? (a >= b ? 0 : 1) : -1;
  const rolling = phase === 'rolling';
  const wiped = phase === 'wiped';

  return (
    <div
      className="relative rounded-3xl border p-6 sm:p-10"
      style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-surface)' }}
    >
      <div className="mb-6 text-center">
        <h3 className="font-display text-xl font-bold text-[color:var(--color-text-primary)]">{diceDemo.title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[color:var(--color-text-muted)]">{diceDemo.body}</p>
      </div>

      {/* Owls + dice stage */}
      <div className="flex items-center justify-center gap-2 sm:gap-6">
        <div className="w-16 shrink-0 sm:w-24">
          <OwlCharacter mood={owlMood} />
        </div>

        <div className="relative flex items-center gap-3 sm:gap-5">
          <Die value={a} isHigher={higherIdx === 0} wiped={wiped} rolling={rolling} />
          <Die value={b} isHigher={higherIdx === 1} wiped={wiped} rolling={rolling} />

          {/* Wipeout overlay */}
          <AnimatePresence>
            {wiped && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl px-4 py-2 text-center"
                style={{ background: PINK, color: '#0a0a0a' }}
              >
                <p className="font-display text-sm font-extrabold uppercase tracking-wide">{diceDemo.wipeoutTitle}</p>
                <p className="font-body text-xs font-medium">{diceDemo.wipeoutBody}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-16 shrink-0 sm:w-24">
          <OwlCharacter mood={owlMood} flip />
        </div>
      </div>

      {/* Roll control */}
      <div className="mt-14 flex justify-center">
        <button
          type="button"
          onClick={roll}
          disabled={rolling}
          className="rounded-full px-7 py-3 font-body text-sm font-bold uppercase tracking-[0.1em] transition-transform duration-150 active:scale-[0.97] disabled:opacity-60"
          style={{ background: GREEN, color: '#0a0a0a' }}
        >
          {rolling ? diceDemo.rollingLabel : diceDemo.rollLabel}
        </button>
      </div>
    </div>
  );
}
