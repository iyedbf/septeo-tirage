export default function ParticipantList({ participants, phase, meId }) {
  const drawn = participants.filter((p) => p.hasDrawn).length;
  const isDraw = phase === 'tirage';

  return (
    <div className="card list-card">
      <div className="list-head">
        <h3>Participants</h3>
        <span className="count">{participants.length}</span>
      </div>
      <p className={`status-pill ${isDraw ? 'is-draw' : 'is-open'}`}>
        {isDraw ? '🔒 Liste validée · Tirage ouvert' : '🟢 Inscriptions ouvertes'}
      </p>

      {isDraw && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${participants.length ? (drawn / participants.length) * 100 : 0}%` }} />
          <span>{drawn} / {participants.length} ont fait leur tirage</span>
        </div>
      )}

      {participants.length === 0 ? (
        <p className="muted small empty">Personne pour l’instant… sois le premier ! ⛄</p>
      ) : (
        <ul className="names">
          {participants.map((p) => (
            <li key={p.id} className={p.id === meId ? 'me' : ''}>
              <span className="avatar">{(p.firstName[0] + p.lastName[0]).toUpperCase()}</span>
              <span className="name">
                {p.firstName} {p.lastName}
                {p.id === meId && <em> (toi)</em>}
              </span>
              {isDraw && <span className="tick" title={p.hasDrawn ? 'Tirage effectué' : 'En attente'}>{p.hasDrawn ? '🎁' : '⏳'}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
