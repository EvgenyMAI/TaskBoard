import { Link } from 'react-router-dom';
import Skeleton from '../Skeleton';

export default function DashboardSummarySection({ loading, projectsCount, tasksCount, unreadCount }) {
  return (
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
              <span className="dashboard-kpi-value">{projectsCount}</span>
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
  );
}
