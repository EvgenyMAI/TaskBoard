import { Link } from 'react-router-dom';
import Skeleton from '../Skeleton';

export default function DashboardRecentProjectsSection({ loading, projects }) {
  return (
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
              <p className="dashboard-project-card-desc">
                {p.description?.trim() || 'Без описания'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
