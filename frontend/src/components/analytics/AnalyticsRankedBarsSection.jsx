import { Link } from 'react-router-dom';
import Skeleton from '../Skeleton';
import { num } from '../../utils/analyticsFormat';

export default function AnalyticsRankedBarsSection({
  titleId,
  kicker,
  title,
  loading,
  emptyText,
  rows,
  maxCount,
  barVariant,
  getRowKey,
  getLabel,
  getCount,
  getHref,
}) {
  return (
    <section className="dashboard-surface analytics-section" aria-labelledby={titleId}>
      <div className="dashboard-panel-head">
        <span className="dashboard-panel-kicker">{kicker}</span>
        <h2 className="dashboard-panel-title" id={titleId}>{title}</h2>
      </div>
      {loading ? <Skeleton style={{ height: 160 }} /> : rows.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <div className="analytics-bars">
          {rows.map((row) => (
            <div key={getRowKey(row)} className="analytics-bar-row">
              <div className="analytics-bar-meta">
                <Link to={getHref(row)}>{getLabel(row)}</Link>
                <strong>{num(getCount(row))}</strong>
              </div>
              <div className="analytics-bar-track">
                <div
                  className={`analytics-bar-fill${barVariant === 'alt' ? ' alt' : ''}`}
                  style={{ width: `${(num(getCount(row)) / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
