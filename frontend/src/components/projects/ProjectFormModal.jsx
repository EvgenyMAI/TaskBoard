import Modal from '../Modal';
import FormField from '../FormField';

export default function ProjectFormModal({
  modal,
  name,
  description,
  nameError,
  touched,
  submitLoading,
  error,
  onClose,
  onSubmit,
  onNameChange,
  onDescriptionChange,
  onNameBlur,
}) {
  if (!modal) return null;

  return (
    <Modal
      title={modal === 'create' ? 'Новый проект' : 'Редактировать проект'}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <FormField label="Название" error={touched && nameError ? nameError : ''}>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameBlur}
            className={touched && nameError ? 'input-invalid' : ''}
            required
            autoFocus
          />
        </FormField>
        <FormField label="Описание">
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
          />
        </FormField>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" disabled={submitLoading || Boolean(nameError)}>
            {submitLoading ? 'Сохранение...' : modal === 'create' ? 'Создать' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
