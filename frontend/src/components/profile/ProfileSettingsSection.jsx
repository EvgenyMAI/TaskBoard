import FormField from '../FormField';

export default function ProfileSettingsSection({
  username,
  email,
  usernameError,
  emailError,
  touched,
  profileSaving,
  onSubmit,
  onUsernameChange,
  onEmailChange,
  onUsernameBlur,
  onEmailBlur,
}) {
  return (
    <section className="card profile-section" aria-labelledby="profile-settings-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="profile-settings-heading">Данные профиля</h2>
      </div>
      <form onSubmit={onSubmit}>
        <FormField label="Имя пользователя" error={touched.username && usernameError ? usernameError : ''}>
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            onBlur={onUsernameBlur}
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
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={onEmailBlur}
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
  );
}
