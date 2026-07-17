import { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import {
  TextureLoader,
  SRGBColorSpace,
  MathUtils,
  Vector3,
  Quaternion,
  Euler,
  Matrix4,
  Shape,
  ShapeGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  DodecahedronGeometry,
  CanvasTexture,
} from 'three';
import { useScroll, useMotionValueEvent, motion, AnimatePresence } from 'framer-motion';
import { theme } from '../content.js';

/*
 * SCROLL-DRIVEN 3D — "THE BOX OPENS" (staged opening sequence + real physics)
 * -------------------------------------------------------------------------
 * The box lies FLAT on the XZ plane (opening up, +Y) so gravity pulls the dice
 * naturally into the tray. Camera looks down at an angle, as if on a table.
 *
 * Four stages, scrubbed by scroll progress p (0 → 1):
 *   1. LID     (p 0.00–0.42)  Lid lifts straight up, glides RIGHT, and flips
 *                             180° so its interior faces the camera.
 *   2. CONTENTS(p 0.15–0.50)  Card deck + scorepad block lift out of the (now
 *                             stationary) tray and glide LEFT, stacking.
 *   3. FLAP    (p 0.45–0.60)  The inner "OPEN EYES!" flap pivots open, revealing
 *                             the two D12 dice in their eye compartments.
 *   4. ROLL    (p ≥ 0.62)     The dice release from the eye sockets; at that
 *                             instant they hand off to the Rapier physics engine
 *                             and fall into the felt DICE-ZONE, bouncing off the
 *                             tray walls and settling naturally.
 *
 * Physics note: while p < RELEASE the dice are KINEMATIC bodies driven to the
 * lid's eye-cups every frame; crossing RELEASE flips them to DYNAMIC with a
 * launch velocity. Scrolling back re-arms them. The tray is a stationary set of
 * fixed colliders matching the visible walls/floor.
 *
 * Almost everything is a tunable constant below — I could not watch this render,
 * so timings/positions are meant to be nudged by eye.
 */

const FRONT_TEXTURE = '/images/box-front-flat.png';
const CARD_TEXTURE = '/images/card-back.png';
const PAD_TEXTURE = '/images/scorepad.png';
const PINK = theme.colors.neonPink;
const GREEN = theme.colors.neonGreen;
const INSERT_PINK = '#d81b7f';
const FELT_GREEN = '#8ec21a';
// Heavy compact grotesk stack; Arial Black / Impact are the condensed, weighty
// faces closest to the box's lettering and are present on essentially every host.
// Using the real Black face (not a synthesized weight:900 on regular Arial)
// matters here — faux-bold synthesis skews diagonal strokes (the "Y" arms come
// out visibly unbalanced) once a stroke outline is layered on top.
const HEAVY = '"Arial Black", "Helvetica Neue", Impact, Arial, sans-serif';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- layout --- */
// Flat box. Footprint W(x) × H(z); walls rise +Y. Felt floor top at y = 0.
const W = 2.6;
const H = 3.6;
const WALL = 0.07;
const WALL_H = 0.32; // inner wall height — SQUASHED: the real box is a flat, slim deck-box
const FLOOR_T = 0.06; // floor slab thickness

// ---- Hollow lid cavity (real depth; not a solid block) --------------------
const LID_DEPTH = 0.42; // interior cavity depth (holds the insert + dice bay)
const LID_WALL = 0.06; // rim wall thickness
const LID_TOP = 0.05; // top plate thickness (owl art)
// TELESCOPING SLEEVE: the black lid is not a cap that rests on the tray rim — it
// slides all the way DOWN OVER the pink tray. Its rim walls continue below the
// cavity opening as a skirt that sheathes the tray's outer walls, leaving only a
// PINK_SLIVER of pink showing at the very bottom.
const LID_CLEAR = 0.05; // slip fit between the lid's inner face and the tray's outer face
const PINK_SLIVER = 0.04; // how much pink tray stays visible below the skirt when closed
const SKIRT_H = WALL_H - PINK_SLIVER; // skirt drop below the cavity opening
// Local y within the lid group (opening faces -Y when closed):
const CAV_CEIL = LID_DEPTH / 2; // interior ceiling
const CAV_OPEN = -LID_DEPTH / 2; // opening rim
const TRAY_FLOOR_Y = CAV_CEIL - 0.05; // black inner-tray floor, recessed near ceiling
const DIE_Y = CAV_CEIL + 0.03; // raised toward the cover glass so the dice sit centred in the eye lenses (kills the parallax droop)
const SLOT_R = 0.32; // circular dice-slot radius

// ---- Rigid pink INSERT that sits inside the black tray ---------------------
// IMPORTANT — the whole lid flips 180° earlier in the sequence (rotation.x→π),
// which maps local -Z → world +Z. So the user's FRONT (toward the camera) is
// local -Z, and the user's BACK/rear is local +Z. All -Y faces read as "up".
//
// The insert sits FLUSH against the left, right and FRONT (local -Z) inner
// walls, leaving a wide matte-black gap at the user's BACK (local +Z) — that
// gap is where the assembly tips into when it opens. It is ONE unified rigid
// piece hinged at its REAR (local +Z) edge:
//   FRONT half (local -Z) — a LOW, thin FLAT pink panel carrying AUGEN AUF!;
//                           the two dice wells sit beneath it (under the owl's
//                           eyes on the cover), and the green ribbon is on its
//                           front lip.
//   REAR half  (local +Z) — a tall ELEVATED block by the hinge.
// Pulling the ribbon swings the ENTIRE piece up and back about the rear hinge,
// fully clearing the deck to expose the dice.
// Sized so the CAVITY clears the tray's OUTER footprint (W×H) — that is what lets
// the lid telescope down over it instead of perching on the rim.
const OW = W + LID_CLEAR + LID_WALL * 2; // lid outer width
const OH = H + LID_CLEAR + LID_WALL * 2; // lid outer length
const CAV_W = OW - LID_WALL * 2; // inner cavity width
const CAV_LEN = OH - LID_WALL * 2; // inner cavity length
const INS_W = CAV_W - 0.02; // insert width (flush to L/R inner walls)
// Orientation — DERIVED FROM THE MESH (not guessed): the owl-art plane uses
// rotation -90°X, which maps the texture's TOP edge to local -Z, and the info panel
// by the owl's SHOES sits at +Z (see line ~826). The camera is at +Z looking toward
// -Z. Therefore:
//   +Z = viewer-FRONT (near): owl shoes / "DOUBLE" text, the flat AUGEN AUF panel,
//        the green latch on the front lip.
//   -Z = viewer-BACK (far):   the owl's EYES, the two dice, the static elevated block.
// The dice sit at -Z under the eyes. The elevated block is a STATIC rear shelf. ONLY
// the flat FRONT panel moves — it is hinged at the crease just BEHIND the dice and
// swings UP & BACK, uncovering the dice wells.
const FRONT_MARGIN = 0.45; // black floor strip in FRONT of the insert where the green
// ribbon lies flat, matching the physical box (the pink insert does not reach the rim).
const INS_FRONT = OH / 2 - LID_WALL - FRONT_MARGIN; // +Z free FRONT lip of the flap
const DICE_Z = -0.58; // dice centre — directly under the owl's eyes (measured ≈ -0.59)
const HINGE_Z = DICE_Z - 0.2; // crease just BEHIND the dice; the front panel hinges here (-0.78)
const ELEV_LEN = 0.55; // static elevated rear-shelf z-length (short, by the -Z wall)
const ELEV_C = HINGE_Z - ELEV_LEN / 2; // elevated block centre, behind the hinge (-1.055)
const PANEL_LEN = INS_FRONT - HINGE_Z; // flat front panel z-length (crease → front lip)
const PANEL_C = (INS_FRONT + HINGE_Z) / 2; // flat front panel centre z
const STEP_T = 0.06; // flat panel board thickness
const SEAL_Y = CAV_OPEN + 0.02; // insert seat height (near the rim)
const LOW_TOP_Y = SEAL_Y + 0.02; // flat FRONT panel top face
// Both pink panels are the SAME uniform cardboard sheet (thickness STEP_T). The rear
// panel is not a thicker block — it is an identical flat sheet that simply rests
// higher, on a raised support structure underneath it. STEP_RISE is that purely
// positional elevation (toward the viewer once the lid flips); the flat front panel
// hinges against the vertical riser this step forms.
const STEP_RISE = 0.06; // visible step height between the flat panel top and the rear panel top
const ELEV_TOP_Y = LOW_TOP_Y - STEP_RISE; // rear panel's toward-viewer display face (proud of the front panel)
const PINK_W = INS_W; // pink spans the full insert width (flush L/R)
const HINGE_Y = LOW_TOP_Y; // hinge at the flat panel's top edge, at the base of the step riser
const FLAP_CLOSED = 0; // panel lies flat, sealing the dice
// POSITIVE: after the lid's 180° flip, this swings the front lip UP & BACK (a door
// opening against the static step). The negative sign flopped it DOWN through the box.
const FLAP_STAND = Math.PI * 0.55;
const FLAP_OPEN = [0.45, 0.6]; // scroll window over which it opens

// ---- Green latch: a narrow FLAT fabric ribbon (not a loop) -----------------
// Attaches to the FRONT lip (local +Z, viewer side) of the moving flat panel: it
// wraps over the front vertical edge and hangs DOWN past it as a grab-tab. When
// closed it drapes below the edge — completely hidden from a top-down view (no green
// on the pink top). It is parented INSIDE the moving front panel, so it is locked to
// the front lip and swings up & back with it through the entire opening arc.
const RIB_W = 0.26; // ribbon strip width (flat satin band, ~fraction of the box width)
const RIB_T = 0.015; // ribbon strip thickness (very thin, flat satin)
const RIB_ROOT = 0.09; // length of ribbon that laps back onto the flap top (the anchor)
const RIB_TAB_LEN = 0.42; // flat tongue length lying forward on the floor toward the wall

const INNER_W = W - WALL * 2;
const INNER_H = H - WALL * 2;
const FIT = 0.03;
const PAD_THICK = 0.08;
const CARD_THICK = 0.2;
const PAD_SIZE = [INNER_W - FIT * 2, INNER_H - FIT * 2, PAD_THICK];
const CARD_DEPTH = INNER_H * 0.44;
const CARD_SIZE = [INNER_W - FIT * 2, CARD_DEPTH, CARD_THICK];
const CARD_Z = INNER_H * 0.22; // deck offset into the +Z half of the tray

const DIE_R = 0.24;

// Lid keyframes (closed → lifted → right → flipped, then settle).
// Closed, the cavity's opening rim sits level with the tray rim and the skirt
// continues on down the outside of the tray walls.
const LID_CLOSED_Y = WALL_H + LID_DEPTH / 2;
// The visible black FRONT LIP: everything from the skirt's bottom edge up to the
// top plate. The info graphic is centred on this whole face, not just the rim.
const LIP_BOT = CAV_OPEN - SKIRT_H;
const LIP_TOP = CAV_CEIL + LID_TOP;
const LIP_H = LIP_TOP - LIP_BOT;
const LIP_C = (LIP_TOP + LIP_BOT) / 2;
const LID_REST = { x: 2.9, y: 0.7, z: 0 };

// Content park spots (left, stacked, lying flat). rot -90°X = artwork faces UP
// toward the overhead camera (was +90°, which pointed the art down → blank).
const PAD_PARK = { pos: [-2.9, 0.32, 0], rot: [-Math.PI / 2, 0, 0] };
const CARD_PARK = { pos: [-2.9, 0.58, 0], rot: [-Math.PI / 2, 0, 0] };

// Dice housing: two circular slots in the STATIC black tray floor at DICE_Z (-Z),
// directly under the owl's eyes. The flat front panel covers them when shut and the
// elevated block sits as a shelf just behind them. EYE_CUP x is the eye spacing.
// Measured from the cover art (box-front-flat.png): the owl's eyes are centred at
// ±0.52 of the box half-width and ≈0.334 from the TOP of the art, which maps to
// local z ≈ -0.59 (see DICE_Z above). Lifting the flat panel up & back exposes them.
const DICE_TRAY_LEN = 0.7; // z-length of the black dice-well plate
const EYE_CUP_L = new Vector3(-0.52, DIE_Y, DICE_Z);
const EYE_CUP_R = new Vector3(0.52, DIE_Y, DICE_Z);

// Clear plastic eye-window covers on the OUTER cover: two glossy discs sitting just
// above the owl-art plane, centred on the eye cut-outs (x ±0.52, z ≈ -0.586 on the
// cover, same longitudinal spot the dice align to). Purely decorative — children of
// the lid, so they ride with every existing animation; no other coords touched.
// FULL-BLEED cover art: the owl print runs edge-to-edge across the top face — head
// and ears to the top edge, wings/shoes to the side edges — with no black margin.
// (It used to be inset to W×H*0.98, which left a frame once the lid grew to OW×OH
// for the telescoping fit.) BLEED trims a hair so the art never overhangs the edge.
const ART_BLEED = 0.995;
const ART_W = OW * ART_BLEED;
const ART_H = OH * ART_BLEED;
// The eye constants below were pixel-measured against the OLD, inset art plane, so
// they must ride the same scale-up — otherwise the owl's eyes slide out from under
// their lens domes. Anything measured on the art scales by these two factors.
const ART_SX = ART_W / (W * 0.98);
const ART_SZ = ART_H / (H * 0.98);
const EYE_LENS_X = 0.52 * ART_SX;
const EYE_LENS_Z = -0.586 * ART_SZ; // owl eye centre on the cover art
const EYE_LENS_Y = CAV_CEIL + LID_TOP + 0.008; // seated on the art plane (art at +0.006)
const EYE_LENS_R = 0.34; // lens radius (covers the eye lens circle)
const EYE_LENS_RISE = 0.62; // dome height as a fraction of R — a prominent, bubbled
// half-sphere curving outward like a retro sunglass lens, NOT a flat disc.

// Stage timings.
const RELEASE = 0.62; // dice hand off to physics here
const CONTENT_OUT = [0.15, 0.5];

// Dice launch: a HIGH apex so each die clears the rim fence with margin (its
// underside must pass above the fence top when crossing the wall), then drops
// onto its target inside the felt DICE-ZONE.
const LAUNCH_VY = 7.4;
const DIE_TARGET_L = [-0.35, 0.18, 0.28];
const DIE_TARGET_R = [0.4, 0.18, -0.26];
// Invisible physics fence around the inner rim — tall enough to contain bounces,
// but comfortably below the entry arc so it never deflects an incoming die.
const FENCE_H = 1.4;

const phase = (p, a, b) => MathUtils.clamp((p - a) / (b - a), 0, 1);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Piecewise keyframe interpolation for a scalar over scroll progress.
function track(p, keys, ease = easeInOut) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) {
      const [pa, va] = keys[i - 1];
      const [pb, vb] = keys[i];
      return va + (vb - va) * ease((p - pa) / (pb - pa));
    }
  }
  return keys[keys.length - 1][1];
}

/* ------------------------------------------------------------- textures --- */

// Canvas decal for one die face: bold green number (6/9 underlined) or the owl.
function makeFaceTexture(label) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  if (label === 'owl') {
    ctx.fillStyle = '#e5148c';
    ctx.beginPath();
    ctx.arc(64, 68, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.arc(48, 62, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(80, 62, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#A6E22E';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(48, 62, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(80, 62, 15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(52, 58, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(84, 58, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F5A623';
    ctx.beginPath(); ctx.moveTo(64, 74); ctx.lineTo(56, 88); ctx.lineTo(72, 88); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e5148c';
    ctx.beginPath(); ctx.moveTo(36, 44); ctx.lineTo(28, 22); ctx.lineTo(50, 34); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(92, 44); ctx.lineTo(100, 22); ctx.lineTo(78, 34); ctx.closePath(); ctx.fill();
  } else {
    ctx.font = '900 78px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#A6E22E';
    ctx.fillText(label, 64, 58);
    if (label === '6' || label === '9') ctx.fillRect(42, 104, 44, 9);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makePanelTexture(wPx, hPx, { label = '' } = {}) {
  const c = document.createElement('canvas');
  c.width = wPx;
  c.height = hPx;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(0, 0, wPx, hPx);
  for (let i = 0; i < (wPx * hPx) / 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
    ctx.fillRect(Math.random() * wPx, Math.random() * hPx, 2, 2);
  }
  const inset = Math.min(wPx, hPx) * 0.16;
  const rad = Math.min(wPx, hPx) * 0.12;
  ctx.strokeStyle = '#9ccb2b';
  ctx.lineWidth = Math.max(3, Math.min(wPx, hPx) * 0.045);
  ctx.beginPath();
  ctx.roundRect(inset, inset, wPx - inset * 2, hPx - inset * 2, rad);
  ctx.stroke();
  if (label) {
    ctx.save();
    ctx.translate(wPx / 2, hPx / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `900 ${Math.floor(wPx * 0.42)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f5f5f5';
    ctx.letterSpacing = `${Math.floor(wPx * 0.06)}px`;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeFeltTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = FELT_GREEN;
  ctx.fillRect(0, 0, 512, 512);
  const img = ctx.getImageData(0, 0, 512, 512);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.6));
  }
  ctx.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// "DICE-ZONE" badge (white pill, dark text, pink arrow) for the inner walls.
const WALL_LABEL_ASPECT = 640 / 200;
function makeWallLabel() {
  const cw = 640, ch = 200;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#f6f6f6';
  ctx.beginPath();
  ctx.roundRect(12, 46, cw - 24, ch - 92, (ch - 92) / 2);
  ctx.fill();
  ctx.font = `900 ${Math.floor(ch * 0.34)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '2px';
  ctx.fillStyle = '#141414';
  ctx.fillText('DICE-ZONE', cw / 2 - 18, ch / 2);
  ctx.fillStyle = '#e5148c';
  const ax = cw - 70;
  ctx.beginPath();
  ctx.moveTo(ax, ch * 0.4);
  ctx.lineTo(ax + 28, ch * 0.5);
  ctx.lineTo(ax, ch * 0.6);
  ctx.closePath();
  ctx.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// "AUGEN AUF!" flap graphic — pink feather ground with bold white lettering.
function makeFlapTexture() {
  const cw = 1024, ch = 620;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  ctx.fillStyle = INSERT_PINK;
  ctx.fillRect(0, 0, cw, ch);
  // scattered dark feathers
  for (let i = 0; i < 60; i++) {
    drawFeather(ctx, Math.random() * cw, Math.random() * ch, 18 + Math.random() * 28, Math.random() * Math.PI, 'rgba(15,0,10,0.24)');
  }
  // bold white "AUGEN AUF!"
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 150px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(10,0,6,0.5)';
  ctx.strokeText('AUGEN AUF!', cw / 2, ch * 0.5);
  ctx.fillText('AUGEN AUF!', cw / 2, ch * 0.5);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A single dark feather/leaf silhouette (the tray's scattered pattern).
function drawFeather(ctx, x, y, s, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.55, -s * 0.15, 0, s);
  ctx.quadraticCurveTo(-s * 0.55, -s * 0.15, 0, -s);
  ctx.fill();
  ctx.restore();
}

// Pink feather ground for the tray outer/inner walls (matches the physical box).
function makeFeatherPink(w = 1024, h = 1024, seedCount = 46) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = INSERT_PINK;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < seedCount; i++) {
    drawFeather(ctx, Math.random() * w, Math.random() * h, 16 + Math.random() * 26, Math.random() * Math.PI, 'rgba(20,0,12,0.22)');
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// "WARNING! DOUBLE TROUBLE!" white badge (transparent ground → overlays the
// feather wall). ACHTUNG!→WARNING! (pink), PASCHGEFAHR!→DOUBLE TROUBLE! (dark).
function makeWarningDecal() {
  const cw = 1100, ch = 220;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = '#f6f6f6';
  ctx.beginPath();
  ctx.roundRect(20, 46, cw - 40, ch - 92, (ch - 92) / 2);
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.floor(ch * 0.3)}px Arial, sans-serif`;
  const a = 'WARNING! ';
  const b = 'DOUBLE TROUBLE!';
  const wa = ctx.measureText(a).width;
  const wb = ctx.measureText(b).width;
  const startX = (cw - (wa + wb)) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e5148c';
  ctx.fillText(a, startX, ch / 2 + 2);
  ctx.fillStyle = '#141414';
  ctx.fillText(b, startX + wa, ch / 2 + 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// "HAPPY DOUBLE" large white title for the outer side walls (transparent).
function makeTitleDecal() {
  const cw = 1536, ch = 320;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  ctx.font = `900 ${Math.floor(ch * 0.62)}px ${HEAVY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '4px';
  ctx.lineJoin = 'round';
  ctx.lineWidth = ch * 0.04;
  ctx.strokeStyle = 'rgba(10,0,6,0.55)';
  ctx.strokeText('HAPPY DOUBLE', cw / 2, ch / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('HAPPY DOUBLE', cw / 2, ch / 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// FRONT BLACK LIP graphic (transparent ground over the black lid face), matching
// the German retail box: a big heavy title block on the left, then the spec icons
// —  green feather · 8–99 · 20 Min. · ab 2 · pink feather — all vertically centred
// and scaled to fill the face generously.
const LID_INFO_ASPECT = 1900 / 440;
function makeLidInfoDecal() {
  const cw = 1900, ch = 440;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);

  // ---- left: the title block. Both lines are FIT to the column width rather than
  // given a fixed size, so they land as large as the space allows without ever
  // colliding with the icons — the metrics of the heavy face vary by host. ----
  const leftX = 44;
  const leftW = cw * 0.5 - leftX - 40;
  const fit = (text, maxW, startPx) => {
    let px = startPx;
    ctx.font = `900 ${px}px ${HEAVY}`;
    while (ctx.measureText(text).width > maxW && px > 8) {
      px -= 2;
      ctx.font = `900 ${px}px ${HEAVY}`;
    }
    return px;
  };
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  fit('HAPPY DOUBLE', leftW, Math.floor(ch * 0.46));
  ctx.fillText('HAPPY DOUBLE', leftX, ch * 0.34);
  ctx.fillStyle = GREEN;
  fit('NO RISK, NO RUN!', leftW * 0.86, Math.floor(ch * 0.3));
  ctx.fillText('NO RISK, NO RUN!', leftX + 2, ch * 0.72);

  // ---- right: green feather · 8–99 · 20 Min. · ab 2 · pink feather ----
  // Laid out as a MEASURED FLOW, not fixed columns: each item claims the greater of
  // its icon diameter and its label width. Fixed columns overlapped, because "20 Min."
  // is far wider than "ab 2" and the feathers need almost no width at all.
  const specs = [
    { icon: 'feather', color: GREEN },
    { icon: 'age', label: '8–99' },
    { icon: 'time', label: '20 Min.' },
    { icon: 'players', label: '2+' },
    { icon: 'feather', color: INSERT_PINK },
  ];
  const iy = ch * 0.4; // icon centre
  const r = ch * 0.16; // icon radius
  const labelPx = Math.floor(ch * 0.15);
  const gap = ch * 0.09;
  ctx.font = `900 ${labelPx}px ${HEAVY}`;
  const widths = specs.map((s) =>
    s.icon === 'feather' ? r * 1.3 : Math.max(r * 2, ctx.measureText(s.label).width)
  );
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (specs.length - 1);
  let x = cw - 40 - totalW; // right-aligned against the trailing pink feather
  specs.forEach((s, i) => {
    const cx = x + widths[i] / 2;
    x += widths[i] + gap;
    if (s.icon === 'feather') {
      drawFeather(ctx, cx, ch * 0.5, r * 1.7, -0.45, s.color);
      return;
    }
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = ch * 0.028;
    if (s.icon === 'age') {
      // Standard board-game "age" pictogram: a child and an adult figure
      // standing on a shared baseline, not a plain circle-and-dot.
      const baseline = iy + r * 0.62;
      const adultHeadR = r * 0.24;
      const adultX = cx + r * 0.3;
      const adultHeadY = iy - r * 0.42;
      ctx.beginPath(); ctx.arc(adultX, adultHeadY, adultHeadR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.roundRect(adultX - r * 0.26, adultHeadY + adultHeadR * 0.85, r * 0.52, baseline - (adultHeadY + adultHeadR * 0.85), r * 0.16);
      ctx.fill();
      const childHeadR = r * 0.17;
      const childX = cx - r * 0.32;
      const childHeadY = iy - r * 0.06;
      ctx.beginPath(); ctx.arc(childX, childHeadY, childHeadR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.roundRect(childX - r * 0.19, childHeadY + childHeadR * 0.85, r * 0.38, baseline - (childHeadY + childHeadR * 0.85), r * 0.12);
      ctx.fill();
    } else if (s.icon === 'time') {
      ctx.beginPath(); ctx.arc(cx, iy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, iy); ctx.lineTo(cx, iy - r * 0.6);
      ctx.moveTo(cx, iy); ctx.lineTo(cx + r * 0.5, iy);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(cx - r * 0.45, iy - r * 0.2, r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + r * 0.45, iy - r * 0.2, r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx - r * 0.95, iy + r * 0.2, r * 1.9, r * 0.75, r * 0.3); ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = `900 ${labelPx}px ${HEAVY}`;
    ctx.fillText(s.label, cx, ch * 0.82);
    ctx.textAlign = 'left';
  });

  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const mkQuat = (xA, yA, zA) => new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(xA, yA, zA));
// Inner-wall label orientations for the FLAT tray (walls rise +Y, up = +Y).
const WALL_QUAT_PX = mkQuat(new Vector3(0, 0, 1), new Vector3(0, 1, 0), new Vector3(-1, 0, 0)); // +X wall, faces -X
const WALL_QUAT_NX = mkQuat(new Vector3(0, 0, -1), new Vector3(0, 1, 0), new Vector3(1, 0, 0)); // -X wall, faces +X
const WALL_QUAT_PZ = mkQuat(new Vector3(-1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, -1)); // +Z wall, faces -Z
const WALL_QUAT_NZ = mkQuat(new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)); // -Z wall, faces +Z

// Dodecahedron faces → { position, quaternion } for placing number decals.
function computeD12Faces(radius) {
  const geo = new DodecahedronGeometry(radius);
  const pos = geo.getAttribute('position');
  const groups = [];
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  const e1 = new Vector3(), e2 = new Vector3(), n = new Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
    let g = groups.find((f) => f.n.dot(n) > 0.99);
    if (!g) {
      g = { n: n.clone(), verts: new Map() };
      groups.push(g);
    }
    for (const v of [a, b, c]) {
      const vk = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
      if (!g.verts.has(vk)) g.verts.set(vk, v.clone());
    }
  }
  geo.dispose();
  const up = new Vector3(0, 1, 0);
  const altUp = new Vector3(0, 0, 1);
  return groups.map((g) => {
    const center = new Vector3();
    g.verts.forEach((v) => center.add(v));
    center.divideScalar(g.verts.size);
    const z = g.n.clone();
    const yRef = Math.abs(z.dot(up)) > 0.9 ? altUp : up;
    const x = new Vector3().crossVectors(yRef, z).normalize();
    const y = new Vector3().crossVectors(z, x).normalize();
    return {
      position: center.add(z.clone().multiplyScalar(0.02)),
      quaternion: new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z)),
    };
  });
}

const FACE_LABELS = ['owl', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
let FACE_TEXTURES = null;
const getFaceTextures = () => (FACE_TEXTURES ||= FACE_LABELS.map(makeFaceTexture));

function roundedRectShape(w, h, r) {
  const s = new Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function roundedPlaneGeometry(w, h, r) {
  const geo = new ShapeGeometry(roundedRectShape(w, h, r), 6);
  const pos = geo.attributes.position;
  const uv = [];
  for (let i = 0; i < pos.count; i++) uv.push((pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return geo;
}
function roundedCardGeometry(w, h, d, r) {
  const geo = new ExtrudeGeometry(roundedRectShape(w, h, r), { depth: d, bevelEnabled: false, curveSegments: 6 });
  geo.translate(0, 0, -d / 2);
  return geo;
}

/* --------------------------------------------------------------- pieces --- */

// Shared D12 visual (matte body + numbered decals).
function DieMesh() {
  const faces = useMemo(() => computeD12Faces(DIE_R), []);
  const textures = useMemo(getFaceTextures, []);
  return (
    <group>
      <mesh castShadow>
        <dodecahedronGeometry args={[DIE_R]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.52} metalness={0} flatShading />
      </mesh>
      {faces.slice(0, textures.length).map((f, i) => (
        <mesh key={i} position={f.position} quaternion={f.quaternion}>
          <planeGeometry args={[DIE_R * 0.62, DIE_R * 0.62]} />
          <meshBasicMaterial map={textures[i]} transparent toneMapped={false} depthWrite={false} polygonOffset polygonOffsetFactor={-4} />
        </mesh>
      ))}
    </group>
  );
}

/* Physics D12. While p < RELEASE it is KINEMATIC, driven each frame to its
 * eye-cup in the (moving/flipping) lid. Crossing RELEASE flips it to DYNAMIC
 * with a launch velocity toward the tray, and Rapier takes over. */
function PhysicsDie({ apiRef, lidRef, cupLocal, progress, target }) {
  const launched = useRef(false);
  const cup = useMemo(() => cupLocal.clone(), [cupLocal]);
  const wp = useMemo(() => new Vector3(), []);
  const wq = useMemo(() => new Quaternion(), []);

  useFrame(() => {
    const api = apiRef.current;
    const lid = lidRef.current;
    if (!api || !lid) return;
    const p = progress.current;

    if (p < RELEASE) {
      if (launched.current) {
        api.setBodyType(2, true); // 2 = KinematicPositionBased → re-arm on scroll-back
        launched.current = false;
      }
      lid.updateWorldMatrix(true, false);
      wp.copy(cup).applyMatrix4(lid.matrixWorld);
      lid.getWorldQuaternion(wq);
      api.setNextKinematicTranslation(wp);
      api.setNextKinematicRotation(wq);
    } else if (!launched.current) {
      launched.current = true;
      lid.updateWorldMatrix(true, false);
      wp.copy(cup).applyMatrix4(lid.matrixWorld);
      api.setBodyType(0, true); // 0 = Dynamic
      api.setTranslation(wp, true);
      // BALLISTIC launch: a fixed high apex (clears the rim fence) with the
      // horizontal velocity solved so the die lands ON its target inside the
      // felt. This guarantees both dice arc over the wall and drop into the
      // DICE-ZONE rather than sailing off the side.
      const g = 9.81;
      const vy = LAUNCH_VY; // upward — sets the arc height
      const disc = Math.max(vy * vy - 2 * g * (wp.y - target[1]), 0.04);
      const t = (vy + Math.sqrt(disc)) / g; // time to descend to target height
      api.setLinvel({ x: (target[0] - wp.x) / t, y: vy, z: (target[2] - wp.z) / t }, true);
      api.setAngvel({ x: (Math.random() - 0.5) * 9, y: (Math.random() - 0.5) * 9, z: (Math.random() - 0.5) * 9 }, true);
    }
    // once dynamic, Rapier owns it — nothing to do
  });

  return (
    <RigidBody
      ref={apiRef}
      colliders="hull"
      type="kinematicPosition"
      restitution={0.35}
      friction={0.85}
      linearDamping={0.15}
      angularDamping={0.2}
      canSleep
    >
      <DieMesh />
    </RigidBody>
  );
}

/* Card deck / scorepad block: rounded slab that rests flat in the tray, then
 * flies UP and out to a park spot on the LEFT (Bézier so it clears the walls). */
function FlyOutItem({ anchorRef, park, out, progress, size, textureUrl, sideColor, parkScale = 0.62, texQuarterTurn = false }) {
  const ref = useRef();
  const release = useRef(null);
  const v = useMemo(() => new Vector3(), []);
  const q = useMemo(() => new Quaternion(), []);
  const A = useMemo(() => new Vector3(), []);
  const C = useMemo(() => new Vector3(), []);
  const P = useMemo(() => new Vector3(), []);
  const B = useMemo(() => new Vector3(...park.pos), [park]);
  const parkQ = useMemo(() => new Quaternion().setFromEuler(new Euler(...park.rot)), [park]);
  const { gl } = useThree();
  const map = useLoader(TextureLoader, textureUrl);
  map.colorSpace = SRGBColorSpace;
  // Card/scorepad text is read close-up and near edge-on when the deck first
  // lifts off the felt — without anisotropic filtering, mipmapping alone
  // blurs it into mush at that angle. Same fix as the lid cover art.
  map.anisotropy = gl.capabilities.getMaxAnisotropy();
  if (texQuarterTurn) {
    map.center.set(0.5, 0.5);
    map.rotation = Math.PI / 2;
  }
  const corner = Math.min(0.08, Math.min(size[0], size[1]) * 0.09);
  const bodyGeo = useMemo(() => roundedCardGeometry(size[0], size[1], size[2], corner), [size, corner]);
  const topGeo = useMemo(() => roundedPlaneGeometry(size[0], size[1], corner), [size, corner]);

  useFrame(() => {
    const item = ref.current;
    if (!item || !anchorRef.current) return;
    const t = easeInOut(phase(progress.current, out[0], out[1]));
    if (t <= 0) {
      anchorRef.current.getWorldPosition(v);
      anchorRef.current.getWorldQuaternion(q);
      item.position.copy(v);
      item.quaternion.copy(q);
      release.current = null;
      item.scale.setScalar(1);
    } else {
      if (!release.current) {
        anchorRef.current.getWorldPosition(v);
        anchorRef.current.getWorldQuaternion(q);
        release.current = { pos: v.clone(), quat: q.clone() };
      }
      A.copy(release.current.pos);
      C.copy(A).lerp(B, 0.22);
      C.y += 2.6; // lift up out of the tray before gliding aside
      const u = 1 - t;
      P.copy(A).multiplyScalar(u * u).addScaledVector(C, 2 * u * t).addScaledVector(B, t * t);
      item.position.copy(P);
      item.quaternion.slerpQuaternions(release.current.quat, parkQ, t);
      item.scale.setScalar(MathUtils.lerp(1, parkScale, t));
    }
  });

  return (
    <group ref={ref}>
      <mesh geometry={bodyGeo}>
        <meshStandardMaterial color={sideColor} roughness={0.62} />
      </mesh>
      <mesh geometry={topGeo} position={[0, 0, size[2] / 2 + 0.003]}>
        <meshStandardMaterial map={map} roughness={0.55} />
      </mesh>
    </group>
  );
}

/* Damped scrub. */
function ProgressSmoother({ targetRef, smoothRef }) {
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-delta * 5.5);
    smoothRef.current += (targetRef.current - smoothRef.current) * k;
  });
  return null;
}

/* Fixed angled camera that looks down into the tray, with a gentle push-in. */
function CameraRig({ progress }) {
  useFrame((state) => {
    const t = easeInOut(phase(progress.current, 0, 0.5));
    state.camera.position.set(0, MathUtils.lerp(4.4, 4.9, t), MathUtils.lerp(6.6, 6.0, t));
    state.camera.lookAt(0, 0.05, 0.15);
  });
  return null;
}

/* A circular dice slot in the black inner tray: a dark recessed cup the die
 * nestles into (the real box has two, split by a centre partition). */
function DiceSlot({ position }) {
  return (
    <group position={position}>
      {/* cup wall (open cylinder) */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[SLOT_R, SLOT_R * 0.92, 0.16, 40, 1, true]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.7} metalness={0.1} side={2} />
      </mesh>
      {/* cup floor */}
      <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[SLOT_R * 0.92, 40]} />
        <meshStandardMaterial color="#060606" roughness={0.8} />
      </mesh>
    </group>
  );
}

/* The LID: a hollow flip-top box whose interior mirrors the physical mechanism.
 *  - Top plate (owl art) + thick rim walls form the cavity.
 *  - A BLACK INNER TRAY holds the two dice in circular slots, split by a centre
 *    partition, recessed near the ceiling.
 *  - A ONE-PIECE STEPPED INSERT seals the tray: a LOW flat FRONT panel (AUGEN
 *    AUF! label, green ribbon on its lip) stepping up to a tall ELEVATED REAR
 *    block. The two dice wells sit in the static tray floor under the front
 *    panel (beneath the owl's eyes). Pulling the ribbon swings the WHOLE insert
 *    up and back about its rear hinge as one solid piece, clearing the deck to
 *    expose the dice.
 *  - Scroll drives lift → right → flip → settle, then the insert opens. */
function Lid({ lidRef, progress, texture, flapTex, feather, infoTex }) {
  const flapRef = useRef();
  useFrame(() => {
    const lid = lidRef.current;
    if (!lid) return;
    const p = progress.current;
    lid.position.x = track(p, [[0, 0], [0.12, 0], [0.36, LID_REST.x]]);
    lid.position.y = track(p, [[0, LID_CLOSED_Y], [0.15, LID_CLOSED_Y + 2.2], [0.42, LID_REST.y]]);
    lid.position.z = track(p, [[0, 0], [0.36, LID_REST.z]]);
    lid.rotation.x = track(p, [[0, 0], [0.16, 0], [0.4, Math.PI]]); // flip interior up
    // The WHOLE insert pivots as one rigid piece about its rear hinge, from flat
    // to up-and-back across the FLAP_OPEN window. The ribbon is parented inside,
    // so it swings along with the front lip automatically.
    const t = easeInOut(phase(p, FLAP_OPEN[0], FLAP_OPEN[1]));
    if (flapRef.current) flapRef.current.rotation.x = MathUtils.lerp(FLAP_CLOSED, FLAP_STAND, t);
  });

  return (
    <group ref={lidRef} position={[0, LID_CLOSED_Y, 0]}>
      {/* ---- TOP PLATE (owl art on +Y, black ceiling on -Y) ---- */}
      <mesh position={[0, CAV_CEIL + LID_TOP / 2, 0]}>
        <boxGeometry args={[OW, LID_TOP, OH]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, CAV_CEIL + LID_TOP + 0.006, 0]}>
        <planeGeometry args={[ART_W, ART_H]} />
        <meshStandardMaterial map={texture} roughness={0.5} toneMapped={false} />
      </mesh>

      {/* ---- CLEAR PLASTIC EYE-WINDOW DOMES: two blister bubbles over the owl's eyes,
          curving outward like retro sunglasses. Built as an upper HEMISPHERE (thetaLength
          = PI/2) so the silhouette genuinely bulges; EYE_LENS_RISE sets how proud it sits.
          Fully clear — transmission 1 with a thin wall, so it catches glossy highlights
          without tinting or darkening the dice sitting just underneath. Children of the
          lid, so they ride with every existing animation. ---- */}
      {[-EYE_LENS_X, EYE_LENS_X].map((x, i) => (
        <mesh
          key={`eyeLens${i}`}
          position={[x, EYE_LENS_Y, EYE_LENS_Z]}
          scale={[1, EYE_LENS_RISE, 1]}
        >
          <sphereGeometry args={[EYE_LENS_R, 64, 40, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            transmission={1}
            thickness={0.04}
            roughness={0.02}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.02}
            ior={1.5}
            reflectivity={0.6}
            side={2}
            transparent
            opacity={1}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* ---- RIM WALLS + TELESCOPING SKIRT: one continuous sheet of black board from
          the ceiling down past the cavity opening, sheathing the tray's outer walls when
          closed. Spans CAV_CEIL → CAV_OPEN - SKIRT_H. ---- */}
      {[
        { pos: [OW / 2 - LID_WALL / 2, -SKIRT_H / 2, 0], args: [LID_WALL, LID_DEPTH + SKIRT_H, OH] },
        { pos: [-OW / 2 + LID_WALL / 2, -SKIRT_H / 2, 0], args: [LID_WALL, LID_DEPTH + SKIRT_H, OH] },
        { pos: [0, -SKIRT_H / 2, OH / 2 - LID_WALL / 2], args: [OW, LID_DEPTH + SKIRT_H, LID_WALL] },
        { pos: [0, -SKIRT_H / 2, -OH / 2 + LID_WALL / 2], args: [OW, LID_DEPTH + SKIRT_H, LID_WALL] },
      ].map((w, i) => (
        <mesh key={i} position={w.pos}>
          <boxGeometry args={w.args} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.6} />
        </mesh>
      ))}

      {/* info graphic on the FRONT black lip (+Z end, by the owl's shoes), centred on
          the full visible face — skirt bottom to top plate — and scaled to fill it. */}
      <mesh position={[0, LIP_C, OH / 2 + 0.006]}>
        <planeGeometry args={[OW * 0.94, (OW * 0.94) / LID_INFO_ASPECT]} />
        <meshStandardMaterial map={infoTex} transparent roughness={0.6} toneMapped={false} />
      </mesh>

      {/* ---- BLACK INNER TRAY FLOOR (STATIC): fills the whole cavity. The two dice
          wells are recessed into it at -Z, directly beneath the owl's eyes. ---- */}
      <mesh position={[0, TRAY_FLOOR_Y + 0.02, 0]}>
        <boxGeometry args={[CAV_W, 0.04, CAV_LEN]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.72} />
      </mesh>
      {/* centre partition between the two dice slots */}
      <mesh position={[0, TRAY_FLOOR_Y - 0.05, DICE_Z]}>
        <boxGeometry args={[0.05, 0.14, DICE_TRAY_LEN * 0.7]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.72} />
      </mesh>
      <DiceSlot position={[EYE_CUP_L.x, TRAY_FLOOR_Y, DICE_Z]} />
      <DiceSlot position={[EYE_CUP_R.x, TRAY_FLOOR_Y, DICE_Z]} />

      {/* ---- ELEVATED REAR PANEL (STATIC): the SAME uniform cardboard sheet as the
          front flap (thickness STEP_T) — not a thicker block. It simply rests STEP_RISE
          higher, held up by the support structure below. Its display face sits proud of
          the front panel, forming the riser the front panel hinges against. ---- */}
      <mesh position={[0, ELEV_TOP_Y + STEP_T / 2, ELEV_C]}>
        <boxGeometry args={[PINK_W, STEP_T, ELEV_LEN]} />
        <meshStandardMaterial map={feather} roughness={0.72} toneMapped={false} />
      </mesh>
      {/* the raised support underneath the rear panel — the structure it rests on.
          Fills from the rear sheet's underside down to the front panel's plane, so the
          rear sheet reads as elevated rather than floating. Inset so it reads as a base. */}
      <mesh position={[0, ELEV_TOP_Y + STEP_T + STEP_RISE / 2, ELEV_C]}>
        <boxGeometry args={[PINK_W * 0.92, STEP_RISE, ELEV_LEN * 0.9]} />
        <meshStandardMaterial map={feather} roughness={0.72} toneMapped={false} />
      </mesh>

      {/* ---- MOVING FLAT FRONT PANEL (the ONLY piece that opens). Hinged at the
          crease just BEHIND the dice (-Z edge). Pulling the front-lip ribbon swings
          it UP & BACK about that hinge, uncovering the dice wells. The inner group
          cancels the hinge offset so children keep lid-space coords. ---- */}
      <group ref={flapRef} position={[0, HINGE_Y, HINGE_Z]}>
        <group position={[0, -HINGE_Y, -HINGE_Z]}>
          {/* low flat front panel (crease → front lip) */}
          <mesh position={[0, LOW_TOP_Y + STEP_T / 2, PANEL_C]}>
            <boxGeometry args={[PINK_W, STEP_T, PANEL_LEN]} />
            <meshStandardMaterial map={feather} roughness={0.72} toneMapped={false} />
          </mesh>
          {/* AUGEN AUF! sticker on the TOP (-Y face), kept toward +Z (clear of eyes) */}
          <mesh position={[0, LOW_TOP_Y - 0.004, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[PINK_W * 0.9, 1.1]} />
            <meshBasicMaterial map={flapTex} toneMapped={false} />
          </mesh>

          {/* ---- GREEN RIBBON latch — a flat satin pull-strip on the flap's FREE edge
              (INS_FRONT), the edge nearest the front WARNING wall. It laps back onto the
              flap top (the anchor) and runs FORWARD as a flat tongue lying on the black
              floor margin, pointing toward the viewer — exactly the resting pose in the
              reference. Being parented in the moving panel, the whole ribbon LIFTS and
              folds up & back with the free edge as the flap opens (sim: free edge rises
              from y0.58 → y3.38). This replaces the old crease-edge tab, which sat on the
              hinge and barely moved. ---- */}
          <group position={[0, LOW_TOP_Y, INS_FRONT]}>
            {/* single flat satin band: laps ~RIB_ROOT onto the flap top, then extends
                RIB_TAB_LEN forward over the free edge onto the floor margin */}
            <mesh position={[0, STEP_T + RIB_T / 2, RIB_TAB_LEN / 2 - RIB_ROOT]}>
              <boxGeometry args={[RIB_W, RIB_T, RIB_TAB_LEN]} />
              <meshStandardMaterial
                color={GREEN}
                roughness={0.32}
                metalness={0.1}
                emissive={GREEN}
                emissiveIntensity={0.12}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/* --------------------------------------------------------------- scene --- */

function Scene({ progress }) {
  const { gl } = useThree();
  const texture = useLoader(TextureLoader, FRONT_TEXTURE);
  texture.colorSpace = SRGBColorSpace;
  // Full-bleed cover art is viewed at a shallow, near-grazing angle on the lid
  // top — without anisotropic filtering, mipmapping alone blurs it heavily at
  // that angle. Every other (canvas-drawn) texture in this file already sets
  // anisotropy; this real photo texture was missing it.
  texture.anisotropy = gl.capabilities.getMaxAnisotropy();
  const flapTex = useMemo(makeFlapTexture, []);
  const panels = useMemo(
    () => ({
      felt: makeFeltTexture(),
      wallLabel: makeWallLabel(),
      feather: makeFeatherPink(),
      warning: makeWarningDecal(),
      title: makeTitleDecal(),
      lidInfo: makeLidInfoDecal(),
    }),
    []
  );

  const lidRef = useRef();
  const dieL = useRef();
  const dieR = useRef();
  const padAnchor = useRef();
  const cardAnchor = useRef();

  const feltW = INNER_W - WALL * 0.8;
  const feltH = INNER_H - WALL * 0.8;
  // DICE-ZONE labels on the four inner walls (flat-tray orientations).
  const LW = 0.9, LH = 0.9 / WALL_LABEL_ASPECT, yc = WALL_H * 0.5, d = 0.006;
  // The +Z inner wall is now the WARNING wall, so it carries no DICE-ZONE label.
  const walls = [
    { key: 'px', position: [INNER_W / 2 - d, yc, 0], quaternion: WALL_QUAT_PX },
    { key: 'nx', position: [-INNER_W / 2 + d, yc, 0], quaternion: WALL_QUAT_NX },
    { key: 'nz', position: [0, yc, -INNER_H / 2 + d], quaternion: WALL_QUAT_NZ },
  ];

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 7, 5]} intensity={2.6} castShadow />
      <directionalLight position={[-4, 3, 4]} intensity={1.0} color="#fff0f8" />
      <pointLight position={[-5, 2, 3]} intensity={22} color={PINK} distance={16} />
      <pointLight position={[5, 2, 3]} intensity={20} color={GREEN} distance={16} />

      <CameraRig progress={progress} />
      <Lid
        lidRef={lidRef}
        progress={progress}
        texture={texture}
        flapTex={flapTex}
        feather={panels.feather}
        infoTex={panels.lidInfo}
      />

      {/* Contents that fly out to the left */}
      <FlyOutItem
        anchorRef={cardAnchor}
        park={CARD_PARK}
        out={CONTENT_OUT}
        progress={progress}
        size={CARD_SIZE}
        textureUrl={CARD_TEXTURE}
        sideColor={INSERT_PINK}
        texQuarterTurn
      />
      <FlyOutItem
        anchorRef={padAnchor}
        park={PAD_PARK}
        out={[CONTENT_OUT[0] + 0.05, CONTENT_OUT[1] + 0.05]}
        progress={progress}
        size={PAD_SIZE}
        textureUrl={PAD_TEXTURE}
        sideColor="#e8e8e8"
        texQuarterTurn
      />

      {/* ---- PHYSICS WORLD: stationary tray colliders + the two dice ---- */}
      <Physics gravity={[0, -9.81, 0]} timeStep="vary">
        {/* Tray colliders (fixed): floor + a TALL invisible fence around the
            inner rim (FENCE_H ≫ the visible wall height) so the dice can't
            bounce back out once they drop in. */}
        <RigidBody type="fixed" colliders={false} restitution={0.25} friction={0.95}>
          <CuboidCollider args={[W / 2, FLOOR_T / 2, H / 2]} position={[0, -FLOOR_T / 2, 0]} />
          <CuboidCollider args={[WALL / 2, FENCE_H / 2, INNER_H / 2]} position={[INNER_W / 2 + WALL / 2, FENCE_H / 2, 0]} />
          <CuboidCollider args={[WALL / 2, FENCE_H / 2, INNER_H / 2]} position={[-INNER_W / 2 - WALL / 2, FENCE_H / 2, 0]} />
          <CuboidCollider args={[W / 2, FENCE_H / 2, WALL / 2]} position={[0, FENCE_H / 2, INNER_H / 2 + WALL / 2]} />
          <CuboidCollider args={[W / 2, FENCE_H / 2, WALL / 2]} position={[0, FENCE_H / 2, -INNER_H / 2 - WALL / 2]} />
        </RigidBody>

        <PhysicsDie apiRef={dieL} lidRef={lidRef} cupLocal={EYE_CUP_L} progress={progress} target={DIE_TARGET_L} />
        <PhysicsDie apiRef={dieR} lidRef={lidRef} cupLocal={EYE_CUP_R} progress={progress} target={DIE_TARGET_R} />
      </Physics>

      {/* ---- VISIBLE TRAY (stationary base, centered) ---- */}
      <group>
        {/* floor */}
        <mesh position={[0, -FLOOR_T / 2, 0]} receiveShadow>
          <boxGeometry args={[W, FLOOR_T, H]} />
          <meshStandardMaterial color="#0c0c0c" roughness={0.7} />
        </mesh>
        {/* felt */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
          <planeGeometry args={[feltW, feltH]} />
          <meshStandardMaterial map={panels.felt} color={FELT_GREEN} roughness={1} metalness={0} />
        </mesh>
        {/* walls — pink feather inside AND out, like the physical tray */}
        {[
          { pos: [INNER_W / 2 + WALL / 2, WALL_H / 2, 0], args: [WALL, WALL_H, H] },
          { pos: [-INNER_W / 2 - WALL / 2, WALL_H / 2, 0], args: [WALL, WALL_H, H] },
          { pos: [0, WALL_H / 2, INNER_H / 2 + WALL / 2], args: [W, WALL_H, WALL] },
          { pos: [0, WALL_H / 2, -INNER_H / 2 - WALL / 2], args: [W, WALL_H, WALL] },
        ].map((w, i) => (
          <mesh key={i} position={w.pos}>
            <boxGeometry args={w.args} />
            <meshStandardMaterial map={panels.feather} roughness={0.7} metalness={0} />
          </mesh>
        ))}
        {/* DICE-ZONE labels (inner walls) */}
        {walls.map((w) => (
          <mesh key={w.key} position={w.position} quaternion={w.quaternion}>
            <planeGeometry args={[LW, LH]} />
            <meshStandardMaterial map={panels.wallLabel} transparent roughness={0.85} metalness={0} />
          </mesh>
        ))}
        {/* WARNING! DOUBLE TROUBLE! lives on the INSIDE of the front (+Z) tray wall,
            facing back into the box. The telescoping lid hides it completely when
            closed — it is only revealed once the lid is lifted off. */}
        <mesh position={[0, WALL_H * 0.52, INNER_H / 2 - 0.006]} quaternion={WALL_QUAT_PZ}>
          <planeGeometry args={[1.5, 1.5 / (1100 / 220)]} />
          <meshStandardMaterial map={panels.warning} transparent roughness={0.8} metalness={0} />
        </mesh>
        {/* HAPPY DOUBLE on the two long OUTER side walls (±X) — likewise sheathed by
            the lid skirt until it comes off. */}
        <mesh position={[-INNER_W / 2 - WALL - 0.006, WALL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[H * 0.42, H * 0.42 / (1536 / 320)]} />
          <meshStandardMaterial map={panels.title} transparent roughness={0.8} metalness={0} />
        </mesh>
        <mesh position={[INNER_W / 2 + WALL + 0.006, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[H * 0.42, H * 0.42 / (1536 / 320)]} />
          <meshStandardMaterial map={panels.title} transparent roughness={0.8} metalness={0} />
        </mesh>
        {/* content rest anchors (flat: face up) */}
        <object3D ref={padAnchor} position={[0, PAD_THICK / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <object3D ref={cardAnchor} position={[0, PAD_THICK + CARD_THICK / 2, CARD_Z]} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
    </>
  );
}

/* Scroll-step captions under the box. Exactly one is on screen at a time: they
 * all sit at the same spot, so anything that leaves two mounted stacks them into
 * an unreadable pile. The boundaries fall in the gaps between the scene's beats
 * — the lid is clear by ~0.37, the dice are loose by ~0.63 — so the copy swaps
 * while the box is between moves. */
const CAPTIONS = [
  { eyebrow: 'The box opens', accent: GREEN, heading: 'Lid off. Contents out.' },
  { eyebrow: 'Open eyes', accent: PINK, heading: 'Two D12, in the owl’s eyes.' },
  { eyebrow: 'No risk. No run.', accent: GREEN, heading: 'Roll. Keep the higher. Push your luck.' },
];
const captionStep = (p) => (p < 0.37 ? 0 : p < 0.63 ? 1 : 2);

export default function BoxOpen3D() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  const target = useRef(prefersReducedMotion ? 0.72 : 0);
  const smooth = useRef(prefersReducedMotion ? 0.72 : 0);
  // Which caption is showing is discrete React state, not a scroll-linked opacity
  // per caption: that older approach left all three mounted on the same spot, so
  // any hiccup in the motion-value chain fell back to opacity 1 and stacked them.
  const [step, setStep] = useState(() => captionStep(prefersReducedMotion ? 0.72 : 0));

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (!prefersReducedMotion) target.current = v;
    // Captions still track scroll under reduced motion (where the scene is frozen)
    // so all the copy stays reachable. React bails out when the step is unchanged.
    setStep(captionStep(v));
  });

  const [active, setActive] = useState(true);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const caption = CAPTIONS[step];

  return (
    <section ref={sectionRef} className="relative" style={{ height: '400vh' }}>
      <div className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[130px]"
          style={{ background: `radial-gradient(circle, ${PINK} 0%, ${GREEN} 55%, transparent 75%)` }}
        />
        <Canvas
          shadows
          camera={{ position: [0, 4.4, 6.6], fov: 42 }}
          dpr={[1, 1.5]}
          frameloop={active ? 'always' : 'never'}
          performance={{ min: 0.5 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          className="!absolute inset-0"
        >
          <ProgressSmoother targetRef={target} smoothRef={smooth} />
          <Suspense fallback={null}>
            <Scene progress={smooth} />
          </Suspense>
        </Canvas>

        {/* Only the active step is mounted. `mode="wait"` holds the incoming caption
            until the outgoing one has finished fading, so the two never share the
            spot even mid-transition. */}
        <div className="pointer-events-none absolute bottom-16 left-0 right-0 text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <p className="font-body text-xs uppercase tracking-[0.22em]" style={{ color: caption.accent }}>
                {caption.eyebrow}
              </p>
              <p className="font-display mt-2 text-2xl font-bold text-[color:var(--color-text-primary)]">{caption.heading}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
