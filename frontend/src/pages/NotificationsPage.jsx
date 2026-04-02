import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { ANALYTICS_API, getToken, getNotifications, markNotificationRead } from '../api';
import { useAuth } from '../context/AuthContext';
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

function formatRelativeTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  if (diff < 0) return formatDate(value);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} дн. назад`;
  return formatDate(value);
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [filterRead, setFilterRead] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const toast = useToast();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const load = useCallback((showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    const params = {};
    if (filterRead) params.read = filterRead === 'read';
    if (filterType) params.type = filterType;
    if (filterSearch.trim()) params.q = filterSearch.trim();

    getNotifications(params)
      .then((list) => {
        const sorted = [...(list || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(sorted);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filterRead, filterType, filterSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let es;
    try {
      es = new EventSource(`${ANALYTICS_API}/notifications/stream?access_token=${encodeURIComponent(token)}`);
      es.addEventListener('notification', () => load(false));
    } catch {
      // fallback: ручное обновление
    }

    return () => {
      if (es) es.close();
    };
  }, [load]);

  const markAsRead = async (id, silent = false) => {
    const current = notifications.find((n) => n.id === id);
    if (!current || current.read) return;
    try {
      await markNotificationRead(id);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        if (filterRead === 'unread') return updated.filter((n) => !n.read);
        return updated;
      });
      if (!silent) toast.success('Отмечено как прочитанное');
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      for (const item of unread) {
        // eslint-disable-next-line no-await-in-loop
        await markNotificationRead(item.id);
      }
      setNotifications((prev) => {
        const allRead = prev.map((n) => ({ ...n, read: true }));
        if (filterRead === 'unread') return [];
        return allRead;
      });
      toast.success(`Отмечено прочитанными: ${unread.length}`);
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const toggleExpanded = (n) => {
    const id = n.id;
    const willOpen = !expanded.has(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (willOpen && !n.read) {
      markAsRead(id, true);
    }
  };

  const username = user?.username || '';
  const heroLetter = username ? username.charAt(0).toUpperCase() : '•';

  return (
    <Layout>
      <div className="container page-width notifications-page">
        <header className="card profile-hero">
          <div className="profile-hero-main">
            <div className="profile-avatar profile-avatar-notifications" aria-hidden="true">{heroLetter}</div>
            <div className="profile-hero-text">
              <h1>Уведомления</h1>
              <div className="profile-hero-line">
                <p className="profile-hero-sub">
                  {username ? `События для ${username}` : 'События по вашим задачам'}
                </p>
                <div className="profile-role-chips" aria-live="polite">
                  {unreadCount > 0 ? (
                    <span className="profile-role-chip notifications-unread-pill">
                      {unreadCount} непрочит.
                    </span>
                  ) : (
                    <span className="muted small profile-role-chips-empty">Все прочитано</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="profile-hero-hint profile-hero-hint-row">
            <p className="muted small profile-hero-hint-text">
              Создание и назначение задач, смена статуса — обновления приходят по SSE в реальном времени.
            </p>
            <button
              type="button"
              className="secondary small"
              onClick={markAllAsRead}
              disabled={unreadCount === 0 || markingAll}
            >
              {markingAll ? '…' : 'Все прочитанными'}
            </button>
          </div>
        </header>

        <section className="card profile-section" aria-labelledby="notifications-filters-heading">
          <div className="profile-section-head">
            <span className="profile-section-icon" aria-hidden="true">◆</span>
            <h2 id="notifications-filters-heading">Фильтры</h2>
          </div>
          <div className="form-row notifications-filters-row">
            <div className="form-group">
              <label htmlFor="nf-read">Статус</label>
              <select id="nf-read" value={filterRead} onChange={(e) => setFilterRead(e.target.value)}>
                <option value="">Все</option>
                <option value="unread">Непрочитанные</option>
                <option value="read">Прочитанные</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="nf-type">Тип</label>
              <select id="nf-type" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Все типы</option>
                <option value="TASK_CREATED">Создание</option>
                <option value="TASK_ASSIGNED">Назначение</option>
                <option value="TASK_REASSIGNED">Переназначение</option>
                <option value="TASK_STATUS_CHANGED">Смена статуса</option>
              </select>
            </div>
            <div className="form-group notifications-filter-search">
              <label htmlFor="nf-q">Поиск</label>
              <input
                id="nf-q"
                type="search"
                placeholder="Текст уведомления"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        </section>

        {error && <p className="error notifications-global-error">{error}</p>}

        {loading ? (
          <ul className="notifications-skeleton-list">
            <li className="card"><Skeleton style={{ height: 56 }} /></li>
            <li className="card"><Skeleton style={{ height: 56 }} /></li>
            <li className="card"><Skeleton style={{ height: 56 }} /></li>
          </ul>
        ) : notifications.length === 0 ? (
          <div className="card profile-section">
            <p className="muted">Уведомлений пока нет.</p>
          </div>
        ) : (
          <ul className="notifications-accordion-list">
            {notifications.map((n) => {
              const isOpen = expanded.has(n.id);
              const title = taskTitleFromBody(n.body);
              const statusCode = n.type === 'TASK_STATUS_CHANGED' ? statusCodeFromBody(n.body) : '';
              const statusLabel = statusCode ? (STATUS_LABELS[statusCode] || statusCode) : '';
              const badgeClass = badgeClassForStatus(statusCode);
              return (
                <li
                  key={n.id}
                  className={`card notification-card ${n.read ? 'is-read' : 'is-unread'} ${isOpen ? 'is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="notification-toggle"
                    aria-expanded={isOpen}
                    aria-controls={`notification-panel-${n.id}`}
                    id={`notification-trigger-${n.id}`}
                    onClick={() => toggleExpanded(n)}
                  >
                    <div className="notification-toggle-inner">
                      <div className="notification-preview-row">
                        {!n.read && <span className="dot-unread" aria-hidden="true" />}
                        <p className="notification-title notification-preview-title">
                          <span className="notification-title-text">{n.title || 'Уведомление'}</span>
                          {n.type ? (
                            <span className="notification-type-chip">{TYPE_LABELS[n.type] || n.type}</span>
                          ) : null}
                        </p>
                      </div>
                      <span className="muted small notification-preview-when">{formatRelativeTime(n.createdAt)}</span>
                    </div>
                    <span className={`profile-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div
                      className="notification-panel"
                      id={`notification-panel-${n.id}`}
                      role="region"
                      aria-labelledby={`notification-trigger-${n.id}`}
                    >
                      {title ? (
                        <div className="notification-detail-line">
                          <span className="notification-detail-label">Задача</span>
                          <span className="notification-detail-value">{title}</span>
                        </div>
                      ) : null}
                      {statusCode ? (
                        <div className="notification-detail-line">
                          <span className="notification-detail-label">Статус</span>
                          <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                        </div>
                      ) : null}
                      <p className="notification-body-full">{n.body || '—'}</p>
                      <div className="notification-meta notification-meta-full">
                        <span className="meta-chip">{formatDate(n.createdAt)}</span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
}
