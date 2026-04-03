import { Link } from 'react-router-dom';
import { STATUS_LABELS } from '../../constants/taskStatus';
import { formatDueDateShort } from '../../utils/dateFormat';

export default function ProjectTasksListSection({ tasks, userName }) {
  return (
    <section className="card profile-section" aria-labelledby="project-tasks-list-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="project-tasks-list-heading">Задачи проекта ({tasks.length})</h2>
      </div>
      {tasks.length === 0 ? (
        <p className="muted tasks-empty">Нет задач по выбранным фильтрам. Создайте первую задачу.</p>
      ) : (
        <ul className="task-list project-detail-task-list">
          {tasks.map((t) => (
            <li key={t.id} className="card task-list-item">
              <div className="task-item-content">
                <div className="task-item-header">
                  <Link to={`/tasks/${t.id}`} className="task-title">
                    {t.title}
                  </Link>
                  <span className={`badge badge-${(t.status || '').toLowerCase()}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                </div>
                <div className="task-item-meta">
                  <span className="meta-chip">Исполнитель: {t.assigneeId ? userName(t.assigneeId) : '—'}</span>
                  <span className="meta-chip">Срок: {formatDueDateShort(t.dueDate)}</span>
                </div>
              </div>
              <Link to={`/tasks/${t.id}`} className="btn-link">
                Открыть →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
