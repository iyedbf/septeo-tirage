import { useEffect, useState } from 'react';

const EVENT_DATE = import.meta.env.VITE_EVENT_DATE ? new Date(import.meta.env.VITE_EVENT_DATE) : null;

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
    return { ...u, value: String(value).padStart(2, '0') };
  });
}

function Tiles({ parts, mystery }) {
  return (
    <div className={`countdown-tiles ${mystery ? 'is-mystery' : ''}`} role="timer" aria-live="off">
      {parts.map((p, i) => (
        <div key={p.key} className={`tile ${i % 2 === 0 ? 'tile-orange' : 'tile-navy'}`}>
          <span key={p.value} className="tile-value">{p.value}</span>
          <span className="tile-label">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function AnnouncedSoon() {
  return (
    <section className="countdown">
      <div className="countdown-text">
        <p className="countdown-tag">Restez connectés 📣</p>
        <h2>Avant l’échange des cadeaux</h2>
        <p>
          La date de l’échange des cadeaux sera <strong>annoncée très bientôt</strong>. En attendant, profite-en pour
          commencer à chercher LE cadeau idéal 🎁
        </p>
      </div>
      <Tiles parts={UNITS.map((u) => ({ ...u, value: '??' }))} mystery />
    </section>
  );
}

function LiveCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = EVENT_DATE.getTime() - now;
  const isToday = diff <= 0;
  const dateLabel = EVENT_DATE.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
      <Tiles parts={split(diff)} />
    </section>
  );
}

export default function Countdown() {
  return EVENT_DATE && !Number.isNaN(EVENT_DATE.getTime()) ? <LiveCountdown /> : <AnnouncedSoon />;
}
