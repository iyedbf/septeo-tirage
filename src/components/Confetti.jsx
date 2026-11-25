import { useMemo } from 'react';

const COLORS = ['#FF5A1F', '#13235B', '#FFB347', '#FFFFFF', '#2E4BA8', '#FFD166'];

export default function Confetti({ count = 90 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.8,
        rotate: Math.random() * 360,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
      })),
    [count],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.w,
            height: p.h,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
