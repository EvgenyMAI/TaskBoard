import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { changeMyPassword, getMyProfile, getUsers, updateMyProfile, updateUserRoles } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import FormField from '../components/FormField';
import Skeleton from '../components/Skeleton';
import { roleLabel, roleLabels } from '../utils/roles';

const PASSWORD_CHANGE_PHRASE = 'I_CONFIRM_PASSWORD_CHANGE';

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

  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState([]);
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

  useEffect(() => {
    if (!isAdmin) return;
    setUsersLoading(true);
    getUsers()
      .then((list) => setUsers(Array.isArray(list) ? list : []))
      .catch((e) => setError(e.message))
      .finally(() => setUsersLoading(false));
  }, [isAdmin]);

  const getPrimaryRole = (roles) => {
    const r = Array.isArray(roles) ? roles : [];
    if (r.includes('ADMIN')) return 'ADMIN';
    if (r.includes('MANAGER')) return 'MANAGER';
    return 'EXECUTOR';
  };

  const handleUpdateRoles = async (userId, nextRole) => {
    if (!isAdmin) return;
    setRolesSaving(true);
    try {
      await updateUserRoles(userId, [nextRole]);
      toast.success('Роль пользователя обновлена');
      setUsers((prev) =>
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

  if (loading) {
    return (
      <Layout>
        <div className="container page-width">
          <div className="card"><Skeleton style={{ height: 120 }} /></div>
          <div className="card"><Skeleton style={{ height: 160 }} /></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container page-width">
        <div className="card page-intro">
          <h1>Личный кабинет</h1>
          <p className="muted">Управляйте данными профиля и безопасностью учетной записи.</p>
        </div>
        <div className="page-header">
          <h2>Настройки профиля</h2>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="card">
          <h2>Профиль</h2>
          <p className="muted small">
            Роли: {profile?.roles?.length ? roleLabels(profile.roles).join(', ') : '—'}
          </p>
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
                {profileSaving ? 'Сохранение...' : 'Сохранить профиль'}
              </button>
            </div>
          </form>
        </div>

        {isAdmin && (
          <div className="card">
            <h2>Управление ролями</h2>
            <p className="muted small">
              Изменения ролей применяются после повторного входа (JWT).
            </p>
            {usersLoading ? (
              <Skeleton style={{ height: 180 }} />
            ) : (
              <div className="role-management">
                {users.map((u) => (
                  <div key={u.id} className="role-row">
                    <div className="role-row-user">
                      <strong>{u.username}</strong>
                      {profile?.id === u.id && <span className="muted small"> (вы)</span>}
                    </div>
                    <select
                      disabled={rolesSaving}
                      value={getPrimaryRole(u.roles)}
                      onChange={(e) => handleUpdateRoles(u.id, e.target.value)}
                    >
                      <option value="EXECUTOR">{roleLabel('EXECUTOR')}</option>
                      <option value="MANAGER">{roleLabel('MANAGER')}</option>
                      <option value="ADMIN">{roleLabel('ADMIN')}</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card">
          <h2>Смена пароля</h2>
          <p className="muted small">
            Для подтверждения введите кодовую фразу: <code>{PASSWORD_CHANGE_PHRASE}</code>
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
        </div>
      </div>
    </Layout>
  );
}
