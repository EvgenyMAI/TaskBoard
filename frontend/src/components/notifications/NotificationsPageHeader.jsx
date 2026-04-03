export default function NotificationsPageHeader({
  heroLetter,
  username,
  unreadCount,
  markingAll,
  onMarkAllRead,
}) {
  return (
    <header className="card profile-hero">
      <div className="profile-hero-main">
        <div className="profile-avatar profile-avatar-notifications" aria-hidden="true">{heroLetter}</div>
        <div className="profile-hero-text">
          <h1>Уведомления</h1>
          <div className="profile-hero-line">
            <p className="profile-hero-sub">
              {username ? `${username}, ваша лента событий` : 'Назначения, статусы и другие изменения по задачам'}
            </p>
            <div className="profile-role-chips" aria-live="polite">
              {unreadCount > 0 ? (
                <span className="profile-role-chip notifications-unread-pill">
                  Непрочитанных: {unreadCount}
                </span>
              ) : (
                <span className="muted small profile-role-chips-empty">Все прочитано</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="profile-hero-hint profile-hero-hint-row">
        <p className="muted small profile-hero-hint-text">
          Новые события появляются здесь сами — обновлять страницу не нужно.
        </p>
        <button
          type="button"
          className="secondary small"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0 || markingAll}
        >
          {markingAll ? '…' : 'Все прочитанными'}
        </button>
      </div>
    </header>
  );
}
