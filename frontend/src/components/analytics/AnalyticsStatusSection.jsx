import Skeleton from '../Skeleton';
import { STATUS_LABELS } from '../../constants/taskStatus';
import { num } from '../../utils/analyticsFormat';

const statusPalette = {
  OPEN: '#8b5cf6',
  IN_PROGRESS: '#06b6d4',
  REVIEW: '#f59e0b',
  DONE: '#22c55e',
  CANCELLED: '#ef4444',
};

export default function AnalyticsStatusSection({ loading, status, statusView, onStatusViewChange }) {
  const statusItems = Object.entries(status);
  const statusTotal = Math.max(1, statusItems.reduce((acc, [, v]) => acc + num(v), 0));

  return (
    <section className="dashboard-surface analytics-section" aria-labelledby="analytics-status-heading">
      <div className="analytics-section-head-row">
        <div className="dashboard-panel-head analytics-section-head-inline">
          <span className="dashboard-panel-kicker">Распределение</span>
          <h2 className="dashboard-panel-title" id="analytics-status-heading">Статусы задач</h2>
        </div>
        <div className="analytics-segmented" role="group" aria-label="Вид диаграммы">
          <button
            type="button"
            className={statusView === 'bars' ? 'is-active' : ''}
            onClick={() => onStatusViewChange('bars')}
          >
            Столбцы
          </button>
          <button
            type="button"
            className={statusView === 'donut' ? 'is-active' : ''}
            onClick={() => onStatusViewChange('donut')}
          >
            Кольцо
          </button>
        </div>
      </div>
      {loading ? <Skeleton style={{ height: 140 }} /> : (
        statusView === 'bars' ? (
          <div className="analytics-grid-2 analytics-grid-status-bars">
            {statusItems.map(([k, v]) => {
              const pct = Math.round((num(v) / statusTotal) * 100);
              return (
                <div key={k} className="analytics-kpi analytics-status-card analytics-status-card--bars">
                  <div className="analytics-status-main">
                    <span
                      className="analytics-status-dot"
                      style={{ backgroundColor: statusPalette[k] || '#8b5cf6' }}
                      aria-hidden="true"
                    />
                    <span className="analytics-status-name">{STATUS_LABELS[k] || k}</span>
                  </div>
                  <div className="analytics-status-metrics" aria-label={`${num(v)} задач, ${pct}%`}>
                    <span className="analytics-status-count">{num(v)}</span>
                    <span className="analytics-status-percent-pill">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="analytics-donut-wrap">
            <svg viewBox="0 0 42 42" className="analytics-donut" aria-label="Распределение по статусам">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              {(() => {
                let offset = 0;
                return statusItems.map(([k, v], idx) => {
                  const percent = (num(v) / statusTotal) * 100;
                  const dash = `${percent} ${100 - percent}`;
                  const el = (
                    <circle
                      key={k}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      stroke={statusPalette[k] || Object.values(statusPalette)[idx % Object.values(statusPalette).length]}
                      strokeWidth="6"
                      strokeDasharray={dash}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += percent;
                  return el;
                });
              })()}
            </svg>
            <div className="analytics-donut-legend">
              {statusItems.map(([k, v]) => {
                const pct = Math.round((num(v) / statusTotal) * 100);
                return (
                  <div key={k} className="analytics-status-legend-item">
                    <div className="analytics-status-main">
                      <span
                        className="analytics-status-dot"
                        style={{ backgroundColor: statusPalette[k] || '#8b5cf6' }}
                        aria-hidden="true"
                      />
                      <span className="analytics-status-name">{STATUS_LABELS[k] || k}</span>
                    </div>
                    <div className="analytics-status-metrics" aria-label={`${num(v)} задач, ${pct}%`}>
                      <span className="analytics-status-count">{num(v)}</span>
                      <span className="analytics-status-percent-pill">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </section>
  );
}
