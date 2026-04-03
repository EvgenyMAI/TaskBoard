import Skeleton from '../Skeleton';
import { formatDueDateShort } from '../../utils/dateFormat';
import TaskListItemRow from './TaskListItemRow';

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
            <TaskListItemRow
              key={t.id}
              task={t}
              meta={(
                <>
                  <span className="meta-chip">Проект: {t.projectId ? projectById(t.projectId) : '—'}</span>
                  <span className="meta-chip">Исполнитель: {t.assigneeId ? userById(t.assigneeId) : '—'}</span>
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
