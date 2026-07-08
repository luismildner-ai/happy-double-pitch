import { motion } from 'framer-motion';
import { theme } from '../content.js';

/*
 * On-brand mascot owl (inline SVG) for the dice demo. Mood drives brows, eyes,
 * and body pose.
 *
 * Animation notes (bug history — keep it this way):
 *  - Brows/eyes animate SVG ATTRIBUTES (path `d` morphs, ellipse `ry`), never
 *    scale/rotate with CSS transform-origin — SVG transform-origin handling is
 *    unreliable and squashed the eyes toward the corner.
 *  - The mirror flip lives on a plain OUTER div. Framer overwrites `transform`
 *    on the element it animates, so putting scaleX(-1) on the animated element
 *    made the right owl un-mirror mid-reaction.
 *  - Cheer/shock are one-shot keyframe reactions (no infinite loops).
 *
 * REPLACE: to use DenkRiesen's real mascot art, swap the SVG for transparent
 * cutouts and keep the same `mood` prop wiring on the wrapper.
 */

const PINK = theme.colors.neonPink;
const GREEN = theme.colors.neonGreen;

// Body pose per mood — one-shot keyframes for reactions, springs for poses.
const bodyVariants = {
  idle: { y: 0, rotate: 0, transition: { type: 'spring', stiffness: 160, damping: 18 } },
  watching: { y: -5, rotate: 0, transition: { type: 'spring', stiffness: 220, damping: 16 } },
  cheer: {
    y: [0, -20, 0, -12, 0],
    rotate: [0, -4, 0, 3, 0],
    transition: { duration: 0.9, ease: 'easeOut' },
  },
  shock: {
    y: [0, 5, 3],
    rotate: [0, -5, 4, -3, 0],
    transition: { duration: 0.55, ease: 'easeOut' },
  },
};

// Brow curves per mood (same Q structure → framer morphs the path smoothly).
const brows = {
  idle: { l: 'M52 60 Q70 46 90 58', r: 'M110 58 Q130 46 148 60' },
  watching: { l: 'M52 57 Q70 44 90 56', r: 'M110 56 Q130 44 148 57' },
  cheer: { l: 'M52 55 Q70 40 90 53', r: 'M110 53 Q130 40 148 55' },
  shock: { l: 'M50 50 Q70 34 90 49', r: 'M110 49 Q130 34 150 50' },
};

// Eye openness per mood: ry of the eye/pupil ellipses (rx stays fixed).
const eyes = {
  idle: { eyeRy: 20, pupilRy: 10, hi: 1 },
  watching: { eyeRy: 21, pupilRy: 11, hi: 1 },
  cheer: { eyeRy: 7, pupilRy: 4, hi: 0 }, // happy squint
  shock: { eyeRy: 25, pupilRy: 7, hi: 1 }, // wide, small pupils
};

const eyeSpring = { type: 'spring', stiffness: 260, damping: 18 };

export default function OwlCharacter({ mood = 'idle', flip = false, className = '' }) {
  const e = eyes[mood];
  return (
    // Plain outer div owns the mirror flip; framer never touches its transform.
    <div className={className} style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
      <motion.div variants={bodyVariants} animate={mood} initial="idle">
        <svg viewBox="0 0 200 220" width="100%" height="100%" role="img" aria-label="Happy Double owl mascot">
          {/* Body */}
          <ellipse cx="100" cy="140" rx="62" ry="66" fill="#141414" stroke={PINK} strokeWidth="3" />
          <path d="M62 120 Q100 96 138 120 L138 150 Q100 128 62 150 Z" fill={PINK} opacity="0.9" />
          {/* Belly zipper */}
          <line x1="100" y1="120" x2="100" y2="176" stroke={GREEN} strokeWidth="2.5" strokeDasharray="4 4" />
          {/* Ear tufts */}
          <path d="M58 70 Q52 40 74 44 Q70 66 84 78 Z" fill={PINK} />
          <path d="M142 70 Q148 40 126 44 Q130 66 116 78 Z" fill={PINK} />
          {/* Head */}
          <circle cx="100" cy="82" r="56" fill="#141414" stroke={PINK} strokeWidth="3" />
          {/* Brows — path morph, no transforms */}
          <motion.path
            animate={{ d: brows[mood].l }}
            transition={eyeSpring}
            stroke={PINK}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <motion.path
            animate={{ d: brows[mood].r }}
            transition={eyeSpring}
            stroke={PINK}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          {/* Eyes — ry attribute animation, blinks in place */}
          <motion.ellipse cx="76" cy="86" rx="20" animate={{ ry: e.eyeRy }} transition={eyeSpring} fill={GREEN} />
          <motion.ellipse cx="124" cy="86" rx="20" animate={{ ry: e.eyeRy }} transition={eyeSpring} fill={GREEN} />
          <motion.ellipse cx="76" cy="86" rx="10" animate={{ ry: e.pupilRy }} transition={eyeSpring} fill="#0a0a0a" />
          <motion.ellipse cx="124" cy="86" rx="10" animate={{ ry: e.pupilRy }} transition={eyeSpring} fill="#0a0a0a" />
          <motion.circle cx="80" cy="82" r="3.5" animate={{ opacity: e.hi }} transition={{ duration: 0.2 }} fill="#fff" />
          <motion.circle cx="128" cy="82" r="3.5" animate={{ opacity: e.hi }} transition={{ duration: 0.2 }} fill="#fff" />
          {/* Beak */}
          <path d="M100 96 l-9 12 h18 Z" fill="#F5A623" />
        </svg>
      </motion.div>
    </div>
  );
}
