import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Confetti from './Confetti.jsx';

const ROLL_MS = 2600;

export default function DrawStage({ me, receiver, participants, onDrawn, onLogout }) {
  const [stage, setStage] = useState(receiver ? 'revealed' : 'idle');
  const [rolling, setRolling] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(receiver);
  const timer = useRef();

  useEffect(() => {
    if (receiver && stage === 'idle') {
      setResult(receiver);
      setStage('revealed');
    }
  }, [receiver, stage]);

  useEffect(() => () => clearInterval(timer.current), []);

  const names = participants.filter((p) => p.id !== me.id).map((p) => `${p.firstName} ${p.lastName}`);

  const draw = async () => {
    setError('');
    setStage('rolling');
    let i = 0;
    timer.current = setInterval(() => {
      setRolling(names.length ? names[i++ % names.length] : '…');
    }, 90);
    try {
      const [data] = await Promise.all([api.draw(), new Promise((r) => setTimeout(r, ROLL_MS))]);
      clearInterval(timer.current);
      setResult(data.receiver);
      setStage('opening');
      setTimeout(() => {
        setStage('revealed');
        onDrawn(data.receiver);
      }, 900);
    } catch (err) {
      clearInterval(timer.current);
      setError(err.message);
      setStage('idle');
    }
  };

  return (
    <div className="card draw-card">
      <div className="card-ribbon" aria-hidden="true" />
      <div className="draw-head">
        <h2>
          {stage === 'revealed' ? 'Ton tirage est fait ! 🎉' : `À toi de jouer, ${me.firstName} !`}
        </h2>
        <button className="link" onClick={onLogout}>Changer d’utilisateur</button>
      </div>

      {stage !== 'revealed' && (
        <p className="muted">
          La liste est validée. Clique sur le cadeau pour découvrir le collaborateur à qui tu vas offrir une surprise.
          Tu ne peux pas tomber sur toi-même 😉
        </p>
      )}

      <div className={`gift-zone stage-${stage}`}>
        {stage !== 'revealed' ? (
          <>
            <button className="gift" onClick={draw} disabled={stage !== 'idle'} aria-label="Ouvrir le cadeau">
              <span className="gift-lid">
                <span className="bow bow-left" />
                <span className="bow bow-right" />
              </span>
              <span className="gift-box">
                <span className="gift-ribbon-v" />
                <span className="gift-stripes" />
              </span>
            </button>
            <div className="roll-ticket">
              {stage === 'idle' && <span className="hint">Clique sur le cadeau ✨</span>}
              {stage === 'rolling' && <span className="rolling">{rolling}</span>}
              {stage === 'opening' && <span className="rolling">🎁</span>}
            </div>
          </>
        ) : (
          <div className="reveal">
            <Confetti />
            <p className="reveal-label">Tu offres un cadeau à</p>
            <p className="reveal-name">
              {result?.firstName} <span>{result?.lastName}</span>
            </p>
            <div className="reveal-tips">
              <p>🤫 Chut ! Garde le secret jusqu’à la remise des cadeaux.</p>
              <p>📌 Tu peux revenir sur le site à tout moment pour revoir ce nom.</p>
            </div>
          </div>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}
    </div>
  );
}
