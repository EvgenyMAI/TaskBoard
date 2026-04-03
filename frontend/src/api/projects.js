import { TASKS_API, authHeaders } from './client';

/** @returns {Promise<import('../types/api').ProjectSummary[]>} */
export async function getProjects() {
  const res = await fetch(`${TASKS_API}/projects`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить проекты');
  return res.json();
}

/** @returns {Promise<import('../types/api').ProjectSummary & Record<string, unknown>>} */
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
