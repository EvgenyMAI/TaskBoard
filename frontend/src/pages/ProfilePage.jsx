import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { changeMyPassword, getMyProfile, getUsers, updateMyProfile, updateUserRoles } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import { useClientPagination } from '../hooks/useClientPagination';
import ProfilePageHero from '../components/profile/ProfilePageHero';
import ProfileSettingsSection from '../components/profile/ProfileSettingsSection';
import ProfilePasswordSection from '../components/profile/ProfilePasswordSection';
import ProfileAdminRolesSection from '../components/profile/ProfileAdminRolesSection';

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
  const adminUsersCacheOkRef = useRef(false);
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [rolesSaving, setRolesSaving] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameError = username.trim().length < 2 ? 'Минимум 2 символа' : '';
  const emailError = !emailRegex.test(email.trim()) ? 'Введите корректный email' : '';
  const newPasswordError = newPassword && newPassword.length < 6 ? 'Минимум 6 символов' : '';
  const phraseError = confirmationPhrase && confirmationPhrase !== PASSWORD_CHANGE_PHRASE
    ? 'Кодовая фраза введена неверно'
    : '';

  const matchAdminUser = useCallback((u, q) => {
    const un = (u.username || '').toLowerCase();
    const em = (u.email || '').toLowerCase();
    return un.includes(q) || em.includes(q);
  }, []);

  const {
    filteredRows: filteredAdminUsers,
    totalPages: adminUsersTotalPages,
    page: adminUserPageSafe,
    setPage: setAdminUserPage,
    pageSlice: paginatedAdminUsers,
  } = useClientPagination(adminUsers, {
    pageSize: ADMIN_USERS_PAGE_SIZE,
    search: adminUserSearch,
    matchesSearch: matchAdminUser,
  });

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
        <ProfilePageHero
          avatarLetter={avatarLetter}
          username={username}
          profile={profile}
          isAdmin={isAdmin}
        />

        {error && <p className="error profile-global-error">{error}</p>}

        <ProfileSettingsSection
          username={username}
          email={email}
          usernameError={usernameError}
          emailError={emailError}
          touched={touched}
          profileSaving={profileSaving}
          onSubmit={handleSaveProfile}
          onUsernameChange={setUsername}
          onEmailChange={setEmail}
          onUsernameBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
          onEmailBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
        />

        <ProfilePasswordSection
          passwordChangePhrase={PASSWORD_CHANGE_PHRASE}
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmationPhrase={confirmationPhrase}
          newPasswordError={newPasswordError}
          phraseError={phraseError}
          touched={touched}
          passwordSaving={passwordSaving}
          onSubmit={handleChangePassword}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmationPhraseChange={setConfirmationPhrase}
          onNewPasswordBlur={() => setTouched((prev) => ({ ...prev, newPassword: true }))}
          onConfirmationPhraseBlur={() => setTouched((prev) => ({ ...prev, confirmationPhrase: true }))}
        />

        {isAdmin && (
          <ProfileAdminRolesSection
            rolesPanelOpen={rolesPanelOpen}
            onTogglePanel={() => setRolesPanelOpen((v) => !v)}
            adminUsersLoading={adminUsersLoading}
            adminUsersError={adminUsersError}
            adminUsers={adminUsers}
            onRetryLoad={loadAdminUsers}
            adminUserSearch={adminUserSearch}
            onAdminUserSearchChange={setAdminUserSearch}
            filteredCount={filteredAdminUsers.length}
            paginatedUsers={paginatedAdminUsers}
            profile={profile}
            rolesSaving={rolesSaving}
            onUpdateRoles={handleUpdateRoles}
            getPrimaryRole={getPrimaryRole}
            adminUsersTotalPages={adminUsersTotalPages}
            adminUserPageSafe={adminUserPageSafe}
            pageSize={ADMIN_USERS_PAGE_SIZE}
            onPagePrev={() => setAdminUserPage((p) => Math.max(1, p - 1))}
            onPageNext={() => setAdminUserPage((p) => Math.min(adminUsersTotalPages, p + 1))}
          />
        )}
      </div>
    </Layout>
  );
}
