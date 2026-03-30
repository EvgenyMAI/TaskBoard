import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUnreadNotificationsCount } from '../api';
import { roleLabels } from '../utils/roles';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let timerId;

    const refreshUnread = () => {
      getUnreadNotificationsCount()
        .then((count) => setUnreadCount(Number(count || 0)))
        .catch(() => setUnreadCount(0));
    };

    refreshUnread();
    timerId = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshUnread();
    }, 8000);

    return () => window.clearInterval(timerId);
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navLink = (to, label) => {
    const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
    return (
      <Link to={to} className={active ? 'active' : ''}>
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-brand-wrap">
          {navLink('/', 'TaskBoard')}
        </div>
        <button
          type="button"
          className="nav-toggle secondary"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Открыть меню"
        >
          ☰
        </button>
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navLink('/projects', 'Проекты')}
          {navLink('/tasks', 'Задачи')}
          <Link to="/notifications" className={location.pathname.startsWith('/notifications') ? 'active' : ''}>
            Уведомления
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </Link>
          {navLink('/profile', 'Профиль')}
          <span className="nav-user">
            {user?.username}
            {user?.roles?.length ? ` (${roleLabels(user.roles).join(', ')})` : ''}
          </span>
          <button type="button" className="secondary" onClick={logout}>
            Выйти
          </button>
        </div>
      </nav>
      <main className="main">{children}</main>
    </>
  );
}
