import { STATUS_LABELS } from '../../constants/taskStatus';

export default function TaskDetailEditForm({
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editStatus,
  setEditStatus,
  editAssigneeId,
  setEditAssigneeId,
  editDueDate,
  setEditDueDate,
  assigneeSelectUserIds,
  users,
  projectMemberIds,
  isAdminOrManager,
  submitLoading,
  onSubmit,
  onCancel,
}) {
  return (
    <section className="card profile-section" aria-labelledby="task-edit-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="task-edit-heading">Редактирование</h2>
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="task-edit-title">Название</label>
          <input
            id="task-edit-title"
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="task-edit-desc">Описание</label>
          <textarea
            id="task-edit-desc"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Статус</label>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="task-edit-assignee">Исполнитель</label>
            {isAdminOrManager ? (
              <select
                id="task-edit-assignee"
                value={editAssigneeId}
                onChange={(e) => setEditAssigneeId(e.target.value)}
              >
                <option value="">— не назначен —</option>
                {assigneeSelectUserIds.map((uid) => {
                  const u = users.find((x) => x.id === uid);
                  if (!u) return null;
                  const notInProject = !projectMemberIds.includes(uid);
                  const label = notInProject ? `${u.username} (нет в проекте)` : u.username;
                  return (
                    <option key={uid} value={String(uid)}>{label}</option>
                  );
                })}
              </select>
            ) : (
              <select id="task-edit-assignee" value={editAssigneeId} disabled aria-readonly="true">
                {editAssigneeId ? (
                  <option value={String(editAssigneeId)}>
                    {users.find((x) => String(x.id) === String(editAssigneeId))?.username
                      || `Пользователь #${editAssigneeId}`}
                  </option>
                ) : (
                  <option value="">— не назначен —</option>
                )}
              </select>
            )}
            {isAdminOrManager && (
              <p className="muted small" style={{ marginTop: '0.35rem' }}>
                Только участники проекта; иначе сначала добавьте пользователя в проект.
              </p>
            )}
          </div>
          <div className="form-group">
            <label>Срок</label>
            <input
              type="datetime-local"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" disabled={submitLoading}>
            {submitLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </section>
  );
}
