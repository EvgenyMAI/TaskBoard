import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { ANALYTICS_API, getToken, getNotifications, markNotificationRead } from '../api';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ru-RU');
  } catch {
    return String(value);
  }
}

const TYPE_LABELS = {
  TASK_CREATED: 'Создание',
  TASK_ASSIGNED: 'Назначение',
  TASK_REASSIGNED: 'Переназначение',
  TASK_STATUS_CHANGED: 'Смена статуса',
};

const STATUS_LABELS = {
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  REVIEW: 'На проверке',
  DONE: 'Выполнена',
  CANCELLED: 'Отменена',
};

function taskTitleFromBody(body) {
  if (!body) return '';
  const m = String(body).match(/"([^"]+)"/);
  return m ? m[1] : '';
}

function statusCodeFromBody(body) {
  if (!body) return '';
  const m = String(body).match(/статус:\s*([A-Z_]+)/i);
  return m ? m[1].toUpperCase() : '';
}

function badgeClassForStatus(statusCode) {
  return statusCode === 'OPEN'
    ? 'badge-open'
    : statusCode === 'IN_PROGRESS'
      ? 'badge-in_progress'
      : statusCode === 'REVIEW'
        ? 'badge-review'
        : statusCode === 'DONE'
          ? 'badge-done'
          : statusCode === 'CANCELLED'
            ? 'badge-cancelled'
            : '';
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [processingIds, setProcessingIds] = useState([]);
  const [filterRead, setFilterRead] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const toast = useToast();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const load = (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    const params = {};
    if (filterRead) params.read = filterRead === 'read';
    if (filterType) params.type = filterType;
    if (filterSearch.trim()) params.q = filterSearch.trim();
    if (filterFrom) params.from = new Date(filterFrom).toISOString();
    if (filterTo) params.to = new Date(filterTo).toISOString();

    getNotifications(params)
      .then((list) => {
        const sorted = [...(list || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(sorted);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filterRead, filterType, filterSearch, filterFrom, filterTo]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let es;
    try {
      es = new EventSource(`${ANALYTICS_API}/notifications/stream?access_token=${encodeURIComponent(token)}`);
      es.addEventListener('notification', () => load(false));
    } catch {
      // If SSE fails (e.g., proxy limitations), fallback to manual updates still works.
    }

    return () => {
      if (es) es.close();
    };
  }, [filterRead, filterType, filterSearch, filterFrom, filterTo]);

  const markAsRead = async (id, silent = false) => {
    const current = notifications.find((n) => n.id === id);
    const title = current?.title || '';
    setProcessingIds((prev) => [...prev, id]);
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (!silent) toast.success(title ? `Прочитано: ${title}` : 'Прочитано');
      if (!silent) window.dispatchEvent(new Event('notifications:changed'));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProcessingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    for (const item of unread) {
      // sequential to keep UI stable and avoid request burst
      // eslint-disable-next-line no-await-in-loop
      await markAsRead(item.id, true);
    }
    toast.success(`Отмечено прочитанными: ${unread.length}`);
    window.dispatchEvent(new Event('notifications:changed'));
  };

  return (
    <Layout>
      <div className="container page-width">
        <div className="card page-intro">
          <h1>Уведомления</h1>
          <p className="muted">События по задачам в реальном времени.</p>
        </div>
        <div className="page-header">
          <div>
            <h2>Лента уведомлений</h2>
            <div className="notifications-unread-summary">
              <div className="notifications-unread-row">
                <span className="unread-count-label muted small">Непрочитанных:</span>
                <span className="unread-count">{unreadCount}</span>
              </div>
              <p className="muted small">События по задачам: создание, назначение, смена статуса.</p>
            </div>
          </div>
          <div className="page-header-actions">
            <button type="button" onClick={markAllAsRead} disabled={unreadCount === 0}>
              Отметить все прочитанными
            </button>
          </div>
        </div>

        <div className="card filters">
          <div className="form-row">
            <div className="form-group">
              <label>Статус</label>
              <select value={filterRead} onChange={(e) => setFilterRead(e.target.value)}>
                <option value="">Все</option>
                <option value="unread">Непрочитанные</option>
                <option value="read">Прочитанные</option>
              </select>
            </div>
            <div className="form-group">
              <label>Тип</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Все типы</option>
                <option value="TASK_CREATED">Создание</option>
                <option value="TASK_ASSIGNED">Назначение</option>
                <option value="TASK_REASSIGNED">Переназначение</option>
                <option value="TASK_STATUS_CHANGED">Смена статуса</option>
              </select>
            </div>
            <div className="form-group">
              <label>Поиск</label>
              <input
                type="text"
                placeholder="Текст уведомления"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>С даты</label>
              <input type="datetime-local" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>По дату</label>
              <input type="datetime-local" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <ul className="card-list">
            <li className="card"><Skeleton style={{ height: 76 }} /></li>
            <li className="card"><Skeleton style={{ height: 76 }} /></li>
            <li className="card"><Skeleton style={{ height: 76 }} /></li>
          </ul>
        ) : notifications.length === 0 ? (
          <div className="card">
            <p className="muted">Уведомлений пока нет.</p>
          </div>
        ) : (
          <ul className="card-list">
            {notifications.map((n) => (
              <li key={n.id} className={`card card-list-item notification-item ${n.read ? 'is-read' : 'is-unread'}`}>
                <div className="card-list-item-main">
                  <div className="notification-title-row">
                    {!n.read && <span className="dot-unread" />}
                    <p className="notification-title">
                      <span className="notification-title-text">{n.title || 'Уведомление'}</span>
                      {n.type && <span className="notification-type-chip">{TYPE_LABELS[n.type] || n.type}</span>}
                    </p>
                  </div>
                  {(() => {
                    const title = taskTitleFromBody(n.body);
                    const statusCode = n.type === 'TASK_STATUS_CHANGED' ? statusCodeFromBody(n.body) : '';
                    const statusLabel = statusCode ? (STATUS_LABELS[statusCode] || statusCode) : '';
                    const badgeClass = badgeClassForStatus(statusCode);
                    return (
                      <>
                        {title ? (
                          <div className="notification-detail-line">
                            <span className="notification-detail-label">Задача:</span>
                            <span className="notification-detail-value">{title}</span>
                          </div>
                        ) : (
                          <p className="notification-body muted small">{n.body || '—'}</p>
                        )}
                        {statusCode ? (
                          <div className="notification-detail-line">
                            <span className="notification-detail-label">Статус:</span>
                            <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                  <div className="notification-meta">
                    <span className="meta-chip">{formatDate(n.createdAt)}</span>
                  </div>
                </div>
                {!n.read ? (
                  <button
                    type="button"
                    className="secondary small"
                    disabled={processingIds.includes(n.id)}
                    onClick={() => markAsRead(n.id)}
                  >
                    {processingIds.includes(n.id) ? '...' : 'Прочитано'}
                  </button>
                ) : (
                  <span className="muted small">Прочитано</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
