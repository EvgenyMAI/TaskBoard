import { num } from '../../utils/analyticsFormat';

export default function AnalyticsComparisonSection({ comparison }) {
  if (!comparison) return null;

  return (
    <section className="dashboard-surface analytics-section" aria-labelledby="analytics-dynamics-heading">
      <div className="dashboard-panel-head">
        <span className="dashboard-panel-kicker">Сравнение</span>
        <h2 className="dashboard-panel-title" id="analytics-dynamics-heading">Динамика периода</h2>
      </div>
      <p className="muted small analytics-section-lead">
        Сравнение с предыдущим интервалом той же длины.
      </p>
      <div className="analytics-grid-2">
        <div className="analytics-kpi">
          <span className="muted">Изменение задач</span>
          <strong className={comparison.deltaTotal >= 0 ? 'analytics-delta-pos' : 'analytics-delta-neg'}>
            {comparison.deltaTotal >= 0 ? '+' : ''}{num(comparison.deltaTotal)} ({comparison.deltaTotalPercent}%)
          </strong>
        </div>
        <div className="analytics-kpi">
          <span className="muted">Изменение просроченных</span>
          <strong className={comparison.deltaOverdue <= 0 ? 'analytics-delta-pos' : 'analytics-delta-neg'}>
            {comparison.deltaOverdue >= 0 ? '+' : ''}{num(comparison.deltaOverdue)} ({comparison.deltaOverduePercent}%)
          </strong>
        </div>
      </div>
    </section>
  );
}
