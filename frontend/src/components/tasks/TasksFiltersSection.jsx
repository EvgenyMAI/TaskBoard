import { STATUS_LABELS } from '../../constants/taskStatus';

export default function TasksFiltersSection({
  filterProjectId,
  setFilterProjectId,
  filterStatus,
  setFilterStatus,
  filterAssigneeId,
  setFilterAssigneeId,
  projects,
  users,
}) {
  return (
    <section className="card profile-section" aria-labelledby="tasks-filters-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="tasks-filters-heading">Фильтры</h2>
      </div>
      <div className="form-row tasks-filters-row">
        <div className="form-group">
          <label htmlFor="task-filter-project">Проект</label>
          <select
            id="task-filter-project"
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
          >
            <option value="">Все проекты</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="task-filter-status">Статус</label>
          <select
            id="task-filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Любой</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="task-filter-assignee">Исполнитель</label>
          <select
            id="task-filter-assignee"
            value={filterAssigneeId}
            onChange={(e) => setFilterAssigneeId(e.target.value)}
          >
            <option value="">Все</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
