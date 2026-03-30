const AUTH_API = import.meta.env.VITE_AUTH_API || 'http://localhost:8081/api/auth';
const USERS_API = import.meta.env.VITE_USERS_API || 'http://localhost:8081/api/users';
const TASKS_API = import.meta.env.VITE_TASKS_API || 'http://localhost:8082/api';
const ANALYTICS_API = import.meta.env.VITE_ANALYTICS_API || 'http://localhost:8083/api';

function getToken() {
  return localStorage.getItem('token');
}

export function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ——— Auth ———
export async function login(username, password) {
  const res = await fetch(`${AUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Ошибка входа');
  }
  return res.json();
}

export async function register(username, password, email) {
  const res = await fetch(`${AUTH_API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details?.username || err.details?.email || 'Ошибка регистрации');
  }
  return res.json();
}

export async function getMyProfile() {
  const res = await fetch(`${AUTH_API}/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить профиль');
  return res.json();
}

export async function updateMyProfile(data) {
  const res = await fetch(`${AUTH_API}/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details?.email || err.details?.username || 'Не удалось обновить профиль');
  }
  return res.json();
}

export async function changeMyPassword(data) {
  const res = await fetch(`${AUTH_API}/me/password`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details?.newPassword || 'Не удалось изменить пароль');
  }
  return res.json();
}

// ——— Users (for assignee dropdown) ———
export async function getUsers() {
  const res = await fetch(USERS_API, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить пользователей');
  return res.json();
}

// ——— Roles (admin-only) ———
export async function updateUserRoles(userId, roles) {
  const res = await fetch(`${AUTH_API}/users/${userId}/roles`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ roles }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Не удалось обновить роли');
  }
  return res.json();
}

// ——— Projects ———
export async function getProjects() {
  const res = await fetch(`${TASKS_API}/projects`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить проекты');
  return res.json();
}

export async function getProject(id) {
  const res = await fetch(`${TASKS_API}/projects/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Проект не найден');
  return res.json();
}

export async function createProject(data) {
  const res = await fetch(`${TASKS_API}/projects`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось создать проект');
  return res.json();
}

export async function updateProject(id, data) {
  const res = await fetch(`${TASKS_API}/projects/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось обновить проект');
  return res.json();
}

export async function deleteProject(id) {
  const res = await fetch(`${TASKS_API}/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить проект');
}

// ——— Project members ———
export async function getProjectMembers(projectId) {
  const res = await fetch(`${TASKS_API}/projects/${projectId}/members`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить участников проекта');
  return res.json();
}

export async function addProjectMember(projectId, userId) {
  const res = await fetch(`${TASKS_API}/projects/${projectId}/members`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.details?.userId || 'Не удалось добавить участника');
  }
}

export async function removeProjectMember(projectId, userId) {
  const res = await fetch(`${TASKS_API}/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить участника');
}

// ——— Tasks ———
export async function getTasks(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${TASKS_API}/tasks${q ? `?${q}` : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить задачи');
  const data = await res.json();
  return data.content !== undefined ? data.content : data;
}

export async function getTask(id) {
  const res = await fetch(`${TASKS_API}/tasks/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Задача не найдена');
  return res.json();
}

export async function createTask(data) {
  const res = await fetch(`${TASKS_API}/tasks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось создать задачу');
  return res.json();
}

export async function updateTask(id, data) {
  const res = await fetch(`${TASKS_API}/tasks/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось обновить задачу');
  return res.json();
}

export async function deleteTask(id) {
  const res = await fetch(`${TASKS_API}/tasks/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить задачу');
}

// ——— Comments ———
export async function getComments(taskId) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/comments`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить комментарии');
  return res.json();
}

export async function addComment(taskId, text) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Не удалось добавить комментарий');
  return res.json();
}

export async function deleteComment(taskId, commentId) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить комментарий');
}

// ——— Attachments ———
export async function getAttachments(taskId) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/attachments`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить вложения');
  return res.json();
}

export async function addAttachment(taskId, filePathOrUrl, fileName) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/attachments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ filePathOrUrl, fileName: fileName || filePathOrUrl }),
  });
  if (!res.ok) throw new Error('Не удалось добавить вложение');
  return res.json();
}

export async function deleteAttachment(taskId, attachmentId) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить вложение');
}

// ——— Task history ———
export async function getTaskHistory(taskId, limit = 50) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/history?limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}

// ——— Reports (stub) ———
export async function getReportSummary() {
  const res = await fetch(`${ANALYTICS_API}/reports/summary`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить отчёт');
  return res.json();
}

// ——— Notifications ———
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

export { AUTH_API, TASKS_API, ANALYTICS_API, getToken };
