import { useCallback, useEffect, useState } from 'react';
import { api, clearToken, getToken, IS_TEAM, setToken } from './api.js';
import Snow from './components/Snow.jsx';
import Garland from './components/Garland.jsx';
import Header from './components/Header.jsx';
import Steps from './components/Steps.jsx';
import Countdown from './components/Countdown.jsx';
import AuthCard from './components/AuthCard.jsx';
import WaitingCard from './components/WaitingCard.jsx';
import DrawStage from './components/DrawStage.jsx';
import StatusCard from './components/StatusCard.jsx';
import AdminPanel from './components/AdminPanel.jsx';

export default function App() {
  const [state, setState] = useState(null);
  const [me, setMe] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [offline, setOffline] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await api.state());
      setOffline(false);
      if (getToken()) {
        try {
          const data = await api.me();
          setMe(data.me);
          setReceiver(data.receiver);
        } catch (e) {
          if (e.status === 401) {
            clearToken();
            setMe(null);
            setReceiver(null);
          }
        }
      }
    } catch (e) {
      if (e.status === 404) setNotFound(true);
      else setOffline(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      if (!document.hidden) refresh();
    }, 10000);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const handleAuth = ({ token, me: participant }) => {
    setToken(token);
    setMe(participant);
    refresh();
  };

  const logout = () => {
    clearToken();
    setMe(null);
    setReceiver(null);
  };

  const phase = state?.phase;
  const count = state?.count ?? 0;

  return (
    <>
      <Snow />
      <Garland />
      <div className="app">
        <Header teamName={IS_TEAM ? state?.group?.name : null} />

        {notFound ? (
          <div className="card not-found">
            <div className="big-emoji">🧭</div>
            <h2>Ce lien de tirage n’existe pas</h2>
            <p className="muted">Il a peut-être été supprimé ou mal copié. Vérifie le lien reçu de ton manager.</p>
            <a className="btn btn-primary" href="/">Aller au tirage général</a>
          </div>
        ) : (
          <>
            <Countdown />

            {offline && <div className="banner banner-error">Connexion au serveur impossible… nouvelle tentative en cours.</div>}

            <Steps phase={phase} me={me} hasDrawn={Boolean(receiver)} />

            <main className="layout">
              <section className="main-col">
                {!state ? (
                  <div className="card center"><div className="spinner" /></div>
                ) : !me ? (
                  <AuthCard phase={phase} onAuth={handleAuth} />
                ) : phase === 'inscription' ? (
                  <WaitingCard me={me} count={count} onLogout={logout} />
                ) : (
                  <DrawStage
                    me={me}
                    receiver={receiver}
                    onDrawn={(r) => {
                      setReceiver(r);
                      refresh();
                    }}
                    onLogout={logout}
                  />
                )}
              </section>

              <aside className="side-col">
                <StatusCard count={count} drawnCount={state?.drawnCount ?? 0} phase={phase} me={me} />
              </aside>
            </main>
          </>
        )}

        <footer className="footer">
          <span>© {new Date().getFullYear()} Septeo Tunisia · Joyeuses fêtes à toutes et à tous ✨</span>
          <button className="link" onClick={() => setShowAdmin(true)}>Espace organisateur</button>
        </footer>
      </div>

      {showAdmin && (
        <AdminPanel phase={phase} groupName={state?.group?.name} onClose={() => setShowAdmin(false)} onChange={refresh} />
      )}
    </>
  );
}
