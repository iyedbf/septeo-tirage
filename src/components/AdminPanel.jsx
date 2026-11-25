import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const ADMIN_KEY = 'septeo-tirage-admin';

export default function AdminPanel({ phase, onClose, onChange }) {
  const [code, setCode] = useState(sessionStorage.getItem(ADMIN_KEY) || '');
  const [authed, setAuthed] = useState(Boolean(sessionStorage.getItem(ADMIN_KEY)));
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const isOpen = phase === 'inscription';
  const drawn = participants.filter((p) => p.hasDrawn).length;

  const logoutAdmin = () => {
    sessionStorage.removeItem(ADMIN_KEY);
    setAuthed(false);
    setParticipants([]);
  };

  const loadParticipants = useCallback(async () => {
    try {
      setParticipants((await api.admin.participants(code)).participants);
    } catch (err) {
      if (err.status === 401) logoutAdmin();
      else setError(err.message);
    }
  }, [code]);

  useEffect(() => {
    if (!authed) return undefined;
    loadParticipants();
    const id = setInterval(loadParticipants, 10000);
    return () => clearInterval(id);
  }, [authed, loadParticipants]);

  const run = async (fn, success, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError('');
    setInfo('');
    try {
      await fn();
      setInfo(success);
      onChange();
      loadParticipants();
    } catch (err) {
      setError(err.message);
      if (err.status === 401) logoutAdmin();
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.admin.verify(code);
      sessionStorage.setItem(ADMIN_KEY, code);
      setAuthed(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        <h2>Espace organisateur</h2>

        {!authed ? (
          <form onSubmit={login} className="form">
            <label>
              <span>Code organisateur</span>
              <input type="password" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
            </label>
            {error && <div className="banner banner-error">{error}</div>}
            <button className="btn btn-primary">Accéder</button>
          </form>
        ) : (
          <>
            <p className="muted">
              {isOpen
                ? `${participants.length} inscrit(s). Quand tout le monde est inscrit, valide la liste pour lancer le tirage.`
                : `Le tirage est ouvert : ${drawn} / ${participants.length} collaborateurs ont découvert leur binôme.`}
            </p>

            <div className="admin-actions">
              {isOpen ? (
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    run(() => api.admin.close(code), 'Liste validée, le tirage est ouvert ! 🎉',
                      `Valider la liste de ${participants.length} participants et ouvrir le tirage ?`)
                  }
                >
                  🔒 Valider la liste et ouvrir le tirage
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    run(() => api.admin.reopen(code), 'Inscriptions rouvertes.',
                      'Rouvrir les inscriptions annule tous les tirages déjà effectués. Continuer ?')
                  }
                >
                  ↩️ Rouvrir les inscriptions
                </button>
              )}
              <button
                className="btn btn-danger"
                onClick={() =>
                  run(() => api.admin.reset(code), 'Tout a été réinitialisé.',
                    'Supprimer TOUS les participants et repartir de zéro ?')
                }
              >
                🗑️ Tout réinitialiser
              </button>
            </div>

            {info && <div className="banner banner-ok">{info}</div>}
            {error && <div className="banner banner-error">{error}</div>}

            <h3 className="admin-list-title">Liste des inscrits ({participants.length})</h3>
            {participants.length === 0 ? (
              <p className="muted small">Aucun inscrit pour le moment.</p>
            ) : (
              <ul className="admin-list">
                {participants.map((p) => (
                  <li key={p.id}>
                    <span>{p.firstName} {p.lastName}</span>
                    {isOpen ? (
                      <button
                        className="link danger"
                        onClick={() => run(() => api.admin.remove(code, p.id), `${p.firstName} a été retiré(e).`,
                          `Retirer ${p.firstName} ${p.lastName} de la liste ?`)}
                      >
                        Retirer
                      </button>
                    ) : (
                      <span className="small muted">{p.hasDrawn ? 'Tirage fait 🎁' : 'En attente ⏳'}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button className="link admin-logout" onClick={logoutAdmin}>Se déconnecter de l’espace organisateur</button>
          </>
        )}
      </div>
    </div>
  );
}
