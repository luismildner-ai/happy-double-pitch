import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const roll12 = () => Math.floor(Math.random() * 12) + 1;

/*
 * The two-D12 roll itself, kept apart from any one presentation so several
 * surfaces can share it — the demo in "How It Plays" and the playable board
 * beneath the 3D box read the same roll but interpret it differently (the demo
 * treats a pair as a wiped round; the real rules treat it as an Action Card).
 *
 * duplicateBias forces a pair on that fraction of rolls. True odds for a pair on
 * 2d12 are 1/12 — too rare for a visitor to stumble across in a handful of
 * clicks, so the bias exists purely so the mechanic shows itself in a demo.
 */
export function useDiceRoller({ duplicateBias = 0, onRollComplete } = {}) {
  const reduce = useReducedMotion();
  const [dice, setDice] = useState([7, 4]);
  const [rolling, setRolling] = useState(false);
  const rollingRef = useRef(false);
  const intervalRef = useRef(null);
  const settleRef = useRef(null);
  // Held in a ref so a settling roll always calls the newest handler rather than
  // one closed over stale game state.
  const cbRef = useRef(onRollComplete);
  cbRef.current = onRollComplete;

  useEffect(
    () => () => {
      clearInterval(intervalRef.current);
      clearTimeout(settleRef.current);
    },
    []
  );

  const roll = useCallback(() => {
    if (rollingRef.current) return;
    rollingRef.current = true;
    setRolling(true);

    // Spin the visible numbers for a beat, then settle.
    if (!reduce) {
      intervalRef.current = setInterval(() => setDice([roll12(), roll12()]), 70);
    }

    settleRef.current = setTimeout(
      () => {
        clearInterval(intervalRef.current);
        const a = roll12();
        let b = roll12();
        if (duplicateBias > 0 && Math.random() < duplicateBias) b = a;
        setDice([a, b]);
        rollingRef.current = false;
        setRolling(false);
        cbRef.current?.(a, b);
      },
      reduce ? 0 : 750
    );
  }, [reduce, duplicateBias]);

  return { dice, rolling, roll };
}
