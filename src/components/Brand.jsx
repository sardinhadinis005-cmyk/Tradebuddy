import { useEffect, useRef, useState } from 'react';
import { advanceRibbon, ease, ribbonFrame } from '../features/ribbonMotion.js';
import './brand.css';

function useMedia(query) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query), update = () => setMatches(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export default function Brand({ open = false, onToggle }) {
  const mobile = useMedia('(max-width: 900px)');
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const target = !mobile || open ? 1 : 0;
  const progress = useRef(target);
  const initial = useRef(null);
  if (!initial.current) initial.current = ribbonFrame(target);
  const outlines = useRef([]), bodies = useRef([]), tips = useRef([]), word = useRef(null);
  useEffect(() => {
    let frame = 0, last = null;
    const paint = () => {
      ribbonFrame(progress.current).forEach((band, i) => {
        outlines.current[i]?.setAttribute('d', band.outline);
        bodies.current[i]?.setAttribute('d', band.body);
        tips.current[i]?.setAttribute('cx', band.tip[0]);
        tips.current[i]?.setAttribute('cy', band.tip[1]);
      });
      if (word.current) {
        word.current.style.maxWidth = `${130 * ease(progress.current)}px`;
        word.current.style.opacity = ease(Math.max(0, (progress.current - .45) / .55));
      }
    };
    const tick = now => {
      const elapsed = last == null ? 0 : Math.min(64, now - last);
      last = now;
      progress.current = advanceRibbon(progress.current, target, elapsed);
      paint();
      if (progress.current !== target) frame = requestAnimationFrame(tick);
    };
    if (reduced) progress.current = target;
    paint();
    if (progress.current !== target) frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced, mobile]);
  const Root = mobile ? 'button' : 'span';
  const control = mobile ? { id: 'brand-menu-toggle', type: 'button', onClick: onToggle, 'aria-expanded': open, 'aria-controls': 'side-drawer', 'aria-label': open ? 'Close navigation' : 'Open navigation' } : { role: 'img', 'aria-label': 'Tradebuddy' };
  return <Root className="tb-identity" {...control}>
    <svg className="tb-emblem" viewBox="0 0 174 174" aria-hidden="true" focusable="false">
      {initial.current.map((band, i) => <g key={i}>
        <path ref={node => { outlines.current[i] = node; }} d={band.outline} fill="none" stroke="#0e151c" strokeWidth="23.125" strokeLinejoin="round" />
        <path ref={node => { bodies.current[i] = node; }} d={band.body} fill={i === 0 ? '#66e7a6' : '#83ffc0'} />
        <circle ref={node => { tips.current[i] = node; }} cx={band.tip[0]} cy={band.tip[1]} r="1.5625" fill="#e4ffef" />
      </g>)}
    </svg>
    <span ref={word} className="tb-word" aria-hidden="true">adebuddy<span className="accent">.</span></span>
  </Root>;
}
