/** Дата и время для отображения в UI (карточки, история, комментарии). */
export function formatDateTimeRu(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ru-RU');
  } catch {
    return String(value);
  }
}

/** Только дата — для сроков в списках задач. */
export function formatDueDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU');
}
