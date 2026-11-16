import { useEffect, useState } from 'react';
import { sessionInfo, formatCountdown } from '../features/marketTime.js';

export default function MarketClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const info = sessionInfo(now);
  return (
    <div className={`market-clock mc-${info.key.replace('-', '')}`} title="Weekdays only. Exchange holidays and early closes are not included.">
      <span className="mc-dot" aria-hidden="true"></span>
      <span className="mc-main"><b>{info.label}</b><span className="mc-detail"> · {info.etTime} ET</span></span>
      <span className="mc-detail mc-next">{info.nextLabel} in {formatCountdown(info.minutesToNext)}</span>
    </div>
  );
}
