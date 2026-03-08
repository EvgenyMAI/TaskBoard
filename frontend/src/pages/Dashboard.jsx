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
        const msg = 'Не удалось загрузить данные. Проверьте, что backend-сервисы запущены.';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="container page-width">
        <div className="hero card">
          <h1>Привет, {user?.username}!</h1>
          <p className="muted">
            Здесь рабочее пространство команды. Создавай проекты, управляй задачами и отслеживай изменения.
          </p>
          <div className="hero-actions">
            <Link to="/projects" className="hero-action">Открыть проекты</Link>
            <Link to="/tasks" className="hero-action">Открыть задачи</Link>
            <Link to="/notifications" className="hero-action secondary">Уведомления</Link>
          </div>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card card">
            <p className="stat-label">Проекты</p>
            <p className="stat-value">{loading ? '...' : projects.length}</p>
          </div>
          <div className="stat-card card">
            <p className="stat-label">Задачи</p>
            <p className="stat-value">{loading ? '...' : tasksCount}</p>
          </div>
          <div className="stat-card card">
            <p className="stat-label">Непрочитанные</p>
            <p className="stat-value">{loading ? '...' : unreadCount}</p>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="card">
          <div className="page-header">
            <h2>Последние проекты</h2>
            <Link to="/projects" className="btn-link">Перейти к проектам →</Link>
          </div>
          {loading ? (
            <div className="project-grid">
              <Skeleton style={{ height: 90 }} />
              <Skeleton style={{ height: 90 }} />
              <Skeleton style={{ height: 90 }} />
            </div>
          ) : projects.length === 0 ? (
            <p className="muted">Проектов пока нет. Создайте первый в разделе «Проекты».</p>
          ) : (
            <div className="project-grid">
              {projects.slice(0, 6).map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="project-tile">
                  <p className="project-tile-title">{p.name}</p>
                  <p className="muted small project-tile-desc">
                    {p.description?.trim() || 'Без описания'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
