import { ANALYTICS_API, authHeaders } from './client';

export async function getReportSummary(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${ANALYTICS_API}/reports/summary${q ? `?${q}` : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить отчёт');
  return res.json();
}

export async function getReportByProject(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${ANALYTICS_API}/reports/by-project${q ? `?${q}` : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить аналитику по проектам');
  return res.json();
}

export async function getReportByAssignee(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${ANALYTICS_API}/reports/by-assignee${q ? `?${q}` : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить аналитику по исполнителям');
  return res.json();
}

export async function downloadReportCsv(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${ANALYTICS_API}/reports/export${q ? `?${q}` : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось выгрузить CSV');
  return res.blob();
}

export async function getNotifications(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${ANALYTICS_API}/notifications${q ? `?${q}` : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить уведомления');
  return res.json();
}

export async function getUnreadNotificationsCount() {
  const res = await fetch(`${ANALYTICS_API}/notifications/unread`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить количество непрочитанных');
  return res.json();
}

export async function markNotificationRead(id) {
  const res = await fetch(`${ANALYTICS_API}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось обновить уведомление');
  return res.json();
}
