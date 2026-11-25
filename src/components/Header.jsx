export default function Header() {
  return (
    <header className="hero">
      <div className="logo-badge">
        <img src="/logo.png" alt="Septeo Tunisia" />
      </div>
      <div className="hero-text">
        <p className="eyebrow">Édition des fêtes {new Date().getFullYear()}</p>
        <h1>
          Le <span className="accent">Tirage au Sort</span> des cadeaux
        </h1>
        <p className="subtitle">
          Inscris-toi, découvre le collaborateur à qui tu vas offrir un cadeau… et garde le secret jusqu’au grand jour ! 🎁
        </p>
      </div>
      <div className="stripes" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
    </header>
  );
}
