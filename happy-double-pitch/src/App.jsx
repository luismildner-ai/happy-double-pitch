import Nav from './components/Nav.jsx';
import Hero from './sections/Hero.jsx';
import BoxRibbonPull from './sections/BoxRibbonPull.jsx';
import WhyPlayersLoveIt from './sections/WhyPlayersLoveIt.jsx';
import HowItPlays from './sections/HowItPlays.jsx';
import WhyItSells from './sections/WhyItSells.jsx';
import BuiltToTravel from './sections/BuiltToTravel.jsx';
import BackedByDenkRiesen from './sections/BackedByDenkRiesen.jsx';
import LetsPartner from './sections/LetsPartner.jsx';
import Footer from './components/Footer.jsx';

// Page order. BoxRibbonPull is the drag-to-open box interaction bridging the
// hero and the content sections. (The old WebGL BoxOpen3D scene still lives in
// ./sections/BoxOpen3D.jsx — swap the import/usage back to restore it.)
export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <BoxRibbonPull />
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
