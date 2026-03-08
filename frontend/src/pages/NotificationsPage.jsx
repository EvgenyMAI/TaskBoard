import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { getNotifications, markNotificationRead } from '../api';
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
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [filterRead, filterType, filterSearch, filterFrom, filterTo]);

  const markAsRead = async (id, silent = false) => {
    setProcessingIds((prev) => [...prev, id]);
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (!silent) toast.success('Уведомление отмечено как прочитанное');
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
  };

  return (
    <Layout>
      <div className="container page-width">
        <div className="card page-intro">
          <h1>Уведомления</h1>
          <p className="muted">Лента событий по задачам с фильтрацией и автообновлением.</p>
        </div>
        <div className="page-header">
          <div>
            <h2>Лента уведомлений</h2>
            <p className="muted">
              Непрочитанных: {unreadCount}. Здесь отображаются события по задачам (создание, назначение, смена статуса).
            </p>
          </div>
          <div className="page-header-actions">
            <button type="button" className="secondary" onClick={() => load()}>
              Обновить
            </button>
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
                  <p className="notification-title">
                    {n.title || 'Уведомление'}
                    {!n.read && <span className="dot-unread" />}
                  </p>
                  <p className="muted small">{n.body || '—'}</p>
                  <p className="muted small">{formatDate(n.createdAt)}</p>
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
