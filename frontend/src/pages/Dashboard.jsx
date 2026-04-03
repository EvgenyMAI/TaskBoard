import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjects, getTasks, getUnreadNotificationsCount } from '../api';
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const username = user?.username || '';
  const heroLetter = username ? username.charAt(0).toUpperCase() : '•';
  const [projects, setProjects] = useState([]);
  const [tasksCount, setTasksCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProjects(),
      getTasks(),
      getUnreadNotificationsCount(),
    ])
      .then(([projectList, taskList, unread]) => {
        setProjects(projectList || []);
        setTasksCount(Array.isArray(taskList) ? taskList.length : 0);
        setUnreadCount(Number(unread || 0));
      })
      .catch(() => {
        const msg = 'Не удалось загрузить данные. Попробуйте обновить страницу чуть позже.';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="container page-width dashboard-page">
        <header className="card profile-hero dashboard-hero">
          <div className="profile-hero-main">
            <div className="profile-avatar profile-avatar-projects" aria-hidden="true">{heroLetter}</div>
            <div className="profile-hero-text">
              <h1>Добро пожаловать{username ? `, ${username}` : ''}</h1>
              <p className="profile-hero-sub dashboard-hero-lead">
                Ниже — ваши проекты, задачи и уведомления. Остальное — в меню сверху.
              </p>
            </div>
          </div>
        </header>

        {error && <p className="error dashboard-global-error">{error}</p>}

        <section className="dashboard-surface" aria-labelledby="dash-summary-heading">
          <div className="dashboard-panel-head">
            <span className="dashboard-panel-kicker">Обзор</span>
            <h2 id="dash-summary-heading" className="dashboard-panel-title">Сводка</h2>
            <p className="dashboard-panel-desc muted small">Нажмите на карточку, чтобы открыть раздел</p>
          </div>
          <div className="dashboard-kpi-row">
            {loading ? (
              <>
                <Skeleton className="dashboard-kpi-skeleton" style={{ minHeight: 128 }} />
                <Skeleton className="dashboard-kpi-skeleton" style={{ minHeight: 128 }} />
                <Skeleton className="dashboard-kpi-skeleton" style={{ minHeight: 128 }} />
              </>
            ) : (
              <>
                <Link to="/projects" className="dashboard-kpi-card dashboard-kpi-card--projects">
                  <span className="dashboard-kpi-icon" aria-hidden="true">P</span>
                  <span className="dashboard-kpi-label">Проекты</span>
                  <span className="dashboard-kpi-value">{projects.length}</span>
                  <span className="dashboard-kpi-hint">доступно вам</span>
                </Link>
                <Link to="/tasks" className="dashboard-kpi-card dashboard-kpi-card--tasks">
                  <span className="dashboard-kpi-icon" aria-hidden="true">T</span>
                  <span className="dashboard-kpi-label">Задачи</span>
                  <span className="dashboard-kpi-value">{tasksCount}</span>
                  <span className="dashboard-kpi-hint">в общем списке</span>
                </Link>
                <Link
                  to="/notifications"
                  className={`dashboard-kpi-card dashboard-kpi-card--notify${unreadCount > 0 ? ' has-alert' : ''}`}
                >
                  <span className="dashboard-kpi-icon" aria-hidden="true">!</span>
                  <span className="dashboard-kpi-label">Уведомления</span>
                  <span className="dashboard-kpi-value">{unreadCount}</span>
                  <span className="dashboard-kpi-hint">непрочитанных</span>
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="dashboard-surface" aria-labelledby="dash-more-heading">
          <div className="dashboard-panel-head">
            <span className="dashboard-panel-kicker">Дополнительно</span>
            <h2 id="dash-more-heading" className="dashboard-panel-title">Другие разделы</h2>
          </div>
          <div className="dashboard-more-grid">
            <Link to="/analytics" className="dashboard-more-card dashboard-more-card--analytics">
              <span className="dashboard-more-icon" aria-hidden="true">A</span>
              <div>
                <span className="dashboard-more-title">Аналитика</span>
                <span className="dashboard-more-sub muted small">KPI, графики, CSV</span>
              </div>
              <span className="dashboard-more-arrow" aria-hidden="true">→</span>
            </Link>
            <Link to="/profile" className="dashboard-more-card dashboard-more-card--profile">
              <span className="dashboard-more-icon" aria-hidden="true">U</span>
              <div>
                <span className="dashboard-more-title">Профиль</span>
                <span className="dashboard-more-sub muted small">Данные и пароль</span>
              </div>
              <span className="dashboard-more-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="dashboard-surface" aria-labelledby="dash-projects-heading">
          <div className="dashboard-panel-head">
            <span className="dashboard-panel-kicker">Работа</span>
            <h2 id="dash-projects-heading" className="dashboard-panel-title">Недавние проекты</h2>
          </div>
          {loading ? (
            <div className="dashboard-project-grid">
              <Skeleton style={{ height: 104 }} />
              <Skeleton style={{ height: 104 }} />
              <Skeleton style={{ height: 104 }} />
            </div>
          ) : projects.length === 0 ? (
            <p className="muted dashboard-empty">
              Пока нет проектов. Создайте первый в разделе «Проекты» в меню сверху — он появится здесь.
            </p>
          ) : (
            <div className="dashboard-project-grid">
              {projects.slice(0, 6).map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="dashboard-project-card">
                  <span className="dashboard-project-card-glow" aria-hidden="true" />
                  <p className="dashboard-project-card-title">{p.name}</p>
                  <p className="dashboard-project-card-desc muted small">
                    {p.description?.trim() || 'Без описания'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
