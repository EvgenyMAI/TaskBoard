import Skeleton from '../Skeleton';
import { STATUS_LABELS } from '../../constants/taskStatus';
import { formatDateTimeRu } from '../../utils/dateFormat';
import {
  NOTIFICATION_TYPE_LABELS,
  formatRelativeTime,
  taskTitleFromBody,
  statusCodeFromBody,
  badgeClassForStatus,
} from '../../utils/notificationUi';

export default function NotificationsList({
  loading,
  notifications,
  expanded,
  onToggle,
}) {
  if (loading) {
    return (
      <ul className="notifications-skeleton-list">
        <li className="card"><Skeleton style={{ height: 56 }} /></li>
        <li className="card"><Skeleton style={{ height: 56 }} /></li>
        <li className="card"><Skeleton style={{ height: 56 }} /></li>
      </ul>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="card profile-section">
        <p className="muted">Уведомлений пока нет.</p>
      </div>
    );
  }

  return (
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
              onClick={() => onToggle(n)}
            >
              <div className="notification-toggle-inner">
                <div className="notification-preview-row">
                  {!n.read && <span className="dot-unread" aria-hidden="true" />}
                  <p className="notification-title notification-preview-title">
                    <span className="notification-title-text">{n.title || 'Уведомление'}</span>
                    {n.type ? (
                      <span className="notification-type-chip">
                        {NOTIFICATION_TYPE_LABELS[n.type] || n.type}
                      </span>
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
                  <span className="meta-chip">{formatDateTimeRu(n.createdAt)}</span>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
