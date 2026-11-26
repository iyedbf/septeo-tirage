import { useCallback, useEffect, useState } from 'react';
import { api, groupLink } from '../api.js';

export default function GroupsManager({ code }) {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    try {
      setGroups((await api.admin.groups(code)).groups);
    } catch (err) {
      setError(err.message);
    }
  }, [code]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const { group } = await api.admin.createGroup(code, form);
      setInfo(`Équipe « ${group.name} » créée. Envoie le lien et le code au manager.`);
      setForm({ name: '', code: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (g) => {
    if (!window.confirm(`Supprimer l’équipe « ${g.name} » et ses ${g.count} inscrit(s) ? Cette action est définitive.`)) return;
    setError('');
    setInfo('');
    try {
      await api.admin.deleteGroup(code, g.slug);
      setInfo(`Équipe « ${g.name} » supprimée.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const copy = async (slug) => {
    await navigator.clipboard.writeText(groupLink(slug));
    setCopied(slug);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <section className="groups">
      <h3 className="admin-list-title">Tirages d’équipe</h3>
      <p className="muted small">
        Chaque équipe a son propre lien, sa propre liste et son propre tirage, géré par le manager avec son code.
        Un collaborateur ne peut participer qu’à un seul tirage.
      </p>

      <form className="group-form" onSubmit={create}>
        <input
          placeholder="Nom de l’équipe (ex. Dev Front)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Code du manager"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          required
          minLength={4}
        />
        <button className="btn btn-primary">＋ Créer</button>
      </form>

      {info && <div className="banner banner-ok">{info}</div>}
      {error && <div className="banner banner-error">{error}</div>}

      {groups.length === 0 ? (
        <p className="muted small">Aucune équipe pour le moment.</p>
      ) : (
        <ul className="group-list">
          {groups.map((g) => (
            <li key={g.slug}>
              <div className="group-info">
                <strong>{g.name}</strong>
                <span className="small muted">
                  {g.count} inscrit(s) ·{' '}
                  {g.phase === 'inscription' ? 'Inscriptions ouvertes' : `Tirage ouvert (${g.drawnCount}/${g.count})`}
                </span>
                <code className="group-link">{groupLink(g.slug)}</code>
              </div>
              <div className="group-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => copy(g.slug)}>
                  {copied === g.slug ? 'Copié ✓' : 'Copier le lien'}
                </button>
                <a className="link" href={groupLink(g.slug)} target="_blank" rel="noreferrer">Ouvrir</a>
                <button className="link danger" onClick={() => remove(g)}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
