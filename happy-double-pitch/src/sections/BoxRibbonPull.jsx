import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';

/*
 * Physical-packaging "pull the ribbon" interaction, rebuilt as a CSS-3D /
 * Framer-Motion component (no WebGL). It mirrors the real Happy Double insert:
 *
 *   ┌───────────────────────────────┐  black tray (fixed)
 *   │  ░░░ rear panel (elevated) ░░░ │  further from viewer, static, +STEP up
 *   │───── crease / hinge line ──────│  ← front panel rotates about THIS edge
 *   │  ▓▓▓ front panel (AUGEN AUF) ▓▓ │  closest to viewer, flush on the floor
 *   │            │ribbon│            │  green satin strip, child of the front group
 *   └───────────────────────────────┘
 *
 * Only the FRONT panel moves. Drag the ribbon toward you (down): past the
 * threshold it springs fully open (rotateX ≈ -165°, folding back against the
 * rear step); short of it, it springs closed. Click / Enter toggles as a
 * fallback. The dice sit in cavities in the tray floor under the front panel
 * and are simply uncovered as it lifts.
 */

// ---- geometry (px, in the deck's own coordinate space) -------------------
const DECK_W = 300;
const DECK_H = 402;
const WALL = 26; // black tray wall thickness around the deck
const STEP = 8; // how far the rear panel is raised above the front panel
const REAR_H = DECK_H * 0.46; // rear (elevated) panel height
const FRONT_H = DECK_H - REAR_H; // front (moving) panel height — hinges at their shared edge

const OPEN_DEG = -165; // resting open angle (hinge stop — not a full 180)
const DRAG_RANGE = 130; // px of pull that maps to a full open
const THRESHOLD = 40; // px past which we commit to open/close

const PINK = '#EC0A8C';
const PINK_DARK = '#B00668';
const GREEN = '#A6E22E';

// Scattered-feather texture (dark feathers on hot pink), as an inline SVG tile.
const FEATHER = (() => {
  const feather = (x, y, r, o) =>
    `<g transform="translate(${x} ${y}) rotate(${r})" opacity="${o}">` +
    `<path d="M0 0 C 4 -9 4 -20 0 -30 C -4 -20 -4 -9 0 0 Z" fill="#3a0020"/>` +
    `<line x1="0" y1="-2" x2="0" y2="-27" stroke="#5c0033" stroke-width="0.8"/></g>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">` +
    feather(22, 40, -25, 0.5) +
    feather(78, 26, 40, 0.4) +
    feather(96, 92, -12, 0.55) +
    feather(48, 104, 18, 0.35) +
    feather(14, 96, 62, 0.3) +
    feather(64, 66, -48, 0.28) +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

const featherPanel = {
  backgroundColor: PINK,
  backgroundImage: FEATHER,
  backgroundSize: '120px 120px',
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function Die({ pips }) {
  // classic 3x3 pip grid — index positions we light up for the given face
  const map = {
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const on = new Set(map[pips] || map[5]);
  return (
    <div
      style={{
        width: 54,
        height: 54,
        borderRadius: 12,
        background: 'linear-gradient(150deg, #ffffff 0%, #e9e9ef 100%)',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.9), 0 3px 6px rgba(0,0,0,0.5)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        padding: 8,
        gap: 3,
      }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          style={{
            borderRadius: '50%',
            background: on.has(i) ? '#141414' : 'transparent',
            alignSelf: 'center',
            justifySelf: 'center',
            width: 8,
            height: 8,
          }}
        />
      ))}
    </div>
  );
}

export default function BoxRibbonPull() {
  const reduce = useReducedMotion();
  const openness = useMotionValue(0); // 0 = closed, 1 = fully open
  const rotateX = useTransform(openness, (v) => OPEN_DEG * v);
  // lift + shade the ribbon slightly as it opens so the pull reads as physical
  const ribbonShadow = useTransform(openness, (v) => `0 4px 10px rgba(0,0,0,${0.25 + v * 0.25})`);

  const [isOpen, setIsOpen] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const movedRef = useRef(false);

  const commit = (target) => {
    setIsOpen(target === 1);
    animate(openness, target, reduce ? { duration: 0 } : { type: 'spring', stiffness: 210, damping: 24 });
  };

  const onPanStart = () => {
    movedRef.current = false;
    setGrabbing(true);
  };
  const onPan = (_e, info) => {
    if (Math.abs(info.offset.y) > 4) movedRef.current = true;
    const base = isOpen ? 1 : 0;
    openness.set(clamp(base + info.offset.y / DRAG_RANGE, 0, 1));
  };
  const onPanEnd = (_e, info) => {
    setGrabbing(false);
    if (!movedRef.current) return; // a tap — let onClick handle it
    if (!isOpen) commit(info.offset.y > THRESHOLD ? 1 : 0);
    else commit(info.offset.y < -THRESHOLD ? 0 : 1);
  };
  const onClick = () => {
    if (movedRef.current) return; // ignore the click that trails a drag
    commit(isOpen ? 0 : 1);
  };
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(isOpen ? 0 : 1);
    }
  };

  return (
    <section
      id="box-ribbon"
      className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 sm:py-32"
    >
      <p
        className="font-body text-xs font-semibold uppercase tracking-[0.22em]"
        style={{ color: GREEN }}
      >
        Open the box
      </p>
      <h2 className="font-display mt-3 text-center text-4xl font-extrabold tracking-tight text-[color:var(--color-text-primary)] sm:text-5xl">
        Pull the ribbon
      </h2>
      <p className="mt-4 max-w-md text-center font-body text-base leading-relaxed text-[color:var(--color-text-muted)]">
        Drag the green ribbon toward you to flip the lid open — or just tap it.
      </p>

      <div className="mt-12">
        {/* ---- BLACK TRAY (fixed) ---- */}
        <div
          style={{
            width: DECK_W + WALL * 2,
            height: DECK_H + WALL * 2,
            padding: WALL,
            borderRadius: 22,
            background: 'linear-gradient(160deg, #201f22 0%, #0d0d0f 100%)',
            boxShadow:
              '0 30px 60px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* ---- recessed deck floor. Perspective lives HERE (the rotating group's
               direct parent) so the hinge foreshortens as a real 3D fold instead of a
               flat vertical squash. ---- */}
          <div
            style={{
              position: 'relative',
              width: DECK_W,
              height: DECK_H,
              borderRadius: 8,
              background: 'linear-gradient(160deg, #161518 0%, #050506 100%)',
              boxShadow: 'inset 0 6px 16px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              perspective: 1000,
              perspectiveOrigin: 'center 40%',
            }}
          >
            {/* ---- dice cavities in the tray floor (under the front panel) ---- */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: REAR_H + FRONT_H * 0.28,
                display: 'flex',
                justifyContent: 'center',
                gap: 34,
              }}
            >
              {[5, 5].map((p, i) => (
                <div
                  key={i}
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 50% 38%, #1c1b1e 0%, #050505 75%)',
                    boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.85)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Die pips={p} />
                </div>
              ))}
            </div>

            {/* ---- REAR PANEL (elevated, static) ---- */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: DECK_W,
                height: REAR_H,
                ...featherPanel,
                // raise it toward the viewer: a real Y-lift plus a drop shadow
                transform: `translateY(${-STEP}px)`,
                boxShadow: `0 ${STEP + 2}px ${STEP}px rgba(0,0,0,0.55)`,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
              }}
            >
              {/* the visible vertical step face at the rear panel's front edge */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -STEP,
                  height: STEP,
                  background: `linear-gradient(${PINK_DARK}, #6d033f)`,
                }}
              />
            </div>

            {/* ---- FRONT PANEL GROUP (the only moving part) ---- */}
            <motion.div
              style={{
                position: 'absolute',
                top: REAR_H,
                left: 0,
                width: DECK_W,
                height: FRONT_H,
                transformOrigin: 'top center',
                transformStyle: 'preserve-3d',
                rotateX,
              }}
            >
              {/* front face — feather art + AUGEN AUF! label */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  ...featherPanel,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 6,
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.28)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    color: PINK,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    fontSize: 18,
                    padding: '6px 18px',
                    borderRadius: 999,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    fontFamily: 'var(--font-display, sans-serif)',
                  }}
                >
                  AUGEN AUF!
                </div>
              </div>

              {/* back face (underside of the flap) — plain cardboard */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: 'rotateX(180deg)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  background: `linear-gradient(${PINK_DARK}, #7d0447)`,
                  borderRadius: 6,
                  boxShadow: 'inset 0 0 24px rgba(0,0,0,0.35)',
                }}
              />

              {/* ---- GREEN RIBBON — child of the rotating group, the drag handle.
                   Anchored at the crease (top of the front panel), lying flat over
                   the panel toward the viewer. Moves in perfect sync with the flap. */}
              <motion.div
                role="button"
                tabIndex={0}
                aria-label={isOpen ? 'Close the box' : 'Open the box'}
                aria-pressed={isOpen}
                onPanStart={onPanStart}
                onPan={onPan}
                onPanEnd={onPanEnd}
                onClick={onClick}
                onKeyDown={onKeyDown}
                style={{
                  position: 'absolute',
                  top: -4,
                  left: '50%',
                  x: '-50%',
                  width: 30,
                  height: FRONT_H * 0.5,
                  borderRadius: '4px 4px 6px 6px',
                  background: `linear-gradient(90deg, #7cb814 0%, ${GREEN} 45%, #d6f77a 55%, ${GREEN} 70%, #6da310 100%)`,
                  boxShadow: ribbonShadow,
                  cursor: grabbing ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  outlineOffset: 3,
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
