export default function NotificationsFiltersSection({
  filterRead,
  filterType,
  filterSearch,
  onFilterReadChange,
  onFilterTypeChange,
  onFilterSearchChange,
}) {
  return (
    <section className="card profile-section" aria-labelledby="notifications-filters-heading">
      <div className="profile-section-head">
        <span className="profile-section-icon" aria-hidden="true">◆</span>
        <h2 id="notifications-filters-heading">Фильтры</h2>
      </div>
      <div className="form-row notifications-filters-row">
        <div className="form-group">
          <label htmlFor="nf-read">Статус</label>
          <select id="nf-read" value={filterRead} onChange={(e) => onFilterReadChange(e.target.value)}>
            <option value="">Все</option>
            <option value="unread">Непрочитанные</option>
            <option value="read">Прочитанные</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="nf-type">Тип</label>
          <select id="nf-type" value={filterType} onChange={(e) => onFilterTypeChange(e.target.value)}>
            <option value="">Все типы</option>
            <option value="TASK_CREATED">Создание</option>
            <option value="TASK_ASSIGNED">Назначение</option>
            <option value="TASK_REASSIGNED">Переназначение</option>
            <option value="TASK_STATUS_CHANGED">Смена статуса</option>
            <option value="TASK_DELETED">Удаление задачи</option>
            <option value="COMMENT_DELETED">Комментарий удалён</option>
          </select>
        </div>
        <div className="form-group notifications-filter-search">
          <label htmlFor="nf-q">Поиск</label>
          <input
            id="nf-q"
            type="search"
            placeholder="Текст уведомления"
            value={filterSearch}
            onChange={(e) => onFilterSearchChange(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
    </section>
  );
}
