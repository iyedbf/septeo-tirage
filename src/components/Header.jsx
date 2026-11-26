export default function Header({ teamName }) {
  return (
    <header className="hero">
      <div className="logo-badge">
        <img src="/logo.png" alt="Septeo Tunisia" />
      </div>
      <div className="hero-text">
        <p className="eyebrow">Édition des fêtes {new Date().getFullYear()}</p>
        {teamName && <p className="team-badge">👥 Équipe {teamName}</p>}
        <h1>
          Le <span className="accent">Tirage au Sort</span> des cadeaux
        </h1>
        <p className="subtitle">
          {teamName
            ? `Un tirage rien que pour l’équipe ${teamName} : inscris-toi, découvre le collègue à qui tu vas offrir un cadeau… et garde le secret ! 🎁`
            : 'Inscris-toi, découvre le collaborateur à qui tu vas offrir un cadeau… et garde le secret jusqu’au grand jour ! 🎁'}
        </p>
      </div>
      <div className="stripes" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
    </header>
  );
}
