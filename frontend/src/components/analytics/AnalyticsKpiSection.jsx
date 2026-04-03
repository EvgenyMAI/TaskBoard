import Skeleton from '../Skeleton';

export default function AnalyticsKpiSection({
  loading,
  total,
  overdue,
  withoutAssignee,
  completionRate,
  overdueRate,
  assignedRate,
}) {
  return (
    <section className="dashboard-surface analytics-section" aria-labelledby="analytics-kpi-heading">
      <div className="dashboard-panel-head">
        <div className="analytics-kpi-head-main">
          <h2 className="dashboard-panel-title" id="analytics-kpi-heading">Сводные показатели</h2>
        </div>
      </div>
      <div className="analytics-kpi-subgrid">
        <div className="analytics-kpi-subtitle">Контекст</div>
        <div className="analytics-stat-grid analytics-stat-grid--context">
          {loading ? (
            <>
              <Skeleton className="analytics-stat-skeleton" style={{ height: 70 }} />
              <Skeleton className="analytics-stat-skeleton" style={{ height: 70 }} />
              <Skeleton className="analytics-stat-skeleton" style={{ height: 70 }} />
            </>
          ) : (
            <>
              <div className="analytics-stat-tile card analytics-stat-tile--total">
                <p className="stat-label">Всего задач</p>
                <p className="stat-value">{total}</p>
              </div>
              <div className="analytics-stat-tile card analytics-stat-tile--overdue">
                <p className="stat-label">Просрочено</p>
                <p className={`stat-value${overdue > 0 ? ' analytics-stat-warn' : ''}`}>{overdue}</p>
              </div>
              <div className="analytics-stat-tile card analytics-stat-tile--unassigned">
                <p className="stat-label">Без исполнителя</p>
                <p className="stat-value">{withoutAssignee}</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="analytics-kpi-subgrid">
        <div className="analytics-kpi-subtitle">Коэффициенты</div>
        <div className="analytics-stat-grid analytics-stat-grid--statuses">
          {loading ? (
            <>
              <Skeleton className="analytics-stat-skeleton" style={{ height: 70 }} />
              <Skeleton className="analytics-stat-skeleton" style={{ height: 70 }} />
              <Skeleton className="analytics-stat-skeleton" style={{ height: 70 }} />
            </>
          ) : (
            <>
              <div className="analytics-stat-tile card analytics-stat-tile--completion-rate">
                <p className="stat-label">Завершение</p>
                <p className="stat-value">{completionRate}%</p>
              </div>
              <div className="analytics-stat-tile card analytics-stat-tile--overdue-rate">
                <p className="stat-label">Доля просрочки</p>
                <p className="stat-value">{overdueRate}%</p>
              </div>
              <div className="analytics-stat-tile card analytics-stat-tile--assigned-rate">
                <p className="stat-label">Назначено</p>
                <p className="stat-value">{assignedRate}%</p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
