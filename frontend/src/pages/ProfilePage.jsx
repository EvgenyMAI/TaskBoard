import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { changeMyPassword, getMyProfile, updateMyProfile } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import FormField from '../components/FormField';
import Skeleton from '../components/Skeleton';

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
            Роли: {profile?.roles?.length ? profile.roles.join(', ') : '—'}
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
