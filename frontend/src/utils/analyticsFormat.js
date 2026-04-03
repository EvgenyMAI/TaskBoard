export function num(v) {
  return Number(v || 0);
}

export function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatPeriodLabel(fromStr, toStr) {
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
