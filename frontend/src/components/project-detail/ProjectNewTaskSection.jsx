import { STATUS_LABELS } from '../../constants/taskStatus';

export default function ProjectNewTaskSection({
  showTaskForm,
  onClose,
  taskTitle,
  setTaskTitle,
  taskDescription,
  setTaskDescription,
  taskStatus,
  setTaskStatus,
  taskAssigneeId,
  setTaskAssigneeId,
  taskDueDate,
  setTaskDueDate,
  isExecutor,
  user,
  projectMembers,
  users,
  submitLoading,
  onSubmit,
}) {
  if (!showTaskForm) return null;

  return (
    <section className="card profile-section" aria-labelledby="project-new-task-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="project-new-task-heading">Новая задача</h2>
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="project-task-title">Название</label>
          <input
            id="project-task-title"
            type="text"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
            placeholder="Название задачи"
          />
        </div>
        <div className="form-group">
          <label htmlFor="project-task-desc">Описание</label>
          <textarea
            id="project-task-desc"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            rows={2}
            placeholder="Описание (необязательно)"
          />
        </div>
        <div className="form-row tasks-filters-row">
          <div className="form-group">
            <label>Статус</label>
            <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Исполнитель</label>
            {isExecutor ? (
              <select value={user?.userId || ''} disabled>
                <option value={user?.userId}>{user?.username || `#${user?.userId}`}</option>
              </select>
            ) : (
              <select value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)}>
                <option value="">— не назначен —</option>
                {(projectMembers || [])
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
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" disabled={submitLoading}>
            {submitLoading ? 'Создание...' : 'Создать задачу'}
          </button>
        </div>
      </form>
    </section>
  );
}
