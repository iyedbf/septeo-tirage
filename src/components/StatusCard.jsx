export default function StatusCard({ count, drawnCount, phase, me }) {
  const isDraw = phase !== 'inscription';

  return (
    <div className="card list-card">
      <div className="list-head">
        <h3>Participants</h3>
        <span className="count">{count}</span>
      </div>
      <p className={`status-pill ${isDraw ? 'is-draw' : 'is-open'}`}>
        {isDraw ? '🔒 Liste validée · Tirage ouvert' : '🟢 Inscriptions ouvertes'}
      </p>

      {isDraw && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${count ? (drawnCount / count) * 100 : 0}%` }} />
          <span>{drawnCount} / {count} ont fait leur tirage</span>
        </div>
      )}

      <div className="secret-box">
        <span className="secret-icon">🤫</span>
        <p>
          {count === 0
            ? 'Personne pour l’instant… sois le premier ! ⛄'
            : `${count} collaborateur${count > 1 ? 's ont' : ' a'} déjà rejoint l’aventure. La liste reste secrète pour garder la surprise !`}
        </p>
      </div>

      {me && (
        <p className="me-pill">
          <span className="avatar">{(me.firstName[0] + me.lastName[0]).toUpperCase()}</span>
          Tu es inscrit(e) en tant que <strong>{me.firstName} {me.lastName}</strong>
        </p>
      )}
    </div>
  );
}
