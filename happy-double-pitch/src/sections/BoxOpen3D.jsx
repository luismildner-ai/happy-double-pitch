import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Edges, Environment } from '@react-three/drei';
import {
  TextureLoader,
  SRGBColorSpace,
  MathUtils,
  Vector3,
  Quaternion,
  Euler,
  DodecahedronGeometry,
  CanvasTexture,
} from 'three';
import { useScroll, useTransform, useMotionValueEvent, motion } from 'framer-motion';
import { theme } from '../content.js';

/*
 * SCROLL-DRIVEN 3D — "THE BOX OPENS" (modeled on the real product photos)
 * -------------------------------------------------------------------------
 * Built from the owner's reference photos (IMG_8238–8242):
 *   - The LID holds the two D12 dice behind the owl's transparent eye-domes.
 *   - The BOX BOTTOM is a real open box with interior depth: pink insert with
 *     a card bay (deck of action cards), green ribbon, and an open felt zone.
 *   - The DICE are matte black D12s with green outlined numbers (6 and 9
 *     underlined) and the pink owl face on one side — reproduced as canvas
 *     decals on each pentagonal face.
 *
 * Choreography as you scroll (progress p 0 → 1):
 *   1. p 0.00–0.22  Closed box. Dice tumble behind the eye-domes.
 *   2. p 0.22–0.48  Lid lifts off; the bottom tips flat, revealing the
 *                   interior. Camera cranes down to look inside.
 *   3. p 0.46–0.68  The card deck and the scorepad block FLY OUT of the box
 *                   and park floating beside it.
 *   4. p 0.62–0.85  The dice drop from the lid INTO the open box, bounce on
 *                   the felt, and come to rest.
 *   5. p 0.85–1.00  Settle. Final caption.
 *
 * All geometry is procedural; textures are the rectified box front, the real
 * card back, and the real scorepad. Scrubbing is damped (ProgressSmoother)
 * for the Apple-style glide.
 */

const FRONT_TEXTURE = '/images/box-front-flat.png';
const CARD_TEXTURE = '/images/card-back.png';
const PAD_TEXTURE = '/images/scorepad.png';
const PINK = theme.colors.neonPink;
const GREEN = theme.colors.neonGreen;
const INSERT_PINK = '#d81b7f'; // the interior insert's magenta (ref photo 8239)
const FELT_GREEN = '#7aa321'; // the tray felt (ref photo 8240)

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Box dimensions (world units). Portrait game box, split into lid + bottom.
const W = 2.6;
const H = 3.6;
const LID_D = 0.45;
const TRAY_D = 0.5;
const WALL = 0.07;

// Eye-dome anchors — verified visually with circle overlays on the artwork
// (see scratchpad markers2.mjs): these sit dead-center on the eye windows.
// Slightly asymmetric because the rectified art itself leans a touch.
// Verified via pixel composite (scratchpad composite.mjs → /tmp/composite3):
// discs seat perfectly in the printed rings at these coordinates.
const EYE_L = { x: -0.452, y: 0.655, z: LID_D / 2 + 0.02 };
const EYE_R = { x: 0.572, y: 0.638, z: LID_D / 2 + 0.02 };
const DOME_R = 0.43;
const DIE_R = 0.24;
// In-eye visuals are IMPOSTORS: discs cut straight out of the hero render
// (the painted dice showing 10 and 7 through the glass), so the eyes look
// exactly like the first box. The 3D dice only appear when they launch.
const EYE_IMPOSTOR_L = '/images/eye-die-left.png';
const EYE_IMPOSTOR_R = '/images/eye-die-right.png';

// Open-state targets.
const LID_OPEN = { x: 0, y: 1.75, z: 0.35, rotX: -0.55 };
const TRAY_OPEN = { x: 0, y: -1.5, z: 0.75, rotX: -1.45 }; // lying flat, opening up

// Dice land INSIDE the box, resting on the felt (y tuned to the smaller die).
const LAND_L = { x: -0.45, y: -1.42, z: 1.08 };
const LAND_R = { x: 0.5, y: -1.43, z: 0.95 };

// Where the contents park after flying out.
const CARD_PARK = { pos: [-2.35, 0.15, 1.3], rot: [-0.2, 0.3, 0.05] };
const PAD_PARK = { pos: [2.35, -0.1, 1.2], rot: [-0.25, -0.3, -0.05] };

// Phase timing. Cards leave first (they sit on top of the scorepad block),
// then the block, then the dice drop into the emptied box.
const OPEN_START = 0.22, OPEN_END = 0.48;
const CARD_OUT = [0.44, 0.6];
const PAD_OUT = [0.5, 0.68];
const DROP_START = 0.66, DROP_END = 0.88;

const phase = (p, a, b) => MathUtils.clamp((p - a) / (b - a), 0, 1);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------------------------------------------------------------- dice --- */

// Canvas decal for one die face: bold green number with dark outline (6 and 9
// underlined, like the real die) — or the pink owl face on the "1" side.
function makeFaceTexture(label) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  if (label === 'owl') {
    // simplified owl mark: pink head, green eye rings, black pupils, beak
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
    // ear tufts
    ctx.fillStyle = '#e5148c';
    ctx.beginPath(); ctx.moveTo(36, 44); ctx.lineTo(28, 22); ctx.lineTo(50, 34); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(92, 44); ctx.lineTo(100, 22); ctx.lineTo(78, 34); ctx.closePath(); ctx.fill();
  } else {
    // pure green fill, large — matches the reference video of the real die
    ctx.font = '900 78px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#A6E22E';
    ctx.fillText(label, 64, 58);
    if (label === '6' || label === '9') {
      // underline so orientation is unambiguous — the real die does this
      ctx.fillRect(42, 104, 44, 9);
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Printed side panel for the box (spine / edges): near-black card stock with
// the green frame line, optional vertical "HAPPY DOUBLE" spine text — matches
// the real box's sides so the 3D box reads like the hero render, not CG.
function makePanelTexture(wPx, hPx, { label = '' } = {}) {
  const c = document.createElement('canvas');
  c.width = wPx;
  c.height = hPx;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0c0c0c';
  ctx.fillRect(0, 0, wPx, hPx);
  // subtle print-noise so the surface isn't a dead flat color
  for (let i = 0; i < (wPx * hPx) / 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
    ctx.fillRect(Math.random() * wPx, Math.random() * hPx, 2, 2);
  }
  // green frame line, inset like the real box edges
  const inset = Math.min(wPx, hPx) * 0.16;
  const rad = Math.min(wPx, hPx) * 0.12;
  ctx.strokeStyle = '#9ccb2b';
  ctx.lineWidth = Math.max(3, Math.min(wPx, hPx) * 0.045);
  ctx.beginPath();
  ctx.roundRect(inset, inset, wPx - inset * 2, hPx - inset * 2, rad);
  ctx.stroke();
  if (label) {
    // vertical spine text, reading bottom-to-top like the real spine
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

// White pill label with pink text — the "WÜRFEL-ZONE" marking printed on the
// real tray (reference video IMG_8244).
function makeZoneLabel() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f7f7';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 80, 40);
  ctx.fill();
  ctx.font = '900 44px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e5148c';
  ctx.letterSpacing = '4px';
  ctx.fillText('WÜRFEL-ZONE', 256, 50);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// Pentagon face centers + orientations of a dodecahedron, for decal placement.
function computeD12Faces(radius) {
  const geo = new DodecahedronGeometry(radius);
  const pos = geo.getAttribute('position');
  const norm = geo.getAttribute('normal');
  const groups = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${norm.getX(i).toFixed(2)},${norm.getY(i).toFixed(2)},${norm.getZ(i).toFixed(2)}`;
    if (!groups.has(key)) groups.set(key, { n: new Vector3(norm.getX(i), norm.getY(i), norm.getZ(i)).normalize(), verts: new Map() });
    const g = groups.get(key);
    const vk = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!g.verts.has(vk)) g.verts.set(vk, new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
  }
  geo.dispose();
  return [...groups.values()].map((g) => {
    const c = new Vector3();
    g.verts.forEach((v) => c.add(v));
    c.divideScalar(g.verts.size);
    return {
      position: c.add(g.n.clone().multiplyScalar(0.004)),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), g.n),
    };
  });
}

const FACE_LABELS = ['owl', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/* Damped scrub — the "Apple feel". */
function ProgressSmoother({ targetRef, smoothRef }) {
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-delta * 5.5);
    smoothRef.current += (targetRef.current - smoothRef.current) * k;
  });
  return null;
}

/* Camera dolly: cranes up + in and tips down to look into the open box. */
function CameraRig({ progress }) {
  useFrame((state) => {
    const t = easeInOut(phase(progress.current, OPEN_START, 0.8));
    state.camera.position.set(0, MathUtils.lerp(0, 2.3, t), MathUtils.lerp(7.5, 6.3, t));
    state.camera.lookAt(0, MathUtils.lerp(0, -0.6, t), 0);
  });
  return null;
}

/* A D12 with numbered faces that rests in the eye-dome (number facing out,
 * like the printed box), then drops INTO the box when the lid comes off. */
function Die({ anchorRef, landing, progress, seed, restLabel = '10' }) {
  const ref = useRef();
  const releasePos = useRef(null);
  const v = useMemo(() => new Vector3(), []);
  const faces = useMemo(() => computeD12Faces(DIE_R), []);
  const textures = useMemo(() => FACE_LABELS.map(makeFaceTexture), []);
  // Rest orientation: rotate the die so the `restLabel` face points at the
  // camera — the real box shows a readable number in each eye (10 and 7).
  const restQuat = useMemo(() => {
    const idx = Math.max(0, FACE_LABELS.indexOf(restLabel));
    return faces[idx].quaternion.clone().invert();
  }, [faces, restLabel]);

  useFrame((state, delta) => {
    const die = ref.current;
    if (!die || !anchorRef.current) return;
    const p = progress.current;
    const tDrop = phase(p, DROP_START, DROP_END);

    if (tDrop <= 0) {
      // While resting in the eye, the painted impostor disc IS the die —
      // keep the 3D die hidden, parked at the anchor, number facing out, so
      // the swap at launch is seamless.
      die.visible = false;
      anchorRef.current.getWorldPosition(v);
      die.position.copy(v);
      die.quaternion.copy(restQuat);
      releasePos.current = null;
    } else {
      die.visible = true;
      if (!releasePos.current) {
        anchorRef.current.getWorldPosition(v);
        releasePos.current = v.clone();
      }
      const s = releasePos.current;
      die.position.x = MathUtils.lerp(s.x, landing.x, easeOut(tDrop));
      die.position.z = MathUtils.lerp(s.z, landing.z, easeOut(tDrop));
      let y = MathUtils.lerp(s.y, landing.y, tDrop * tDrop); // gravity-ish fall
      if (tDrop > 0.72) {
        const b = (tDrop - 0.72) / 0.28; // damped bounce on the felt
        y += Math.abs(Math.sin(b * Math.PI * 2)) * (1 - b) * 0.14;
      }
      die.position.y = y;
      const settle = 1 - phase(p, 0.86, 0.97);
      die.rotation.x += delta * (6 * (1 - tDrop) + 0.2) * seed.a * settle;
      die.rotation.y += delta * (5 * (1 - tDrop) + 0.15) * seed.b * settle;
      die.scale.setScalar(MathUtils.lerp(1, 1.25, easeOut(tDrop)));
    }
  });

  return (
    <group ref={ref}>
      {/* matte black body — like the real die: soft sheen, faint facet edges */}
      <mesh>
        <dodecahedronGeometry args={[DIE_R]} />
        <meshStandardMaterial color="#131313" roughness={0.38} metalness={0.15} envMapIntensity={0.9} />
        <Edges threshold={12} color="#2a2a2a" scale={1.001} />
      </mesh>
      {/* per-face number decals */}
      {faces.map((f, i) => (
        <mesh key={i} position={f.position} quaternion={f.quaternion}>
          <planeGeometry args={[DIE_R * 0.74, DIE_R * 0.74]} />
          <meshBasicMaterial map={textures[i]} transparent toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
    </group>
  );
}

/* In-eye die impostor: the exact painted dome disc from the hero render
 * (glass sheen + die + number baked in). Unlit material so the artwork's own
 * lighting is preserved 1:1. Fades out the instant the 3D die launches. */
function EyeDieImpostor({ eye, url, progress }) {
  const matRef = useRef();
  const map = useLoader(TextureLoader, url);
  map.colorSpace = SRGBColorSpace;
  useFrame(() => {
    const fade = 1 - phase(progress.current, DROP_START, DROP_START + 0.05);
    if (matRef.current) matRef.current.opacity = fade;
  });
  return (
    <mesh position={[eye.x, eye.y, eye.z + 0.005]}>
      {/* 1.06 = disc slightly overlaps the printed ring's inner edge, hiding
          any seam — the factor verified in the pixel composite */}
      <circleGeometry args={[DOME_R * 1.06, 48]} />
      <meshBasicMaterial ref={matRef} map={map} transparent toneMapped={false} />
    </mesh>
  );
}

/* Box contents (card deck / scorepad block): sit inside the box tracking an
 * anchor, then fly out to a floating park position beside the box. */
function FlyOutItem({ anchorRef, park, out, progress, size, textureUrl, sideColor, parkScale = 1.18, texQuarterTurn = false }) {
  const ref = useRef();
  const release = useRef(null);
  const v = useMemo(() => new Vector3(), []);
  const q = useMemo(() => new Quaternion(), []);
  const parkQ = useMemo(() => new Quaternion().setFromEuler(new Euler(...park.rot)), [park]);
  const map = useLoader(TextureLoader, textureUrl);
  map.colorSpace = SRGBColorSpace;
  if (texQuarterTurn) {
    // landscape artwork on a portrait face (the scorepad fills the tray)
    map.center.set(0.5, 0.5);
    map.rotation = Math.PI / 2;
  }

  useFrame((state) => {
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
      const s = release.current;
      item.position.set(
        MathUtils.lerp(s.pos.x, park.pos[0], t),
        MathUtils.lerp(s.pos.y, park.pos[1], t) + Math.sin(t * Math.PI) * 0.5, // arc up and over
        MathUtils.lerp(s.pos.z, park.pos[2], t)
      );
      item.quaternion.slerpQuaternions(s.quat, parkQ, t);
      item.scale.setScalar(MathUtils.lerp(1, parkScale, t));
      // gentle float once parked
      if (t >= 1 && !prefersReducedMotion) item.position.y = park.pos[1] + Math.sin(state.clock.elapsedTime * 1.4) * 0.05;
    }
  });

  // boxGeometry material order: +x -x +y -y +z -z ; artwork on the +z face.
  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial attach="material-0" color={sideColor} roughness={0.7} />
        <meshStandardMaterial attach="material-1" color={sideColor} roughness={0.7} />
        <meshStandardMaterial attach="material-2" color={sideColor} roughness={0.7} />
        <meshStandardMaterial attach="material-3" color={sideColor} roughness={0.7} />
        <meshStandardMaterial attach="material-4" map={map} roughness={0.55} />
        <meshStandardMaterial attach="material-5" color={sideColor} roughness={0.7} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------- scene --- */

function Scene({ progress }) {
  const assemblyRef = useRef();
  const lidRef = useRef();
  const trayRef = useRef();
  const anchorL = useRef();
  const anchorR = useRef();
  const cardAnchor = useRef();
  const padAnchor = useRef();
  const texture = useLoader(TextureLoader, FRONT_TEXTURE);
  texture.colorSpace = SRGBColorSpace;

  // Printed side panels (created once): spine with vertical title on the left,
  // plain framed panels for the right/top/bottom edges — like the real box.
  const panels = useMemo(
    () => ({
      spine: makePanelTexture(256, 2048, { label: 'HAPPY DOUBLE' }),
      side: makePanelTexture(256, 2048),
      edge: makePanelTexture(2048, 360),
      zone: makeZoneLabel(),
    }),
    []
  );

  useFrame((state) => {
    const p = progress.current;
    const tOpen = easeInOut(phase(p, OPEN_START, OPEN_END));

    if (assemblyRef.current) {
      const idle = 1 - tOpen;
      assemblyRef.current.rotation.y = MathUtils.lerp(-0.4, 0, tOpen);
      assemblyRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 1.3) * 0.05 * idle * (prefersReducedMotion ? 0 : 1);
    }
    if (lidRef.current) {
      lidRef.current.position.set(
        MathUtils.lerp(0, LID_OPEN.x, tOpen),
        MathUtils.lerp(0, LID_OPEN.y, tOpen),
        MathUtils.lerp(0.25, LID_OPEN.z + 0.25, tOpen)
      );
      lidRef.current.rotation.x = MathUtils.lerp(0, LID_OPEN.rotX, tOpen);
    }
    if (trayRef.current) {
      trayRef.current.position.set(
        MathUtils.lerp(0, TRAY_OPEN.x, tOpen),
        MathUtils.lerp(0, TRAY_OPEN.y, tOpen),
        MathUtils.lerp(-0.25, TRAY_OPEN.z, tOpen)
      );
      trayRef.current.rotation.x = MathUtils.lerp(0, TRAY_OPEN.rotX, tOpen);
    }
  });

  const IW = W * 0.97; // tray outer width
  const IH = H * 0.97; // tray outer height

  return (
    <>
      {/* World-space actors (they track anchors inside the moving parts, so
          they must NOT be children of the transformed groups). */}
      <Die anchorRef={anchorL} landing={LAND_L} progress={progress} seed={{ a: 1.3, b: 0.9 }} restLabel="10" />
      <Die anchorRef={anchorR} landing={LAND_R} progress={progress} seed={{ a: -1.0, b: 1.4 }} restLabel="7" />
      <FlyOutItem
        anchorRef={cardAnchor}
        park={CARD_PARK}
        out={CARD_OUT}
        progress={progress}
        size={[0.95, 1.35, 0.28]}
        textureUrl={CARD_TEXTURE}
        sideColor={INSERT_PINK}
      />
      <FlyOutItem
        anchorRef={padAnchor}
        park={PAD_PARK}
        out={PAD_OUT}
        progress={progress}
        // the scorepad block fills the box interior and lies under the cards,
        // exactly like the real game (reference video IMG_8244)
        size={[2.31, 3.28, 0.08]}
        textureUrl={PAD_TEXTURE}
        sideColor="#e8e8e8"
        parkScale={0.48}
        texQuarterTurn
      />

      <group ref={assemblyRef}>
        {/* ---- LID: front shell with the owl art, domes, dice aboard.
             Per-face printed panels (no CG edge glow — the real box has none):
             boxGeometry material order is +x, -x, +y, -y, +z, -z. ---- */}
        <group ref={lidRef} position={[0, 0, 0.25]}>
          <mesh>
            <boxGeometry args={[W, H, LID_D]} />
            <meshStandardMaterial attach="material-0" map={panels.side} roughness={0.55} />
            <meshStandardMaterial attach="material-1" map={panels.spine} roughness={0.55} />
            <meshStandardMaterial attach="material-2" map={panels.edge} roughness={0.55} />
            <meshStandardMaterial attach="material-3" map={panels.edge} roughness={0.55} />
            <meshStandardMaterial attach="material-4" color="#0a0a0a" roughness={0.6} />
            <meshStandardMaterial attach="material-5" color="#0a0a0a" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, LID_D / 2 + 0.011]}>
            <planeGeometry args={[W * 0.98, H * 0.98]} />
            <meshStandardMaterial map={texture} roughness={0.5} toneMapped={false} />
          </mesh>
          {/* pink dice-compartment interior under the lid ("Fach für die Würfel") */}
          <mesh position={[0, 0, -LID_D / 2 - 0.011]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[W * 0.94, H * 0.94]} />
            <meshStandardMaterial color={INSERT_PINK} roughness={0.7} />
          </mesh>
          <EyeDieImpostor eye={EYE_L} url={EYE_IMPOSTOR_L} progress={progress} />
          <EyeDieImpostor eye={EYE_R} url={EYE_IMPOSTOR_R} progress={progress} />
          <object3D ref={anchorL} position={[EYE_L.x, EYE_L.y, EYE_L.z]} />
          <object3D ref={anchorR} position={[EYE_R.x, EYE_R.y, EYE_R.z]} />
        </group>

        {/* ---- BOTTOM: open box with real interior depth ---- */}
        <group ref={trayRef} position={[0, 0, -0.25]}>
          {/* floor */}
          <mesh position={[0, 0, -TRAY_D / 2 + WALL / 2]}>
            <boxGeometry args={[IW, IH, WALL]} />
            <meshStandardMaterial color="#0c0c0c" roughness={0.7} />
          </mesh>
          {/* walls: black outside, feather-pink INSIDE like the real tray
              (per-face materials; inner faces get the insert pink) */}
          <mesh position={[-IW / 2 + WALL / 2, 0, 0]}>
            <boxGeometry args={[WALL, IH, TRAY_D]} />
            <meshStandardMaterial attach="material-0" color={INSERT_PINK} roughness={0.65} />
            {['material-1', 'material-2', 'material-3', 'material-4', 'material-5'].map((m) => (
              <meshStandardMaterial key={m} attach={m} color="#0c0c0c" roughness={0.7} />
            ))}
          </mesh>
          <mesh position={[IW / 2 - WALL / 2, 0, 0]}>
            <boxGeometry args={[WALL, IH, TRAY_D]} />
            <meshStandardMaterial attach="material-1" color={INSERT_PINK} roughness={0.65} />
            {['material-0', 'material-2', 'material-3', 'material-4', 'material-5'].map((m) => (
              <meshStandardMaterial key={m} attach={m} color="#0c0c0c" roughness={0.7} />
            ))}
          </mesh>
          <mesh position={[0, IH / 2 - WALL / 2, 0]}>
            <boxGeometry args={[IW - WALL * 2, WALL, TRAY_D]} />
            <meshStandardMaterial attach="material-3" color={INSERT_PINK} roughness={0.65} />
            {['material-0', 'material-1', 'material-2', 'material-4', 'material-5'].map((m) => (
              <meshStandardMaterial key={m} attach={m} color="#0c0c0c" roughness={0.7} />
            ))}
          </mesh>
          <mesh position={[0, -IH / 2 + WALL / 2, 0]}>
            <boxGeometry args={[IW - WALL * 2, WALL, TRAY_D]} />
            <meshStandardMaterial attach="material-2" color={INSERT_PINK} roughness={0.65} />
            {['material-0', 'material-1', 'material-3', 'material-4', 'material-5'].map((m) => (
              <meshStandardMaterial key={m} attach={m} color="#0c0c0c" roughness={0.7} />
            ))}
          </mesh>

          {/* interior: green felt across the whole floor (the Würfel-Zone) */}
          <mesh position={[0, 0, -TRAY_D / 2 + WALL + 0.005]}>
            <planeGeometry args={[IW - WALL * 2.4, IH - WALL * 2.4]} />
            <meshStandardMaterial color={FELT_GREEN} roughness={1} />
          </mesh>
          {/* printed WÜRFEL-ZONE pill near the front edge of the felt */}
          <mesh position={[0, -IH / 2 + 0.45, -TRAY_D / 2 + WALL + 0.012]}>
            <planeGeometry args={[1.1, 0.21]} />
            <meshStandardMaterial map={panels.zone} transparent roughness={0.9} />
          </mesh>

          {/* content anchors, stacked like the real box: the scorepad block
              lies flat on the felt, the card deck sits on top of it */}
          <object3D ref={padAnchor} position={[0, 0, -TRAY_D / 2 + WALL + 0.045]} />
          <object3D ref={cardAnchor} position={[0, 0, -TRAY_D / 2 + WALL + 0.045 + 0.04 + 0.14]} />
        </group>
      </group>
    </>
  );
}

export default function BoxOpen3D() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const target = useRef(prefersReducedMotion ? 0.9 : 0);
  const smooth = useRef(prefersReducedMotion ? 0.9 : 0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (!prefersReducedMotion) target.current = v;
  });

  const capIntro = useTransform(scrollYProgress, [0, 0.14, 0.24], [1, 1, 0]);
  const capOpen = useTransform(scrollYProgress, [0.3, 0.42, 0.58], [0, 1, 0]);
  const capRoll = useTransform(scrollYProgress, [0.72, 0.85, 1], [0, 1, 1]);

  return (
    <section ref={sectionRef} className="relative" style={{ height: '400vh' }}>
      <div className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[130px]"
          style={{
            background: `radial-gradient(circle, ${PINK} 0%, ${GREEN} 55%, transparent 75%)`,
          }}
        />

        <Canvas
          camera={{ position: [0, 0, 7.5], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          className="!absolute inset-0"
        >
          {/* Studio-style lighting matched to the hero render: neutral key +
              soft fill, with only a whisper of brand-colored rim. */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 5, 6]} intensity={2.4} />
          <directionalLight position={[-4, 2, 4]} intensity={0.9} color="#fff0f8" />
          <pointLight position={[-5, 0, 3]} intensity={25} color={PINK} distance={14} />
          <pointLight position={[5, -1, 3]} intensity={22} color={GREEN} distance={14} />
          {/* Environment reflections (glass domes, dice sheen). Own Suspense:
              if the HDR fetch fails, the scene still renders with the lights. */}
          <Suspense fallback={null}>
            <Environment preset="studio" environmentIntensity={0.35} />
          </Suspense>
          <ProgressSmoother targetRef={target} smoothRef={smooth} />
          <CameraRig progress={smooth} />
          <Suspense fallback={null}>
            <Scene progress={smooth} />
          </Suspense>
        </Canvas>

        <motion.div style={{ opacity: capIntro }} className="pointer-events-none absolute bottom-16 left-0 right-0 text-center">
          <p className="font-body text-xs uppercase tracking-[0.22em]" style={{ color: GREEN }}>
            The owl keeps the dice
          </p>
          <p className="font-display mt-2 text-2xl font-bold text-[color:var(--color-text-primary)]">
            Two D12, right in its eyes.
          </p>
        </motion.div>

        <motion.div style={{ opacity: capOpen }} className="pointer-events-none absolute bottom-16 left-0 right-0 text-center">
          <p className="font-body text-xs uppercase tracking-[0.22em]" style={{ color: PINK }}>
            Open it up
          </p>
          <p className="font-display mt-2 text-2xl font-bold text-[color:var(--color-text-primary)]">
            Cards out. Scorepad out. The box is the arena.
          </p>
        </motion.div>

        <motion.div style={{ opacity: capRoll }} className="pointer-events-none absolute bottom-16 left-0 right-0 text-center">
          <p className="font-body text-xs uppercase tracking-[0.22em]" style={{ color: GREEN }}>
            No risk. No run.
          </p>
          <p className="font-display mt-2 text-2xl font-bold text-[color:var(--color-text-primary)]">
            Roll. Keep the higher. Push your luck.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
