const STEPS = [
  { icon: '✍️', title: 'Inscription', text: 'Ajoute ton nom à la liste' },
  { icon: '🔒', title: 'Clôture', text: "L'organisateur valide la liste" },
  { icon: '🎲', title: 'Tirage', text: 'Découvre ton collaborateur' },
  { icon: '🎁', title: 'Cadeau', text: 'Offre-lui une surprise' },
];

export default function Steps({ phase, me, hasDrawn }) {
  let current = 0;
  if (me) current = 1;
  if (phase === 'tirage') current = 2;
  if (hasDrawn) current = 3;

  return (
    <ol className="steps">
      {STEPS.map((s, i) => (
        <li key={s.title} className={i < current ? 'done' : i === current ? 'active' : ''}>
          <span className="step-icon">{i < current ? '✓' : s.icon}</span>
          <div>
            <strong>{s.title}</strong>
            <small>{s.text}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}
