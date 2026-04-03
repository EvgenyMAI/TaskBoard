export default function DashboardHero({ username, heroLetter }) {
  return (
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
  );
}
