import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Skeleton from '../components/Skeleton';
import { Link } from 'react-router-dom';
import { getReportSummary, getReportByProject, getReportByAssignee, downloadReportCsv } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

function num(v) {
  return Number(v || 0);
}

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatPeriodLabel(fromStr, toStr) {
  if (!fromStr || !toStr) return 'Период';
  try {
    const a = new Date(fromStr);
    const b = new Date(toStr);
    const opts = { day: 'numeric', month: 'short' };
    return `${a.toLocaleDateString('ru-RU', opts)} — ${b.toLocaleDateString('ru-RU', opts)}`;
  } catch {
    return 'Период';
  }
}

export default function AnalyticsPage() {
  const toast = useToast();
  const { user } = useAuth();
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

  const periodChip = formatPeriodLabel(from || defaultFrom, to || defaultTo);
  const username = user?.username || '';
  const heroLetter = username ? username.charAt(0).toUpperCase() : 'A';

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
    const end = new Date();
    const fromDate = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    fromDate.setHours(0, 0, 0, 0);
    setTo(toLocalInputValue(end));
    setFrom(toLocalInputValue(fromDate));
  };

  return (
    <Layout>
      <div className="container page-width analytics-page">
        <header className="card profile-hero analytics-hero">
          <div className="profile-hero-main">
            <div className="profile-avatar profile-avatar-analytics" aria-hidden="true">{heroLetter}</div>
            <div className="profile-hero-text">
              <h1>Аналитика</h1>
              <div className="profile-hero-line">
                <p className="profile-hero-sub">
                  {username ? `Отчёты для ${username}` : 'Сводка по задачам и проектам'}
                </p>
                <div className="profile-role-chips" aria-label="Выбранный период">
                  <span className="profile-role-chip analytics-period-chip">{periodChip}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="muted small profile-hero-hint">
            KPI, разрезы по статусам, проектам и исполнителям; выгрузка в CSV для Excel с русскими подписями.
          </p>
        </header>

        <section className="card profile-section" aria-labelledby="analytics-period-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="analytics-period-heading">Период и выгрузка</h2>
          </div>
          <div className="form-row analytics-period-row">
            <div className="form-group">
              <label htmlFor="analytics-from">С даты</label>
              <input
                id="analytics-from"
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="analytics-to">По дату</label>
              <input
                id="analytics-to"
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="form-group analytics-export-field">
              <span className="analytics-export-label" id="analytics-export-label">Экспорт</span>
              <div className="analytics-export-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={csvLoading}
                  onClick={handleDownloadCsv}
                  aria-describedby="analytics-export-label"
                >
                  {csvLoading ? 'Выгрузка...' : 'Скачать CSV'}
                </button>
              </div>
            </div>
          </div>
          <div className="analytics-presets" role="group" aria-label="Быстрый выбор периода">
            <button type="button" className="secondary small" onClick={() => applyPreset(7)}>7 дней</button>
            <button type="button" className="secondary small" onClick={() => applyPreset(30)}>30 дней</button>
            <button type="button" className="secondary small" onClick={() => applyPreset(90)}>90 дней</button>
          </div>
        </section>

        {error && <p className="error analytics-global-error">{error}</p>}

        <section className="card profile-section" aria-labelledby="analytics-kpi-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="analytics-kpi-heading">Сводные показатели</h2>
          </div>
          <div className="analytics-stat-grid">
            {loading ? (
              <>
                <Skeleton className="analytics-stat-skeleton" style={{ height: 92 }} />
                <Skeleton className="analytics-stat-skeleton" style={{ height: 92 }} />
                <Skeleton className="analytics-stat-skeleton" style={{ height: 92 }} />
                <Skeleton className="analytics-stat-skeleton" style={{ height: 92 }} />
                <Skeleton className="analytics-stat-skeleton" style={{ height: 92 }} />
              </>
            ) : (
              <>
                <div className="analytics-stat-tile card">
                  <p className="stat-label">Всего задач</p>
                  <p className="stat-value">{total}</p>
                </div>
                <div className="analytics-stat-tile card">
                  <p className="stat-label">Просрочено</p>
                  <p className={`stat-value${overdue > 0 ? ' analytics-stat-warn' : ''}`}>{overdue}</p>
                </div>
                <div className="analytics-stat-tile card">
                  <p className="stat-label">Завершено / активно</p>
                  <p className="stat-value">{done} / {active}</p>
                </div>
                <div className="analytics-stat-tile card">
                  <p className="stat-label">Завершённость</p>
                  <p className="stat-value">{completionRate}%</p>
                </div>
                <div className="analytics-stat-tile card">
                  <p className="stat-label">Без исполнителя</p>
                  <p className="stat-value">{withoutAssignee}</p>
                </div>
              </>
            )}
          </div>
        </section>

        {!loading && comparison && (
          <section className="card profile-section" aria-labelledby="analytics-dynamics-heading">
            <div className="profile-section-head">
              <span className="profile-section-icon" aria-hidden="true">◆</span>
              <h2 id="analytics-dynamics-heading">Динамика периода</h2>
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
        )}

        <section className="card profile-section" aria-labelledby="analytics-status-heading">
          <div className="analytics-section-head-row">
            <div className="profile-section-head analytics-section-head-inline">
              <span className="profile-section-icon" aria-hidden="true">◆</span>
              <h2 id="analytics-status-heading">Статусы задач</h2>
            </div>
            <div className="analytics-segmented" role="group" aria-label="Вид диаграммы">
              <button
                type="button"
                className={statusView === 'bars' ? 'is-active' : ''}
                onClick={() => setStatusView('bars')}
              >
                Столбцы
              </button>
              <button
                type="button"
                className={statusView === 'donut' ? 'is-active' : ''}
                onClick={() => setStatusView('donut')}
              >
                Кольцо
              </button>
            </div>
          </div>
          {loading ? <Skeleton style={{ height: 140 }} /> : (
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
                <svg viewBox="0 0 42 42" className="analytics-donut" aria-label="Распределение по статусам">
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
        </section>

        <section className="card profile-section" aria-labelledby="analytics-projects-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="analytics-projects-heading">Топ проектов по объёму задач</h2>
          </div>
          {loading ? <Skeleton style={{ height: 160 }} /> : byProject.length === 0 ? (
            <p className="muted">Нет данных за выбранный период.</p>
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
        </section>

        <section className="card profile-section" aria-labelledby="analytics-assignees-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="analytics-assignees-heading">Топ исполнителей по задачам</h2>
          </div>
          {loading ? <Skeleton style={{ height: 160 }} /> : byAssignee.length === 0 ? (
            <p className="muted">Нет данных за выбранный период.</p>
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
        </section>
      </div>
    </Layout>
  );
}
