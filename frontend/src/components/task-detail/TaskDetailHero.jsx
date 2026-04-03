import { Link } from 'react-router-dom';
import { STATUS_LABELS } from '../../constants/taskStatus';
import { formatDateTimeRu } from '../../utils/dateFormat';

export default function TaskDetailHero({
  task,
  heroLetter,
  projectName,
  editing,
  canEditTask,
  canDeleteTask,
  onEdit,
  onCancelEdit,
  onDelete,
}) {
  return (
    <header className="card profile-hero task-detail-hero">
      <div className="profile-hero-main">
        <div className="profile-avatar profile-avatar-task-detail" aria-hidden="true">{heroLetter}</div>
        <div className="profile-hero-text">
          <h1 className="task-detail-title">{task.title}</h1>
          <div className="profile-hero-line">
            <p className="profile-hero-sub">
              {task.projectId ? (
                <>
                  В проекте:{' '}
                  <Link to={`/projects/${task.projectId}`}>{projectName(task.projectId)}</Link>
                </>
              ) : (
                'Задача без привязки к проекту'
              )}
            </p>
            <div className="profile-role-chips">
              <span className={`badge badge-${(task.status || '').toLowerCase()} task-detail-status-chip`}>
                {STATUS_LABELS[task.status] || task.status}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="profile-hero-hint profile-hero-hint-row">
        <p className="muted small profile-hero-hint-text">
          Создана: {formatDateTimeRu(task.createdAt)} · Обновлена: {formatDateTimeRu(task.updatedAt)}
        </p>
        <div className="task-detail-hero-actions">
          {!editing ? (
            <>
              {canEditTask && (
                <button type="button" onClick={onEdit}>
                  Редактировать
                </button>
              )}
              {canDeleteTask && (
                <button type="button" className="danger" onClick={onDelete}>
                  Удалить
                </button>
              )}
            </>
          ) : (
            <button type="button" className="secondary" onClick={onCancelEdit}>
              Отмена
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
