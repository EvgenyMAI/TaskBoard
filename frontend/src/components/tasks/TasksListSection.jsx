import { Link } from 'react-router-dom';
import Skeleton from '../Skeleton';
import { STATUS_LABELS } from '../../constants/taskStatus';
import { formatDueDateShort } from '../../utils/dateFormat';

export default function TasksListSection({ loading, tasks, projectById, userById }) {
  return (
    <section className="card profile-section" aria-labelledby="tasks-list-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="tasks-list-heading">Список задач</h2>
      </div>
      {loading ? (
        <ul className="task-list">
          <li className="card task-list-item-skeleton"><Skeleton style={{ height: 62 }} /></li>
          <li className="card task-list-item-skeleton"><Skeleton style={{ height: 62 }} /></li>
          <li className="card task-list-item-skeleton"><Skeleton style={{ height: 62 }} /></li>
        </ul>
      ) : tasks.length === 0 ? (
        <p className="muted tasks-empty">Нет задач по выбранным фильтрам.</p>
      ) : (
        <ul className="task-list">
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
                  <span className="meta-chip">Проект: {t.projectId ? projectById(t.projectId) : '—'}</span>
                  <span className="meta-chip">Исполнитель: {t.assigneeId ? userById(t.assigneeId) : '—'}</span>
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
