import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '../content.js';
import Reveal from '../components/Reveal.jsx';
import { Die } from '../components/DiceDemo.jsx';
import { useDiceRoller } from '../lib/useDiceRoller.js';
import { ACTION_CARDS, applyCard, bankTurn, initialState, resolveRoll } from '../lib/happyDoubleRules.js';

const PINK = theme.colors.neonPink;
const GREEN = theme.colors.neonGreen;
const NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);
const accentOf = (card) => (card.color === 'green' ? GREEN : PINK);

/*
 * Playable push-your-luck loop, driven by the same D12 roller as the demo in
 * "How It Plays" (useDiceRoller) rather than by the WebGL box — those dice are
 * scroll-driven physics bodies that never report a face value, so they cannot
 * feed a game.
 *
 * All turn rules live in ../lib/happyDoubleRules.js as pure functions; this
 * component is presentation plus the card-draw randomness.
 */

/* One cell of the top line. Styled as printed scorepad stock — warm paper and
 * dark ink — so it reads as the physical sheet against the dark page. */
function ScoreCell({ n, marked, banked }) {
  const active = marked || banked;
  return (
    <motion.div
      animate={marked ? { scale: [1, 1.14, 1] } : { scale: 1 }}
      transition={{ duration: 0.32 }}
      className="relative flex aspect-square items-center justify-center rounded-md"
      style={{
        background: active ? GREEN : '#F2EEE4',
        border: `1.5px solid ${active ? GREEN : 'rgba(10,10,10,0.22)'}`,
        opacity: banked && !marked ? 0.5 : 1,
        boxShadow: marked ? `0 0 18px -4px ${GREEN}` : 'inset 0 -2px 0 rgba(10,10,10,0.07)',
        transition: 'background 0.25s, border-color 0.25s, opacity 0.25s',
      }}
    >
      <span className="font-display text-sm font-extrabold tabular-nums sm:text-base" style={{ color: '#0a0a0a' }}>
        {n}
      </span>
    </motion.div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
        {label}
      </span>
      <span className="font-display text-2xl font-extrabold tabular-nums" style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}

export default function PlayTheDemo() {
  const [game, setGame] = useState(initialState);
  const [pendingCard, setPendingCard] = useState(null); // must resolve before rolling again
  const [slotCard, setSlotCard] = useState(null); // last card drawn, stays in the slot
  const [notice, setNotice] = useState(null);
  const [bust, setBust] = useState(false);
  const noticeTimer = useRef(null);
  const drawSeq = useRef(0);
  const resolvedRef = useRef(0);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const flash = useCallback((next) => {
    setNotice(next);
    clearTimeout(noticeTimer.current);
    if (next) noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const handleComplete = useCallback(
    (a, b) => {
      setBust(false);
      const { state: next, event } = resolveRoll(game, a, b);

      // A pair pauses scoring entirely and draws an Action Card.
      if (event.type === 'pasch') {
        const base = ACTION_CARDS[Math.floor(Math.random() * ACTION_CARDS.length)];
        setPendingCard({ ...base, drawId: ++drawSeq.current });
        setSlotCard({ ...base, drawId: drawSeq.current });
        flash(null);
        return;
      }

      setGame(next);
      if (event.type === 'bust') {
        setBust(true);
        flash({ accent: PINK, title: 'Bust!', body: `${event.value} was already rolled this turn. Temporary score wiped.` });
      } else if (event.type === 'shield') {
        flash({ accent: GREEN, title: 'Gold Shield spent', body: `${event.value} again — the shield ate the bust. Turn continues.` });
      } else {
        flash(null);
      }
    },
    [game, flash]
  );

  // A pair is 1/12 at true odds — too rare to discover in a few clicks, so the
  // Action Card mechanic is biased up for the demo.
  const { dice, rolling, roll } = useDiceRoller({ duplicateBias: 0.15, onRollComplete: handleComplete });

  const resolveCard = useCallback(() => {
    if (!pendingCard) return;
    // The modal lingers in the DOM through its exit animation, and that copy holds
    // a closure over the card it was drawn with — clicking it again would re-apply
    // the effect (a "Double or Nothing" chain compounding to nonsense). The ref is
    // shared across every render, so gating on drawId applies each draw exactly once.
    if (resolvedRef.current === pendingCard.drawId) return;
    resolvedRef.current = pendingCard.drawId;

    setGame((g) => applyCard(g, pendingCard.id));
    flash({ accent: accentOf(pendingCard), title: pendingCard.title, body: pendingCard.resolved });
    setPendingCard(null);
  }, [pendingCard, flash]);

  const bank = useCallback(() => {
    if (rolling || pendingCard || game.turnScore === 0) return;
    const amount = game.turnScore;
    setGame((g) => bankTurn(g));
    setBust(false);
    flash({ accent: GREEN, title: 'Banked', body: `+${amount} locked in. New turn — every number is open again.` });
  }, [game.turnScore, rolling, pendingCard, flash]);

  const reset = useCallback(() => {
    setGame(initialState());
    setPendingCard(null);
    setSlotCard(null);
    setBust(false);
    flash(null);
  }, [flash]);

  const [a, b] = dice;
  const settled = !rolling && !pendingCard;
  const higherIdx = settled && a !== b ? (a >= b ? 0 : 1) : -1;
  const locked = rolling || !!pendingCard;

  return (
    <section id="play-the-demo" className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
      <Reveal className="text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: PINK }}>
          Play it now
        </p>
        <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-[color:var(--color-text-primary)] sm:text-5xl">
          One turn. Push or bank.
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-body text-sm leading-relaxed text-[color:var(--color-text-muted)]">
          Roll two D12 and mark the higher number. Roll a number you already have this turn and you bust — unless you
          bank first. Roll a pair and the Action Cards come out.
        </p>
      </Reveal>

      <Reveal className="mt-12">
        <div
          className="rounded-3xl border p-6 sm:p-10"
          style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-surface)' }}
        >
          {/* ---- Dice ---- */}
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <Die value={a} isHigher={higherIdx === 0} wiped={bust} rolling={rolling} />
            <Die value={b} isHigher={higherIdx === 1} wiped={bust} rolling={rolling} />
          </div>

          {/* ---- Controls ---- */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={roll}
              disabled={locked}
              className="rounded-full px-7 py-3 font-body text-sm font-bold uppercase tracking-[0.1em] transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: GREEN, color: '#0a0a0a' }}
            >
              {rolling ? 'Rolling…' : pendingCard ? 'Resolve the card' : 'Roll'}
            </button>
            <button
              type="button"
              onClick={bank}
              disabled={locked || game.turnScore === 0}
              className="rounded-full border px-7 py-3 font-body text-sm font-bold uppercase tracking-[0.1em] transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderColor: PINK, color: PINK }}
            >
              Bank {game.turnScore > 0 ? game.turnScore : ''}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full px-4 py-3 font-body text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--color-text-muted)] transition-colors hover:text-[color:var(--color-text-primary)]"
            >
              Reset
            </button>
          </div>

          {/* ---- Scorecard: the top line, 1–12 ---- */}
          <div className="mt-10">
            <div
              className="rounded-2xl p-4 sm:p-5"
              style={{ background: '#FBF8F1', boxShadow: '0 18px 40px -18px rgba(0,0,0,0.8)' }}
            >
              <div className="mb-3 flex items-baseline justify-between">
                <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: '#0a0a0a' }}>
                  Top line
                </span>
                <span className="font-body text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(10,10,10,0.45)' }}>
                  Happy Double · Scorepad
                </span>
              </div>
              <div className="grid grid-cols-12 gap-1 sm:gap-2">
                {NUMBERS.map((n) => (
                  <ScoreCell key={n} n={n} marked={game.turnMarks.includes(n)} banked={game.bankedMarks.includes(n)} />
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-body text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GREEN }} /> This turn
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GREEN, opacity: 0.5 }} /> Banked
              </span>
            </div>
          </div>

          {/* ---- Score + action card slot ---- */}
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto]">
            <div
              className="flex flex-col justify-between gap-6 rounded-2xl border p-5"
              style={{ borderColor: 'var(--color-surface-border)', background: 'var(--color-background-elevated)' }}
            >
              <div className="flex gap-8">
                <Stat label="This turn" value={game.turnScore} accent={PINK} />
                <Stat label="Banked" value={game.banked} accent={GREEN} />
              </div>

              <div className="min-h-[3.5rem]" aria-live="polite">
                <AnimatePresence mode="wait">
                  {notice ? (
                    <motion.div key={notice.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <p className="font-display text-sm font-extrabold uppercase tracking-wide" style={{ color: notice.accent }}>
                        {notice.title}
                      </p>
                      <p className="mt-1 font-body text-xs leading-relaxed text-[color:var(--color-text-muted)]">{notice.body}</p>
                    </motion.div>
                  ) : game.shield ? (
                    <motion.p
                      key="shield"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="font-body text-xs font-semibold uppercase tracking-[0.14em]"
                      style={{ color: GREEN }}
                    >
                      🛡 Gold Shield active — one bust blocked
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* Action card slot — empty placeholder until a Pasch fills it */}
            <div className="mx-auto w-full max-w-[190px] [perspective:1200px] sm:w-[190px]">
              <AnimatePresence mode="wait">
                {slotCard ? (
                  <motion.div
                    key={slotCard.drawId}
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="flex h-full min-h-[190px] flex-col items-center justify-center gap-3 rounded-2xl border p-5 text-center [backface-visibility:hidden]"
                    style={{
                      borderColor: accentOf(slotCard),
                      background: 'var(--color-background-elevated)',
                      boxShadow: `0 0 30px -12px ${accentOf(slotCard)}`,
                    }}
                  >
                    <span
                      className="rounded-full px-3 py-1 font-body text-[9px] font-bold uppercase tracking-[0.15em]"
                      style={{ background: accentOf(slotCard), color: '#0a0a0a' }}
                    >
                      {slotCard.tag}
                    </span>
                    <span className="font-display text-lg font-bold text-[color:var(--color-text-primary)]">{slotCard.title}</span>
                    <span className="font-body text-[11px] leading-relaxed text-[color:var(--color-text-muted)]">{slotCard.effect}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full min-h-[190px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-5 text-center"
                    style={{ borderColor: 'var(--color-surface-border)' }}
                  >
                    <span className="font-display text-3xl" style={{ color: 'var(--color-surface-border)' }}>
                      ⚄⚄
                    </span>
                    <span className="font-body text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-text-muted)]">
                      Roll a pair to draw
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ---- Action card modal: must be resolved before the next roll ---- */}
      <AnimatePresence>
        {pendingCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // Dropped on exit so the fading overlay cannot swallow clicks meant for
            // the board underneath while it animates out.
            exit={{ opacity: 0, pointerEvents: 'none' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
            role="dialog"
            aria-modal="true"
            aria-label={`Action Card: ${pendingCard.title}`}
          >
            <motion.div
              initial={{ scale: 0.9, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm rounded-3xl border p-8 text-center"
              style={{
                borderColor: accentOf(pendingCard),
                background: 'var(--color-background-elevated)',
                boxShadow: `0 0 60px -20px ${accentOf(pendingCard)}`,
              }}
            >
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accentOf(pendingCard) }}>
                Pasch! Action Card
              </p>
              <h3 className="font-display mt-3 text-3xl font-extrabold text-[color:var(--color-text-primary)]">{pendingCard.title}</h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-[color:var(--color-text-muted)]">{pendingCard.effect}</p>
              <button
                type="button"
                onClick={resolveCard}
                autoFocus
                className="mt-7 w-full rounded-full px-6 py-3 font-body text-sm font-bold uppercase tracking-[0.1em] transition-transform duration-150 active:scale-[0.97]"
                style={{ background: accentOf(pendingCard), color: '#0a0a0a' }}
              >
                Resolve
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
