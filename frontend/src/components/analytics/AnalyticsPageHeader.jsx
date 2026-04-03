export default function AnalyticsPageHeader({ heroLetter, username, periodChip }) {
  return (
    <header className="card profile-hero analytics-hero">
      <div className="profile-hero-main">
        <div className="profile-avatar profile-avatar-analytics" aria-hidden="true">{heroLetter}</div>
        <div className="profile-hero-text">
          <h1>Аналитика</h1>
          <div className="profile-hero-line">
            <p className="profile-hero-sub">
              {username ? `Сводки и отчёты, ${username}` : 'Цифры по задачам и проектам за выбранный период'}
            </p>
            <div className="profile-role-chips" aria-label="Выбранный период">
              <span className="profile-role-chip analytics-period-chip">{periodChip}</span>
            </div>
          </div>
        </div>
      </div>
      <p className="muted small profile-hero-hint">
        Статусы, проекты и исполнители наглядно. Отчёт можно скачать файлом для Excel.
      </p>
    </header>
  );
}
