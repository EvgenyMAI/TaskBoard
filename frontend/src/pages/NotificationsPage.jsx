import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { ANALYTICS_API, getToken, getNotifications, markNotificationRead } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NotificationsPageHeader from '../components/notifications/NotificationsPageHeader';
import NotificationsFiltersSection from '../components/notifications/NotificationsFiltersSection';
import NotificationsList from '../components/notifications/NotificationsList';

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
        <NotificationsPageHeader
          heroLetter={heroLetter}
          username={username}
          unreadCount={unreadCount}
          markingAll={markingAll}
          onMarkAllRead={markAllAsRead}
        />

        <NotificationsFiltersSection
          filterRead={filterRead}
          filterType={filterType}
          filterSearch={filterSearch}
          onFilterReadChange={setFilterRead}
          onFilterTypeChange={setFilterType}
          onFilterSearchChange={setFilterSearch}
        />

        {error && <p className="error notifications-global-error">{error}</p>}

        <NotificationsList
          loading={loading}
          notifications={notifications}
          expanded={expanded}
          onToggle={toggleExpanded}
        />
      </div>
    </Layout>
  );
}
