export default function Garland({ bulbs = 28 }) {
  return (
    <div className="garland" aria-hidden="true">
      <svg className="garland-wire" viewBox="0 0 1000 40" preserveAspectRatio="none">
        <path d="M0 6 Q 50 34 100 6 T 200 6 T 300 6 T 400 6 T 500 6 T 600 6 T 700 6 T 800 6 T 900 6 T 1000 6" />
      </svg>
      <div className="bulbs">
        {Array.from({ length: bulbs }, (_, i) => (
          <span key={i} className={`bulb bulb-${i % 3}`} style={{ animationDelay: `${(i % 6) * 0.25}s` }} />
        ))}
      </div>
    </div>
  );
}
