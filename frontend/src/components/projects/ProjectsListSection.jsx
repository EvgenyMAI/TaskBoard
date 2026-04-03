import { Link } from 'react-router-dom';
import Skeleton from '../Skeleton';

export default function ProjectsListSection({
  loading,
  projects,
  isAdminOrManager,
  onEdit,
  onDelete,
}) {
  return (
    <section className="card profile-section" aria-labelledby="projects-list-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="projects-list-heading">Список проектов</h2>
      </div>
      {loading ? (
        <ul className="projects-card-list">
          <li className="card projects-card-item-skeleton"><Skeleton style={{ height: 72 }} /></li>
          <li className="card projects-card-item-skeleton"><Skeleton style={{ height: 72 }} /></li>
          <li className="card projects-card-item-skeleton"><Skeleton style={{ height: 72 }} /></li>
        </ul>
      ) : projects.length === 0 ? (
        <p className="muted projects-empty">
          {isAdminOrManager
            ? 'Нет проектов. Создайте первый проект.'
            : 'Нет проектов, где вы участник. Администратор может добавить вас в состав проекта.'}
        </p>
      ) : (
        <ul className="projects-card-list">
          {projects.map((p) => (
            <li key={p.id} className="card task-list-item projects-card-item">
              <div className="task-item-content">
                <div className="task-item-header">
                  <Link to={`/projects/${p.id}`} className="task-title">
                    {p.name}
                  </Link>
                </div>
                {p.description ? (
                  <div className="task-item-meta">
                    <span className="meta-chip meta-chip--block">{p.description}</span>
                  </div>
                ) : null}
              </div>
              <div className="projects-card-actions">
                <Link to={`/projects/${p.id}`} className="btn-link">
                  Открыть →
                </Link>
                {isAdminOrManager && (
                  <>
                    <button type="button" className="secondary small" onClick={() => onEdit(p)}>
                      Изменить
                    </button>
                    <button type="button" className="danger small" onClick={() => onDelete(p)}>
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
