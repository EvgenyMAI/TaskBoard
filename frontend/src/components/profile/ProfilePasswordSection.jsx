import FormField from '../FormField';

export default function ProfilePasswordSection({
  passwordChangePhrase,
  currentPassword,
  newPassword,
  confirmationPhrase,
  newPasswordError,
  phraseError,
  touched,
  passwordSaving,
  onSubmit,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmationPhraseChange,
  onNewPasswordBlur,
  onConfirmationPhraseBlur,
}) {
  return (
    <section className="card profile-section" aria-labelledby="profile-password-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="profile-password-heading">Безопасность</h2>
      </div>
      <p className="muted small">
        Для смены пароля введите кодовую фразу:{' '}
        <code className="profile-code">{passwordChangePhrase}</code>
      </p>
      <form onSubmit={onSubmit}>
        <FormField label="Текущий пароль">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => onCurrentPasswordChange(e.target.value)}
            autoComplete="current-password"
            required
          />
        </FormField>
        <FormField label="Новый пароль" error={touched.newPassword && newPasswordError ? newPasswordError : ''}>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            onBlur={onNewPasswordBlur}
            className={touched.newPassword && newPasswordError ? 'input-invalid' : ''}
            minLength={6}
            autoComplete="new-password"
            required
          />
        </FormField>
        <FormField
          label="Кодовая фраза подтверждения"
          error={touched.confirmationPhrase && phraseError ? phraseError : ''}
        >
          <input
            type="text"
            value={confirmationPhrase}
            onChange={(e) => onConfirmationPhraseChange(e.target.value)}
            onBlur={onConfirmationPhraseBlur}
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
  );
}
