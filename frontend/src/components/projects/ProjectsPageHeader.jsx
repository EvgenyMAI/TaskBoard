export default function ProjectsPageHeader({
  heroLetter,
  username,
  loading,
  projectsCount,
  isAdminOrManager,
  onCreateClick,
}) {
  return (
    <header className="card profile-hero projects-hero">
      <div className="profile-hero-main">
        <div className="profile-avatar profile-avatar-projects" aria-hidden="true">{heroLetter}</div>
        <div className="profile-hero-text">
          <h1>Проекты</h1>
          <div className="profile-hero-line">
            <p className="profile-hero-sub">
              {username
                ? `Ваши проекты, ${username}`
                : 'Задачи сгруппированы по проектам — откройте нужный'}
            </p>
            <div className="profile-role-chips" aria-live="polite">
              <span className="profile-chip-metric">
                {loading ? 'Загрузка…' : `Проектов: ${projectsCount}`}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="profile-hero-hint profile-hero-hint-row">
        <p className="muted small profile-hero-hint-text">
          {isAdminOrManager
            ? 'Создайте проект и пригласите команду — всё настраивается в карточке проекта.'
            : 'Откройте проект, в котором вы участник, чтобы увидеть задачи.'}
        </p>
        {isAdminOrManager && (
          <button type="button" onClick={onCreateClick}>
            + Создать проект
          </button>
        )}
      </div>
    </header>
  );
}
