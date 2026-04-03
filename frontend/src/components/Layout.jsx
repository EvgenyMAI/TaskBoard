import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ANALYTICS_API, getToken, getUnreadNotificationsCount } from '../api';
import { roleLabels } from '../utils/roles';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const refreshUnread = () => {
      getUnreadNotificationsCount()
        .then((count) => setUnreadCount(Number(count || 0)))
        .catch(() => setUnreadCount(0));
    };

    refreshUnread();

    const onChanged = () => refreshUnread();
    window.addEventListener('notifications:changed', onChanged);

    const token = getToken();
    let es;
    let timerId;
    const startPollingFallback = () => {
      if (timerId) return;
      timerId = window.setInterval(() => {
        if (document.visibilityState === 'visible') refreshUnread();
      }, 8000);
    };
    if (token && user?.userId) {
      try {
        es = new EventSource(`${ANALYTICS_API}/notifications/stream?access_token=${encodeURIComponent(token)}`);
        es.addEventListener('notification', (evt) => {
          try {
            const dto = JSON.parse(evt.data);
            if (dto && dto.read === false) setUnreadCount((v) => v + 1);
          } catch {
            // ignore parse errors
          }
        });
        es.onerror = () => {
          try {
            if (es) es.close();
          } catch {}
          startPollingFallback();
        };
      } catch {
        startPollingFallback();
      }
    }

    return () => {
      window.removeEventListener('notifications:changed', onChanged);
      if (es) es.close();
      if (timerId) window.clearInterval(timerId);
    };
  }, [user?.userId]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  const navPill = (to, label) => (
    <Link to={to} className={`nav-pill ${isActive(to) ? 'is-active' : ''}`}>
      {label}
    </Link>
  );

  const routes = (
    <>
      {navPill('/projects', 'Проекты')}
      {navPill('/tasks', 'Задачи')}
      {navPill('/analytics', 'Аналитика')}
      <Link
        to="/notifications"
        className={`nav-pill ${isActive('/notifications') ? 'is-active' : ''}`}
      >
        Уведомления
        {unreadCount > 0 && (
          <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </Link>
      {navPill('/profile', 'Профиль')}
    </>
  );

  return (
    <>
      <nav className="app-nav" aria-label="Основная навигация">
        <div className="nav-bar">
          <div className="nav-brand-slot">
            <Link
              to="/"
              className={`nav-brand ${isActive('/') ? 'is-active' : ''}`}
            >
              <span className="nav-brand-mark" aria-hidden="true">TB</span>
              <span className="nav-brand-name">TaskBoard</span>
            </Link>
          </div>

          <div
            id="nav-main-menu"
            className={`nav-center ${menuOpen ? 'is-open' : ''}`}
          >
            <div className="nav-rail" role="navigation" aria-label="Разделы приложения">
              {routes}
            </div>
          </div>

          <div className="nav-end">
            <div className="nav-trail">
              <span className="nav-user-chip" title={user?.username || ''}>
                <span className="nav-user-name">{user?.username}</span>
                {user?.roles?.length ? (
                  <span className="nav-user-roles muted small">
                    {roleLabels(user.roles).join(', ')}
                  </span>
                ) : null}
              </span>
              <button type="button" className="secondary nav-logout" onClick={logout}>
                Выйти
              </button>
            </div>
            <button
              type="button"
              className="nav-toggle secondary"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="nav-main-menu"
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>
      <main className="main">{children}</main>
    </>
  );
}
