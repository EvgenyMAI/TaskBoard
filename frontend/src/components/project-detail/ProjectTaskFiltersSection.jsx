import { STATUS_LABELS } from '../../constants/taskStatus';

export default function ProjectTaskFiltersSection({
  filterStatus,
  setFilterStatus,
  filterAssigneeId,
  setFilterAssigneeId,
  projectMembers,
  users,
}) {
  return (
    <section className="card profile-section" aria-labelledby="project-task-filters-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="project-task-filters-heading">Фильтры списка задач</h2>
      </div>
      <div className="form-row tasks-filters-row">
        <div className="form-group">
          <label htmlFor="project-filter-status">Статус</label>
          <select
            id="project-filter-status"
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
          <label htmlFor="project-filter-assignee">Исполнитель</label>
          <select
            id="project-filter-assignee"
            value={filterAssigneeId}
            onChange={(e) => setFilterAssigneeId(e.target.value)}
          >
            <option value="">Все</option>
            {(projectMembers || [])
              .map((uid) => users.find((u) => u.id === uid))
              .filter(Boolean)
              .map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
          </select>
        </div>
      </div>
    </section>
  );
}
