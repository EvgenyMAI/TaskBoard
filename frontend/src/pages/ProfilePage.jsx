import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { changeMyPassword, getMyProfile, getUsers, updateMyProfile, updateUserRoles } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import FormField from '../components/FormField';
import Skeleton from '../components/Skeleton';
import { roleLabel } from '../utils/roles';

const PASSWORD_CHANGE_PHRASE = 'I_CONFIRM_PASSWORD_CHANGE';
const ADMIN_USERS_PAGE_SIZE = 12;

export default function ProfilePage() {
  const { updateUserIdentity } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmationPhrase, setConfirmationPhrase] = useState('');

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [touched, setTouched] = useState({});

  const [rolesPanelOpen, setRolesPanelOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState(null);
  /** После успешной загрузки списка не запрашиваем снова при повторном раскрытии (есть «Обновить»). */
  const adminUsersCacheOkRef = useRef(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminUserPage, setAdminUserPage] = useState(1);
  const [rolesSaving, setRolesSaving] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameError = username.trim().length < 2 ? 'Минимум 2 символа' : '';
  const emailError = !emailRegex.test(email.trim()) ? 'Введите корректный email' : '';
  const newPasswordError = newPassword && newPassword.length < 6 ? 'Минимум 6 символов' : '';
  const phraseError = confirmationPhrase && confirmationPhrase !== PASSWORD_CHANGE_PHRASE
    ? 'Кодовая фраза введена неверно'
    : '';

  useEffect(() => {
    setLoading(true);
    setError('');
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setUsername(data.username || '');
        setEmail(data.email || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = profile?.roles?.includes('ADMIN');

  const loadAdminUsers = useCallback((opts = {}) => {
    const { force = false } = opts;
    if (!isAdmin) return;
    if (!force && adminUsersCacheOkRef.current) return;
    setAdminUsersLoading(true);
    setAdminUsersError(null);
    getUsers()
      .then((list) => {
        setAdminUsers(Array.isArray(list) ? list : []);
        adminUsersCacheOkRef.current = true;
      })
      .catch((e) => {
        setAdminUsersError(e.message);
        if (!force) adminUsersCacheOkRef.current = false;
      })
      .finally(() => setAdminUsersLoading(false));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !rolesPanelOpen) return;
    loadAdminUsers({ force: false });
  }, [isAdmin, rolesPanelOpen, loadAdminUsers]);

  useEffect(() => {
    setAdminUserPage(1);
  }, [adminUserSearch]);

  const getPrimaryRole = (roles) => {
    const r = Array.isArray(roles) ? roles : [];
    if (r.includes('ADMIN')) return 'ADMIN';
    if (r.includes('MANAGER')) return 'MANAGER';
    return 'EXECUTOR';
  };

  const filteredAdminUsers = useMemo(() => {
    const q = adminUserSearch.trim().toLowerCase();
    if (!q) return adminUsers;
    return adminUsers.filter((u) => {
      const un = (u.username || '').toLowerCase();
      const em = (u.email || '').toLowerCase();
      return un.includes(q) || em.includes(q);
    });
  }, [adminUsers, adminUserSearch]);

  const adminUsersTotalPages = Math.max(1, Math.ceil(filteredAdminUsers.length / ADMIN_USERS_PAGE_SIZE));

  useEffect(() => {
    setAdminUserPage((p) => Math.min(p, adminUsersTotalPages));
  }, [adminUsersTotalPages]);

  const adminUserPageSafe = Math.min(adminUserPage, adminUsersTotalPages);
  const paginatedAdminUsers = useMemo(() => {
    const start = (adminUserPageSafe - 1) * ADMIN_USERS_PAGE_SIZE;
    return filteredAdminUsers.slice(start, start + ADMIN_USERS_PAGE_SIZE);
  }, [filteredAdminUsers, adminUserPageSafe]);

  const handleUpdateRoles = async (userId, nextRole) => {
    if (!isAdmin) return;
    setRolesSaving(true);
    try {
      await updateUserRoles(userId, [nextRole]);
      toast.success('Роль пользователя обновлена');
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roles: [nextRole] } : u)),
      );
      if (profile?.id === userId) {
        toast.info('После смены собственной роли выполните выход и повторный вход, чтобы права обновились.');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRolesSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, username: true, email: true }));
    if (usernameError || emailError) return;
    setError('');
    setProfileSaving(true);
    try {
      const updated = await updateMyProfile({ username: username.trim(), email: email.trim() });
      setProfile(updated);
      updateUserIdentity({ username: updated.username });
      toast.success('Профиль успешно обновлён');
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setTouched((prev) => ({ ...prev, newPassword: true, confirmationPhrase: true }));
    if (newPasswordError || phraseError) return;
    setError('');
    setPasswordSaving(true);
    try {
      await changeMyPassword({
        currentPassword,
        newPassword,
        confirmationPhrase,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmationPhrase('');
      toast.success('Пароль успешно изменён');
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const avatarLetter = (username.trim() || profile?.username || '?').charAt(0).toUpperCase();

  if (loading) {
    return (
      <Layout>
        <div className="container page-width">
          <div className="card profile-hero-skeleton"><Skeleton style={{ height: 100 }} /></div>
          <div className="card"><Skeleton style={{ height: 140 }} /></div>
          <div className="card"><Skeleton style={{ height: 160 }} /></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container page-width profile-page">
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
            Управляйте данными профиля и безопасностью учётной записи.
          </p>
        </header>

        {error && <p className="error profile-global-error">{error}</p>}

        <section className="card profile-section" aria-labelledby="profile-settings-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="profile-settings-heading">Данные профиля</h2>
          </div>
          <form onSubmit={handleSaveProfile}>
            <FormField label="Имя пользователя" error={touched.username && usernameError ? usernameError : ''}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
                className={touched.username && usernameError ? 'input-invalid' : ''}
                minLength={2}
                maxLength={100}
                required
              />
            </FormField>
            <FormField label="Почта" error={touched.email && emailError ? emailError : ''}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                className={touched.email && emailError ? 'input-invalid' : ''}
                required
              />
            </FormField>
            <div className="form-actions">
              <button type="submit" disabled={profileSaving || Boolean(usernameError || emailError)}>
                {profileSaving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </section>

        <section className="card profile-section" aria-labelledby="profile-password-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="profile-password-heading">Безопасность</h2>
          </div>
          <p className="muted small">
            Для смены пароля введите кодовую фразу: <code className="profile-code">{PASSWORD_CHANGE_PHRASE}</code>
          </p>
          <form onSubmit={handleChangePassword}>
            <FormField label="Текущий пароль">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </FormField>
            <FormField label="Новый пароль" error={touched.newPassword && newPasswordError ? newPasswordError : ''}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, newPassword: true }))}
                className={touched.newPassword && newPasswordError ? 'input-invalid' : ''}
                minLength={6}
                autoComplete="new-password"
                required
              />
            </FormField>
            <FormField label="Кодовая фраза подтверждения" error={touched.confirmationPhrase && phraseError ? phraseError : ''}>
              <input
                type="text"
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, confirmationPhrase: true }))}
                className={touched.confirmationPhrase && phraseError ? 'input-invalid' : ''}
                required
              />
            </FormField>
            <div className="form-actions">
              <button
                type="submit"
                disabled={passwordSaving || Boolean(newPasswordError || phraseError)}
              >
                {passwordSaving ? 'Обновление...' : 'Изменить пароль'}
              </button>
            </div>
          </form>
        </section>

        {isAdmin && (
          <section className={`card profile-section profile-admin-card ${rolesPanelOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="profile-admin-toggle"
              aria-expanded={rolesPanelOpen}
              aria-controls="profile-admin-roles-panel"
              id="profile-admin-roles-heading"
              onClick={() => setRolesPanelOpen((v) => !v)}
            >
              <span className="profile-section-head profile-admin-toggle-inner">
                <span className="profile-section-icon" aria-hidden="true">◆</span>
                <span className="profile-admin-toggle-text">
                  <span className="profile-admin-toggle-title">Управление ролями</span>
                  <span className="muted small profile-admin-toggle-desc">
                    Список загружается только при раскрытии. Для больших команд — поиск и постраничный просмотр.
                  </span>
                </span>
              </span>
              <span className={`profile-chevron ${rolesPanelOpen ? 'open' : ''}`} aria-hidden="true" />
            </button>

            {rolesPanelOpen && (
              <div
                id="profile-admin-roles-panel"
                role="region"
                aria-labelledby="profile-admin-roles-heading"
                className="profile-admin-panel"
              >
                <p className="muted small profile-admin-note">
                  Изменения ролей вступают в силу после повторного входа (новый JWT).
                </p>

                {adminUsersLoading && (
                  <Skeleton style={{ height: 200 }} />
                )}

                {!adminUsersLoading && adminUsersError && (
                  <div className="profile-admin-error">
                    <p className="error">{adminUsersError}</p>
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => loadAdminUsers({ force: true })}
                    >
                      Повторить загрузку
                    </button>
                  </div>
                )}

                {!adminUsersLoading && !adminUsersError && adminUsers.length > 0 && (
                  <>
                    <div className="profile-admin-toolbar">
                      <label className="profile-admin-search-label">
                        <span className="sr-only">Поиск по имени или почте</span>
                        <input
                          type="search"
                          className="profile-admin-search"
                          placeholder="Поиск по имени или почте…"
                          value={adminUserSearch}
                          onChange={(e) => setAdminUserSearch(e.target.value)}
                          autoComplete="off"
                        />
                      </label>
                      <button
                        type="button"
                        className="secondary small"
                        onClick={() => loadAdminUsers({ force: true })}
                        disabled={adminUsersLoading}
                      >
                        Обновить список
                      </button>
                    </div>
                    <p className="muted small profile-admin-meta">
                      Всего в системе: <strong>{adminUsers.length}</strong>
                      {adminUserSearch.trim() ? (
                        <> · по запросу: <strong>{filteredAdminUsers.length}</strong></>
                      ) : null}
                    </p>

                    {filteredAdminUsers.length === 0 ? (
                      <p className="muted profile-admin-empty">Никто не подходит под фильтр. Измените поисковый запрос.</p>
                    ) : (
                      <>
                        <div className="role-management">
                          {paginatedAdminUsers.map((u) => (
                            <div key={u.id} className="role-row">
                              <div className="role-row-user">
                                <strong>{u.username}</strong>
                                {profile?.id === u.id && <span className="muted small"> (вы)</span>}
                                {u.email ? (
                                  <div className="muted small role-row-email">{u.email}</div>
                                ) : null}
                              </div>
                              <select
                                disabled={rolesSaving}
                                value={getPrimaryRole(u.roles)}
                                onChange={(e) => handleUpdateRoles(u.id, e.target.value)}
                                aria-label={`Роль для ${u.username}`}
                              >
                                <option value="EXECUTOR">{roleLabel('EXECUTOR')}</option>
                                <option value="MANAGER">{roleLabel('MANAGER')}</option>
                                <option value="ADMIN">{roleLabel('ADMIN')}</option>
                              </select>
                            </div>
                          ))}
                        </div>

                        {adminUsersTotalPages > 1 && (
                          <div className="profile-admin-pagination">
                            <button
                              type="button"
                              className="secondary small"
                              disabled={adminUserPageSafe <= 1}
                              onClick={() => setAdminUserPage((p) => Math.max(1, p - 1))}
                            >
                              Назад
                            </button>
                            <span className="muted small profile-admin-page-info">
                              Стр. {adminUserPageSafe} из {adminUsersTotalPages}
                              {' · '}
                              {(adminUserPageSafe - 1) * ADMIN_USERS_PAGE_SIZE + 1}
                              –
                              {Math.min(adminUserPageSafe * ADMIN_USERS_PAGE_SIZE, filteredAdminUsers.length)}
                              {' '}
                              из {filteredAdminUsers.length}
                            </span>
                            <button
                              type="button"
                              className="secondary small"
                              disabled={adminUserPageSafe >= adminUsersTotalPages}
                              onClick={() => setAdminUserPage((p) => Math.min(adminUsersTotalPages, p + 1))}
                            >
                              Вперёд
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {!adminUsersLoading && !adminUsersError && adminUsers.length === 0 && (
                  <p className="muted">Пользователи не найдены.</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}
