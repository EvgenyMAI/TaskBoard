import { Link } from 'react-router-dom';

export default function DashboardMoreSection() {
  return (
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
  );
}
