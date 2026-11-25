import { useEffect, useState } from 'react';

export const EVENT_DATE = new Date(import.meta.env.VITE_EVENT_DATE || '2026-12-18T09:00:00+01:00');

const UNITS = [
  { key: 'days', label: 'Jours', ms: 86400000 },
  { key: 'hours', label: 'Heures', ms: 3600000 },
  { key: 'minutes', label: 'Minutes', ms: 60000 },
  { key: 'seconds', label: 'Secondes', ms: 1000 },
];

function split(diff) {
  let rest = Math.max(0, diff);
  return UNITS.map((u) => {
    const value = Math.floor(rest / u.ms);
    rest -= value * u.ms;
    return { ...u, value };
  });
}

const dateLabel = EVENT_DATE.toLocaleDateString('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function Countdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = EVENT_DATE.getTime() - now;
  const parts = split(diff);
  const isToday = diff <= 0;

  return (
    <section className="countdown">
      <div className="countdown-text">
        <p className="countdown-tag">{isToday ? 'C’est le grand jour 🎉' : 'Plus que quelques dodos 💤'}</p>
        <h2>{isToday ? 'Place à l’échange des cadeaux !' : 'Avant l’échange des cadeaux'}</h2>
        <p>
          Le grand jour : <strong>{dateLabel}</strong>.{' '}
          {isToday ? 'Profitez bien de ce moment ensemble !' : 'Il reste juste assez de temps pour trouver LE cadeau.'}
        </p>
      </div>

      <div className="countdown-tiles" role="timer" aria-live="off">
        {parts.map((p, i) => (
          <div key={p.key} className={`tile ${i % 2 === 0 ? 'tile-orange' : 'tile-navy'}`}>
            <span key={p.value} className="tile-value">{String(p.value).padStart(2, '0')}</span>
            <span className="tile-label">{p.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
