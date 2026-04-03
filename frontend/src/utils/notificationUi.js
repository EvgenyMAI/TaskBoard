import { formatDateTimeRu } from './dateFormat';

export const NOTIFICATION_TYPE_LABELS = {
  TASK_CREATED: 'Создание',
  TASK_ASSIGNED: 'Назначение',
  TASK_REASSIGNED: 'Переназначение',
  TASK_STATUS_CHANGED: 'Смена статуса',
  TASK_DELETED: 'Удаление задачи',
  COMMENT_DELETED: 'Комментарий',
};

export function formatRelativeTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  if (diff < 0) return formatDateTimeRu(value);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} дн. назад`;
  return formatDateTimeRu(value);
}

export function taskTitleFromBody(body) {
  if (!body) return '';
  const m = String(body).match(/"([^"]+)"/);
  return m ? m[1] : '';
}

export function statusCodeFromBody(body) {
  if (!body) return '';
  const m = String(body).match(/статус:\s*([A-Z_]+)/i);
  return m ? m[1].toUpperCase() : '';
}

export function badgeClassForStatus(statusCode) {
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
