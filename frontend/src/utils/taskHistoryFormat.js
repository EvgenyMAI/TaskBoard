import { formatDateTimeRu } from './dateFormat';

/** Значение поля истории задачи для отображения «было / стало». */
export function formatTaskHistoryFieldValue(fieldName, raw, { statusLabels, userName }) {
  if (raw == null || raw === '') return '—';
  if (fieldName === 'status') return statusLabels[raw] || raw;
  if (fieldName === 'assigneeId') {
    const id = Number(raw);
    return Number.isFinite(id) ? userName(id) : String(raw);
  }
  if (fieldName === 'dueDate') return formatDateTimeRu(raw);
  return String(raw);
}
