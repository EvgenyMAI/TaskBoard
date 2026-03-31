import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Skeleton from '../components/Skeleton';
import { Link } from 'react-router-dom';
import { getReportSummary, getReportByProject, getReportByAssignee, downloadReportCsv } from '../api';
import { useToast } from '../context/ToastContext';

function num(v) {
  return Number(v || 0);
}

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AnalyticsPage() {
  const toast = useToast();
  const now = new Date();
  const defaultFromDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  defaultFromDate.setHours(0, 0, 0, 0);
  const defaultFrom = toLocalInputValue(defaultFromDate);
  const defaultTo = toLocalInputValue(now);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [byProject, setByProject] = useState([]);
  const [byAssignee, setByAssignee] = useState([]);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [csvLoading, setCsvLoading] = useState(false);
  const [statusView, setStatusView] = useState('donut');

  const params = useMemo(() => {
    const p = {};
    const fromValue = from || defaultFrom;
    const toValue = to || defaultTo;
    if (fromValue) p.from = new Date(fromValue).toISOString();
    if (toValue) {
      const end = new Date(toValue);
      end.setSeconds(59, 999);
      p.to = end.toISOString();
    }
    return p;
  }, [from, to, defaultFrom, defaultTo]);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      getReportSummary(params),
      getReportByProject(params),
      getReportByAssignee(params),
    ])
      .then(([s, p, a]) => {
        const aggr = s?.aggregates || {};
        setSummary(aggr);
        setByProject((p?.aggregates?.byProject || aggr.byProject || []).slice(0, 8));
        setByAssignee((a?.aggregates?.byAssignee || aggr.byAssignee || []).slice(0, 8));
      })
      .catch((e) => {
        setError(e.message);
        toast.error(e.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.from, params.to]);

  const total = num(summary?.totalTasks);
  const overdue = num(summary?.overdueCount);
  const active = num(summary?.activeCount);
  const done = num(summary?.doneCount);
  const completionRate = Number(summary?.completionRate || 0);
  const withoutAssignee = num(summary?.withoutAssigneeCount);
  const status = summary?.statusBreakdown || {};
  const comparison = summary?.periodComparison || null;
  const maxProject = Math.max(1, ...byProject.map((x) => num(x.count)));
  const maxAssignee = Math.max(1, ...byAssignee.map((x) => num(x.count)));
  const statusLabels = {
    OPEN: 'Открыта',
    IN_PROGRESS: 'В работе',
    REVIEW: 'На проверке',
    DONE: 'Выполнена',
    CANCELLED: 'Отменена',
  };
  const statusItems = Object.entries(status);
  const statusTotal = Math.max(1, statusItems.reduce((acc, [, v]) => acc + num(v), 0));

  const handleDownloadCsv = async () => {
    setCsvLoading(true);
    try {
      const blob = await downloadReportCsv(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const suffix = from || to ? '-filtered' : '';
      link.href = url;
      link.download = `taskboard-report${suffix}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV-отчет выгружен');
    } catch (e) {
      toast.error(e.message || 'Не удалось выгрузить CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  const applyPreset = (days) => {
    const now = new Date();
    const fromDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);
    setTo(toLocalInputValue(now));
    setFrom(toLocalInputValue(fromDate));
  };

  return (
    <Layout>
      <div className="container page-width">
        <div className="card page-intro">
          <h1>Аналитика</h1>
          <p className="muted">Обзор ключевых показателей по задачам, проектам и исполнителям.</p>
        </div>

        <div className="card filters">
          <div className="form-row">
            <div className="form-group">
              <label>С даты</label>
              <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>По дату</label>
              <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="form-group" style={{ alignSelf: 'flex-end' }}>
              <div className="form-actions">
                <button type="button" className="secondary" disabled={csvLoading} onClick={handleDownloadCsv}>
                  {csvLoading ? 'Выгрузка...' : 'Скачать отчет'}
                </button>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary small" onClick={() => applyPreset(7)}>Последние 7 дней</button>
            <button type="button" className="secondary small" onClick={() => applyPreset(30)}>Последние 30 дней</button>
            <button type="button" className="secondary small" onClick={() => applyPreset(90)}>Последние 90 дней</button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="dashboard-stats">
          {loading ? (
            <>
              <Skeleton style={{ height: 88 }} />
              <Skeleton style={{ height: 88 }} />
              <Skeleton style={{ height: 88 }} />
            </>
          ) : (
            <>
              <div className="stat-card card">
                <p className="stat-label">Всего задач</p>
                <p className="stat-value">{total}</p>
              </div>
              <div className="stat-card card">
                <p className="stat-label">Просрочено</p>
                <p className="stat-value">{overdue}</p>
              </div>
              <div className="stat-card card">
                <p className="stat-label">Завершено / Активно</p>
                <p className="stat-value">{done} / {active}</p>
              </div>
              <div className="stat-card card">
                <p className="stat-label">Completion rate</p>
                <p className="stat-value">{completionRate}%</p>
              </div>
              <div className="stat-card card">
                <p className="stat-label">Без исполнителя</p>
                <p className="stat-value">{withoutAssignee}</p>
              </div>
            </>
          )}
        </div>

        {comparison && (
          <div className="card">
            <h2>Динамика периода</h2>
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
          </div>
        )}

        <div className="card">
          <div className="page-header">
            <h2>Статусы задач</h2>
            <div className="page-header-actions">
              <button type="button" className={statusView === 'bars' ? '' : 'secondary'} onClick={() => setStatusView('bars')}>Столбцы</button>
              <button type="button" className={statusView === 'donut' ? '' : 'secondary'} onClick={() => setStatusView('donut')}>Кольцо</button>
            </div>
          </div>
          {loading ? <Skeleton style={{ height: 120 }} /> : (
            statusView === 'bars' ? (
              <div className="analytics-grid-2">
                {statusItems.map(([k, v]) => (
                  <div key={k} className="analytics-kpi">
                    <span className="muted">{statusLabels[k] || k}</span>
                    <strong>{num(v)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="analytics-donut-wrap">
                <svg viewBox="0 0 42 42" className="analytics-donut" aria-label="status donut">
                  <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  {(() => {
                    const palette = ['#8b5cf6', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444'];
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
                          stroke={palette[idx % palette.length]}
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
                  {statusItems.map(([k, v]) => (
                    <div key={k} className="muted small">{statusLabels[k] || k}: {num(v)}</div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        <div className="card">
          <h2>Топ проектов по объему задач</h2>
          {loading ? <Skeleton style={{ height: 160 }} /> : byProject.length === 0 ? (
            <p className="muted">Нет данных.</p>
          ) : (
            <div className="analytics-bars">
              {byProject.map((row) => (
                <div key={row.projectId} className="analytics-bar-row">
                  <div className="analytics-bar-meta">
                    <Link to={`/tasks?projectId=${row.projectId}`}>{row.projectName}</Link>
                    <strong>{num(row.count)}</strong>
                  </div>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${(num(row.count) / maxProject) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Топ исполнителей по задачам</h2>
          {loading ? <Skeleton style={{ height: 160 }} /> : byAssignee.length === 0 ? (
            <p className="muted">Нет данных.</p>
          ) : (
            <div className="analytics-bars">
              {byAssignee.map((row) => (
                <div key={row.userId} className="analytics-bar-row">
                  <div className="analytics-bar-meta">
                    <Link to={`/tasks?assigneeId=${row.userId}`}>{row.username}</Link>
                    <strong>{num(row.count)}</strong>
                  </div>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill alt" style={{ width: `${(num(row.count) / maxAssignee) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

