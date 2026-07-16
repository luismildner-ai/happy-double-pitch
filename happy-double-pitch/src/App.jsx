import { lazy, Suspense } from 'react';
import Nav from './components/Nav.jsx';
import Hero from './sections/Hero.jsx';
import WhyPlayersLoveIt from './sections/WhyPlayersLoveIt.jsx';
import HowItPlays from './sections/HowItPlays.jsx';
import WhyItSells from './sections/WhyItSells.jsx';
import BuiltToTravel from './sections/BuiltToTravel.jsx';
import BackedByDenkRiesen from './sections/BackedByDenkRiesen.jsx';
import LetsPartner from './sections/LetsPartner.jsx';
import Footer from './components/Footer.jsx';

// The 3D box-open pulls in three.js (~350KB gzip). Lazy-load it so the hero
// paints immediately and the WebGL bundle only downloads as the user scrolls in.
const BoxOpen3D = lazy(() => import('./sections/BoxOpen3D.jsx'));

// Page order (BoxOpen3D is the scroll-driven bridge between the hero and the
// content sections). Reorder these freely — each section is self-contained.
export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
          <BoxOpen3D />
        </Suspense>
        <WhyPlayersLoveIt />
        <HowItPlays />
        <WhyItSells />
        <BuiltToTravel />
        <BackedByDenkRiesen />
        <LetsPartner />
      </main>
      <Footer />
    </>
  );
}
