export default function TasksPageHeader({
  heroLetter,
  username,
  loading,
  tasksCount,
  showCreate,
  onToggleCreate,
}) {
  return (
    <header className="card profile-hero tasks-hero">
      <div className="profile-hero-main">
        <div className="profile-avatar profile-avatar-tasks" aria-hidden="true">{heroLetter}</div>
        <div className="profile-hero-text">
          <h1>Задачи</h1>
          <div className="profile-hero-line">
            <p className="profile-hero-sub">
              {username ? `Все ваши задачи, ${username}` : 'Отфильтруйте по проекту, статусу или исполнителю'}
            </p>
            <div className="profile-role-chips" aria-live="polite">
              <span className="profile-chip-metric">
                {loading ? 'Загрузка…' : `Задач: ${tasksCount}`}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="profile-hero-hint profile-hero-hint-row">
        <p className="muted small profile-hero-hint-text">
          В карточке задачи — комментарии, файлы и история изменений.
        </p>
        <button type="button" onClick={onToggleCreate}>
          {showCreate ? 'Отмена' : '+ Создать задачу'}
        </button>
      </div>
    </header>
  );
}
