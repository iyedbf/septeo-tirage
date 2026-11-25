import { useState } from 'react';
import { api } from '../api.js';

export default function AuthCard({ phase, onAuth }) {
  const closed = phase !== 'inscription';
  const [mode, setMode] = useState(closed ? 'login' : 'register');
  const [form, setForm] = useState({ firstName: '', lastName: '', pin: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register' && !closed;
  const update = (key) => (e) =>
    setForm({ ...form, [key]: key === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 4) : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      onAuth(isRegister ? await api.register(form) : await api.login(form));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <div className="card-ribbon" aria-hidden="true" />
      <h2>{isRegister ? 'Rejoins le tirage au sort 🎄' : 'Content de te revoir ⭐'}</h2>
      <p className="muted">
        {isRegister
          ? 'Saisis ton prénom, ton nom et choisis un code secret à 4 chiffres. Il te servira à te reconnecter et à faire ton tirage.'
          : closed
            ? 'Les inscriptions sont closes. Connecte-toi avec ton nom et ton code secret pour faire ton tirage.'
            : 'Connecte-toi avec le nom et le code secret choisis lors de ton inscription.'}
      </p>

      <form onSubmit={submit} className="form">
        <div className="row">
          <label>
            <span>Prénom</span>
            <input value={form.firstName} onChange={update('firstName')} placeholder="ex. Sarra" required autoComplete="given-name" />
          </label>
          <label>
            <span>Nom</span>
            <input value={form.lastName} onChange={update('lastName')} placeholder="ex. Ben Ali" required autoComplete="family-name" />
          </label>
        </div>
        <label>
          <span>Code secret (4 chiffres)</span>
          <input
            className="pin"
            value={form.pin}
            onChange={update('pin')}
            inputMode="numeric"
            type="password"
            placeholder="••••"
            required
            pattern="\d{4}"
          />
        </label>

        {error && <div className="banner banner-error">{error}</div>}

        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Un instant…' : isRegister ? "Je m'inscris" : 'Me connecter'}
        </button>
      </form>

      {!closed && (
        <button className="link switch" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>
          {isRegister ? 'Déjà inscrit ? Se reconnecter' : "Pas encore inscrit ? S'inscrire"}
        </button>
      )}
    </div>
  );
}
