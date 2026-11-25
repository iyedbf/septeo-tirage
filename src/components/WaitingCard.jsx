export default function WaitingCard({ me, count, onLogout }) {
  return (
    <div className="card waiting-card">
      <div className="card-ribbon" aria-hidden="true" />
      <div className="big-emoji">🎄</div>
      <h2>Bienvenue {me.firstName}, tu es inscrit(e) !</h2>
      <p className="muted">
        Ton nom fait partie des <strong>{count}</strong> participant{count > 1 ? 's' : ''} du tirage au sort.
        Dès que l’organisateur aura validé la liste, le tirage s’ouvrira automatiquement sur cette page.
      </p>
      <div className="waiting-dots" aria-label="En attente">
        <span /><span /><span />
      </div>
      <p className="small muted">En attente de la clôture des inscriptions…</p>
      <button className="link" onClick={onLogout}>Ce n’est pas moi</button>
    </div>
  );
}
