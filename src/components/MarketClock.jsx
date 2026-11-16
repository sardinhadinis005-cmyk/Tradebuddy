import { useEffect, useState } from 'react';
import { sessionInfo, formatCountdown } from '../features/marketTime.js';

export default function MarketClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => { if (!document.hidden) setNow(new Date()); };
    const id = setInterval(tick, 10000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const info = sessionInfo(now);
  return (
    <div className={`market-clock mc-${info.key.replace('-', '')}`} title="Weekdays only. Exchange holidays and early closes are not included. Updates every 10 seconds while visible.">
      <span className="mc-dot" aria-hidden="true"></span>
      <span className="mc-main"><b>{info.label}</b><span className="mc-detail"> · {info.etTime} ET</span></span>
      <span className="mc-detail mc-next">{info.nextLabel} in {formatCountdown(info.minutesToNext)}</span>
    </div>
  );
}
