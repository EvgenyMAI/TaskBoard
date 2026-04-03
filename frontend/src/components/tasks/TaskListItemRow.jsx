import { Link } from 'react-router-dom';
import { STATUS_LABELS } from '../../constants/taskStatus';

/**
 * Одна строка списка задач (общая разметка для страницы задач и карточки проекта).
 * @param {{ id: number|string, title: string, status?: string }} task
 * @param {import('react').ReactNode} meta — содержимое блока .task-item-meta (чипы)
 */
export default function TaskListItemRow({ task, meta }) {
  const t = task;
  const statusKey = (t.status || '').toLowerCase();
  return (
    <li className="card task-list-item">
      <div className="task-item-content">
        <div className="task-item-header">
          <Link to={`/tasks/${t.id}`} className="task-title">
            {t.title}
          </Link>
          <span className={`badge badge-${statusKey}`}>
            {STATUS_LABELS[t.status] || t.status}
          </span>
        </div>
        <div className="task-item-meta">{meta}</div>
      </div>
      <Link to={`/tasks/${t.id}`} className="btn-link">
        Открыть →
      </Link>
    </li>
  );
}
