import { STATUS_LABELS } from '../../constants/taskStatus';

export default function TasksCreateFormSection({
  showCreate,
  formProjectId,
  setFormProjectId,
  formTitle,
  setFormTitle,
  formDescription,
  setFormDescription,
  formStatus,
  setFormStatus,
  formAssigneeId,
  setFormAssigneeId,
  formDueDate,
  setFormDueDate,
  touched,
  setTouched,
  projectError,
  titleError,
  projects,
  membersForProject,
  users,
  isExecutor,
  user,
  submitLoading,
  onSubmit,
  onCancel,
}) {
  if (!showCreate) return null;

  return (
    <section className="card profile-section" aria-labelledby="tasks-new-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="tasks-new-heading">Новая задача</h2>
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="task-new-project">Проект *</label>
          <select
            id="task-new-project"
            value={formProjectId}
            onChange={(e) => setFormProjectId(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, projectId: true }))}
            className={touched.projectId && projectError ? 'input-invalid' : ''}
            required
          >
            <option value="">— выберите проект —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {touched.projectId && projectError && <p className="field-error">{projectError}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="task-new-title">Название</label>
          <input
            id="task-new-title"
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
            className={touched.title && titleError ? 'input-invalid' : ''}
            required
          />
          {touched.title && titleError && <p className="field-error">{titleError}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="task-new-desc">Описание</label>
          <textarea
            id="task-new-desc"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Статус</label>
            <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Исполнитель</label>
            {isExecutor ? (
              <select value={formAssigneeId} disabled>
                <option value={user?.userId}>
                  {user?.username || `#${user?.userId}`}
                </option>
              </select>
            ) : (
              <select value={formAssigneeId} onChange={(e) => setFormAssigneeId(e.target.value)}>
                <option value="">— не назначен —</option>
                {membersForProject
                  .map((uid) => users.find((u) => u.id === uid))
                  .filter(Boolean)
                  .map((u) => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
              </select>
            )}
          </div>
          <div className="form-group">
            <label>Срок</label>
            <input
              type="datetime-local"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" disabled={submitLoading || Boolean(projectError || titleError)}>
            {submitLoading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </form>
    </section>
  );
}
