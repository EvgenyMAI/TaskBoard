import { formatDueDateShort } from '../../utils/dateFormat';
import TaskListItemRow from '../tasks/TaskListItemRow';

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
            <TaskListItemRow
              key={t.id}
              task={t}
              meta={(
                <>
                  <span className="meta-chip">Исполнитель: {t.assigneeId ? userName(t.assigneeId) : '—'}</span>
                  <span className="meta-chip">Срок: {formatDueDateShort(t.dueDate)}</span>
                </>
              )}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
