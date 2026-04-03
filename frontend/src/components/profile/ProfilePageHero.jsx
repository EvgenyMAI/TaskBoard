import { roleLabel } from '../../utils/roles';

export default function ProfilePageHero({ avatarLetter, username, profile, isAdmin }) {
  return (
    <header className="card profile-hero">
      <div className="profile-hero-main">
        <div className="profile-avatar" aria-hidden="true">{avatarLetter}</div>
        <div className="profile-hero-text">
          <h1>Личный кабинет</h1>
          <div className="profile-hero-line">
            <p className="profile-hero-sub">{username || 'Пользователь'}</p>
            <div className="profile-role-chips" aria-label="Роли в системе">
              {profile?.roles?.length
                ? profile.roles.map((r) => (
                  <span key={r} className="profile-role-chip">{roleLabel(r)}</span>
                ))
                : <span className="muted small profile-role-chips-empty">Роли не назначены</span>}
            </div>
          </div>
        </div>
      </div>
      <p className="muted small profile-hero-hint">
        {isAdmin
          ? 'Имя, почта и пароль. Ниже можно менять роли пользователей.'
          : 'Имя, почта и пароль вашей учётной записи.'}
      </p>
    </header>
  );
}
