// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH
// Edit copy, stats, image paths, palette, and fonts here. Nothing else in the
// codebase should hardcode brand colors, fonts, or on-page text.
// ---------------------------------------------------------------------------

// THEME ----------------------------------------------------------------------
// Applied at runtime as CSS custom properties (see src/main.jsx). Change a hex
// value here and it updates everywhere the site references var(--color-*).
export const theme = {
  colors: {
    background: '#0A0A0A',
    backgroundElevated: '#121212',
    surface: '#161616',
    surfaceBorder: 'rgba(255, 255, 255, 0.08)',
    neonPink: '#EC0A8C',
    neonGreen: '#A6E22E',
    textPrimary: '#F5F5F5',
    textMuted: '#9CA3AF',
  },
  fonts: {
    // Loaded via Google Fonts <link> in index.html.
    // Montserrat (not Sora): Sora's uppercase "Y" is asymmetric by design at
    // heavy weights — its right diagonal is a full straight stroke while the
    // left is cut short, which reads as a broken/warped glyph in a wordmark.
    // Montserrat's Y is a clean, symmetric geometric form at the same weight.
    display: "'Montserrat', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
};

// IMAGE HELPER ----------------------------------------------------------------
// isPlaceholder: true  -> renders a labeled dark/neon placeholder box.
// isPlaceholder: false -> renders the real <img> at src.
// Three images below (hero box, box back, scorepad) are REAL renders pulled
// from the DenkRiesen pitch deck (HappyDouble_5Slide_Pitch_EN.pptx) — safe to
// ship as-is, or swap for higher-res press photography later.
const image = (src, label, width, height, alt, isPlaceholder = true) => ({
  src,
  isPlaceholder,
  label,
  width,
  height,
  alt,
});

export const content = {
  meta: {
    title: 'Happy Double — Publisher Pitch | DENKRIESEN',
    description:
      'HAPPY DOUBLE: a fast, addictive push-your-luck dice game from DENKRIESEN. Licensing pitch for international publishers.',
  },

  nav: {
    logoText: 'HAPPY DOUBLE',
    cta: 'For Publishers',
  },

  hero: {
    eyebrow: 'For International Publishers',
    title: 'HAPPY DOUBLE',
    tagline: 'NO RISK. NO RUN.',
    hook: 'A fast, addictive push-your-luck dice game everyone will play again and again.',
    specs: ['2–8 Players', '~20 Min', 'Ages 8+', '2× D12 · Cards · Scorepad'],
    ctaLabel: 'See the pitch',
    ctaTarget: '#why-it-sells',
    image: image(
      '/images/box-hero-owl.png',
      'Hero box/owl shot',
      1600,
      1000,
      'Happy Double box art featuring the neon owl mascot with dice for eyes',
      false // real asset from deck
    ),
  },

  whyPlayersLoveIt: {
    eyebrow: 'Why Players Love It',
    title: 'The "just one more roll" effect.',
    points: [
      {
        title: 'Instant tension',
        body: 'Stop anytime or push your luck — greed can wipe the whole round.',
      },
      {
        title: 'Big reactions',
        body: 'Cheers, groans, and clutch owl saves at the table, every round.',
      },
      {
        title: 'Easy to teach',
        body: 'The core rule lands in about 30 seconds. No rulebook required.',
      },
      {
        title: 'High replay value',
        body: '20 Action Cards plus a bonus zone mean new stories every play.',
      },
    ],
  },

  howItPlays: {
    eyebrow: 'How It Plays',
    title: '30 seconds to learn.',
    steps: [
      {
        n: '01',
        title: 'Roll',
        body: 'Roll 2× D12 dice and keep the higher result.',
      },
      {
        n: '02',
        title: 'Write',
        body: 'Each number can only be used once per round — roll a duplicate and the owl strikes: round wiped.',
      },
      {
        n: '03',
        title: 'Decide',
        body: 'Push your luck for more, or bank your points and stay safe.',
      },
      {
        n: '04',
        title: 'Double',
        body: 'Roll doubles to trigger an Action Card: protect, push, or disrupt.',
      },
      {
        n: '05',
        title: 'Race',
        body: 'First player to 222 points wins.',
      },
    ],
    diceDemo: {
      title: 'Try the push-your-luck moment',
      body: 'Roll both dice. The higher number counts — but roll a duplicate and the owl wipes your round.',
      rollLabel: 'Roll the dice',
      rollingLabel: 'Rolling…',
      keepLabel: 'Keep',
      wipeoutTitle: 'THE OWL STRIKES!',
      wipeoutBody: 'Duplicate rolled — round wiped.',
    },
    actionCards: {
      title: 'Flip an Action Card',
      body: 'Doubles trigger a card. Three archetypes: protect, push, or disrupt.',
      cards: [
        {
          tag: 'Protect',
          front: 'Gold Shield',
          color: 'neonGreen',
          back: 'Note a point. Blocks one zero on any value this round — a safety net when you push too far.',
        },
        {
          tag: 'Push',
          front: 'Double or Nothing',
          color: 'neonPink',
          back: 'Note a point, then double all points in your current round. Roll zero and it is all gone.',
        },
        {
          tag: 'Disrupt',
          front: 'Stop',
          color: 'neonPink',
          back: 'Note a point, then force one active player to end their turn immediately — their points stay, their turn is over.',
        },
      ],
    },
    componentsImage: image(
      '/images/scorepad.png',
      'Scorepad detail',
      1200,
      900,
      'Happy Double scorepad showing round tracking and risk zone',
      false // real asset from deck
    ),
    // "In the box" feature row — DenkRiesen-style photo cards with pill labels.
    componentsTitle: "What's in the box",
    components: [
      {
        label: '2× D12 Dice',
        sublabel: 'Keep the higher',
        image: image('/images/cards-dice-table.png', 'Dice + cards shot', 1600, 1000, 'Two black D12 dice with neon-green numbers', false),
      },
      {
        label: '20 Action Cards',
        sublabel: 'Protect · push · disrupt',
        image: image('/images/card-back.png', 'Action card back', 1000, 1400, 'Happy Double action card back with owl', false),
      },
      {
        label: 'Scorepad + Tray',
        sublabel: 'Race to 222',
        image: image('/images/scorepad.png', 'Scorepad', 1200, 900, 'Happy Double scorepad', false),
      },
    ],
  },

  whyItSells: {
    eyebrow: 'Why It Sells',
    title: 'Built for the shelf. Built for the table.',
    points: [
      {
        title: 'Push-your-luck is trending',
        body: 'One of the fastest-growing mechanics in modern retail board games.',
      },
      {
        title: 'A shelf magnet',
        body: 'The neon look and iconic owl mascot stand out from across the aisle.',
      },
      {
        title: 'A great demo game',
        body: 'Teach it in 2 minutes, play a full round in about 20 — ideal for in-store demos.',
      },
      {
        title: 'Broad appeal',
        body: 'Families, casual groups, and party crowds all pick it up instantly.',
      },
      {
        title: 'Highly photogenic',
        body: 'Built for social media — neon-on-black shots perform.',
      },
    ],
    stats: [
      { value: 8, suffix: '', label: 'Max players' },
      { value: 20, suffix: '', label: 'Minutes per game' },
      { value: 20, suffix: '', label: 'Action cards' },
      { value: 222, suffix: '', label: 'Target score to win' },
    ],
    boxBackImage: image(
      '/images/box-front-back.png',
      'Box front + back',
      1600,
      1000,
      'Happy Double box front and back panels',
      false // real asset from deck
    ),
  },

  builtToTravel: {
    eyebrow: 'Built to Travel',
    title: 'Localizes fast. Adapts to any market.',
    body: 'Happy Double is light on text and heavy on icons — the rules, cards, and scorepad translate quickly and affordably into a new language and market. Toggle below to see a sample.',
    languages: [
      {
        code: 'EN',
        label: 'English',
        sample: {
          tagline: 'NO RISK. NO RUN.',
          card: 'Double or Nothing',
          instruction: 'Roll 2 dice. Keep the higher number.',
        },
      },
      {
        code: 'DE',
        label: 'Deutsch',
        sample: {
          tagline: 'KEIN RISIKO. KEIN SPASS.',
          card: 'Alles oder Nichts',
          instruction: 'Wirf 2 Würfel. Behalte die höhere Zahl.',
        },
      },
      {
        code: 'FR',
        label: 'Français',
        sample: {
          tagline: 'SANS RISQUE, SANS FUITE.',
          card: 'Quitte ou Double',
          instruction: 'Lancez 2 dés. Gardez le nombre le plus haut.',
        },
      },
    ],
  },

  backedByDenkRiesen: {
    eyebrow: 'Backed by DENKRIESEN',
    title: 'Wir machen die Spiele.',
    subtitle: '— "We make the games."',
    body: 'DENKRIESEN is a German board game publisher with a catalog built on sharp, accessible design and games people actually keep playing. Happy Double is designed by Christopher Manuel and developed in-house from concept to shelf-ready product.',
    facts: [
      { label: 'Designer', value: 'Christopher Manuel' },
      { label: 'Publisher', value: 'DENKRIESEN' },
      { label: 'Origin market', value: 'Germany' },
      { label: 'Status', value: 'Available for international licensing' },
    ],
  },

  letsPartner: {
    eyebrow: "Let's Partner",
    title: 'Bring Happy Double to your market.',
    body: 'Next step: a short playtest — 30–45 minutes, 2–4 people — plus a look at partnership options for your territory.',
    contactEmail: 'schulz@denkriesen.com',
    form: {
      nameLabel: 'Name',
      emailLabel: 'Email',
      messageLabel: 'Message',
      messagePlaceholder: 'Tell us about your market and what you’d like to see next.',
      submitLabel: 'Request a sample / playtest',
    },
  },

  footer: {
    copy: `© ${new Date().getFullYear()} DENKRIESEN. Happy Double is a trademark of DENKRIESEN.`,
  },
};

export { image };
