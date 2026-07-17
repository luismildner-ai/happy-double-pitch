import { motion } from 'framer-motion';
import { content, theme } from '../content.js';

const PINK = theme.colors.neonPink;
const GREEN = theme.colors.neonGreen;

/* A single D12 face. Shared with the playable board beneath the 3D box, which
 * reuses `wiped` for its bust shake. */
export function Die({ value, isHigher, wiped, rolling }) {
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
