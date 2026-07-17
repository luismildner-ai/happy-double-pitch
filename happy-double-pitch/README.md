# Happy Double — Publisher Pitch Site

A single-page licensing pitch for the DENKRIESEN board game **HAPPY DOUBLE**,
aimed at international publishers. Built with React + Vite + Tailwind CSS +
Framer Motion, with a scroll-driven 3D box-open scene (three.js /
react-three-fiber).

---

## Run it locally

```bash
npm install
npm run dev      # start the dev server (http://localhost:5183)
npm run build    # production build into /dist
npm run preview  # preview the production build
```

> **Note on the 3D box-open:** the scroll-driven box + dice scene uses WebGL. It
> renders only in a real, foreground browser tab. Open the site in your own
> browser and scroll past the hero to see the box hinge open and the dice fly
> out. (Headless/background previews pause the animation loop, so it can look
> blank there — this is expected and does not affect real visitors.)

---

## Edit everything in ONE place: `src/content.js`

All copy, stats, image paths, the color palette, and font choices live in
[`src/content.js`](src/content.js). You should not need to touch any component
to change text or branding.

- **`theme.colors`** — the palette (`background`, `neonPink`, `neonGreen`, …).
  Changing a hex here updates the whole site (applied as CSS variables in
  `src/main.jsx`).
- **`theme.fonts`** — display + body font families. If you change these, also
  update the Google Fonts `<link>` in [`index.html`](index.html).
- **`content.*`** — every section's headline, body copy, list items, stats,
  form labels, and translations.

Dummy copy and sample translations are marked with comments (search for
`DUMMY` / `Sample`) so they're easy to find and replace.

---

## Images

Real product renders (box, scorepad, box panels) were pulled from the pitch deck
and live in [`public/images/`](public/images/). To swap any image:

1. Drop your file into `public/images/`.
2. In `src/content.js`, point the relevant `image(...)` entry at it.

### Placeholders

The `image()` helper in `content.js` takes an `isPlaceholder` flag:

- `isPlaceholder: false` → renders the real image at `src`.
- `isPlaceholder: true` → renders a labeled dark box with a neon border reading
  e.g. *"REPLACE IMAGE — hero owl/box shot — 1600×1000px"*, so you always know
  exactly what art goes where and at what size.

Set a placeholder while you wait for final art, then flip it to `false` once the
real file is in place.

### Expected / suggested art

| Slot | Current | Suggested size |
|------|---------|----------------|
| Hero box/owl shot | real (from deck) | 1600×1000 |
| Scorepad detail | real (from deck) | 1200×900 |
| Box front + back | real (from deck) | 1600×1000 |
| Owl mascot | inline SVG (replaceable) | transparent PNG cutout |
| Lifestyle / table photos | not yet placed | 1600×1000 |

The two mascot owls in the "How it plays" dice demo are drawn as an inline SVG
([`src/components/OwlCharacter.jsx`](src/components/OwlCharacter.jsx)) so the
reactive scene works out of the box. Replace it with DENKRIESEN's real mascot
cutout when available — the `mood` wiring stays the same.

---

## Project structure

```
src/
├── content.js               ← EDIT HERE: all copy, stats, images, palette, fonts
├── main.jsx                 ← applies theme colors/fonts as CSS variables
├── App.jsx                  ← section order
├── components/
│   ├── Nav.jsx
│   ├── Reveal.jsx           ← shared scroll-in animation wrapper
│   ├── ProductImage.jsx     ← real image OR labeled placeholder
│   ├── OwlCharacter.jsx     ← reactive SVG mascot (replaceable)
│   ├── DiceDemo.jsx         ← interactive push-your-luck dice + owls
│   ├── ActionCards.jsx      ← flippable action cards
│   ├── CountUp.jsx          ← animated stat counter
│   └── Footer.jsx
└── sections/
    ├── Hero.jsx
    ├── BoxOpen3D.jsx        ← scroll-driven 3D box open (three.js)
    ├── WhyPlayersLoveIt.jsx
    ├── HowItPlays.jsx       ← 5 steps + dice demo + action cards
    ├── WhyItSells.jsx       ← market pitch + animated counters
    ├── BuiltToTravel.jsx    ← localization language toggle
    ├── BackedByDenkRiesen.jsx
    └── LetsPartner.jsx      ← closing CTA + contact form
```

## Contact form

The form in "Let's partner" is front-end only — on submit it opens a prefilled
`mailto:` to `schulz@denkriesen.com`. To collect submissions server-side, wire
`handleSubmit` in [`src/sections/LetsPartner.jsx`](src/sections/LetsPartner.jsx)
to a form service (Formspree, your CRM, etc.).
