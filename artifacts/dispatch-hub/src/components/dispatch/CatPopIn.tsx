import { useEffect, useState, type CSSProperties } from 'react';
import { CatSticker } from './CatSticker';

const spots: CSSProperties[] = [
  { top: '82px', right: '18px' },
  { top: '34%', left: '14px' },
  { bottom: '72px', right: '18px' },
  { bottom: '22%', left: '14px' },
];

type PopState = { id: number; spot: number };

/** Occasional decorative cat that pops in at the edge of the viewport without blocking controls. */
export function CatPopIn() {
  const [pop, setPop] = useState<PopState | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    let showTimer: number;
    let hideTimer: number | undefined;
    let lastSpot = -1;
    let id = 0;
    const schedule = (delay: number) => {
      showTimer = window.setTimeout(() => {
        let spot = Math.floor(Math.random() * spots.length);
        while (spot === lastSpot) spot = Math.floor(Math.random() * spots.length);
        lastSpot = spot;
        setPop({ id: ++id, spot });
        hideTimer = window.setTimeout(() => setPop(null), 2300);
        schedule(9500 + Math.random() * 6500);
      }, delay);
    };
    schedule(5200);
    return () => {
      window.clearTimeout(showTimer);
      if (hideTimer !== undefined) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!pop) return null;
  return (
    <span className="dh-cat-pop-in" style={spots[pop.spot]} key={pop.id} aria-hidden="true">
      <CatSticker pose={pop.id % 2 ? 'wink' : 'smile'} className="dh-cat-pop-face" />
      <span className="dh-cat-pop-sparkle">✦</span>
    </span>
  );
}
