import { STATUS_LABELS } from '../../constants/taskStatus';
import { formatDateTimeRu } from '../../utils/dateFormat';

export default function TaskDetailSummary({ task, userName }) {
  return (
    <section className="card profile-section" aria-labelledby="task-summary-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="task-summary-heading">Сводка</h2>
      </div>
      <div className="task-detail-summary">
        <div className="task-summary-row">
          <span className="task-summary-label">Статус</span>
          <span className={`badge badge-${(task.status || '').toLowerCase()} task-summary-badge`}>
            {STATUS_LABELS[task.status] || task.status}
          </span>
        </div>

        {task.description && (
          <div className="task-summary-row">
            <span className="task-summary-label">Описание</span>
            <span className="task-detail-description">{task.description}</span>
          </div>
        )}

        {task.assigneeId && (
          <div className="task-summary-row">
            <span className="task-summary-label">Исполнитель</span>
            <span className="task-summary-value">{userName(task.assigneeId)}</span>
          </div>
        )}

        {task.dueDate && (
          <div className="task-summary-row">
            <span className="task-summary-label">Срок</span>
            <span className="task-summary-value">{formatDateTimeRu(task.dueDate)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
