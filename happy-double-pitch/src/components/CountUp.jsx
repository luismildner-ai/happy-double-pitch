import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/*
 * Counts a number up from 0 to `value` the first time it scrolls into view.
 * Uses IntersectionObserver + rAF. Respects reduced motion (jumps to final).
 */
export default function CountUp({ value, duration = 1400, className = '' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let raf;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
          setDisplay(Math.round(eased * value));
          if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
