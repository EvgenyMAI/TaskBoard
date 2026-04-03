import { TASKS_API, authHeaders, authOnlyHeaders, errorMessageFromResponse } from './client';

/**
 * @param {Record<string, string|number|boolean|undefined>} [params]
 * @returns {Promise<import('../types/api').TaskSummary[]>}
 */
export async function getTasks(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${TASKS_API}/tasks${q ? `?${q}` : ''}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить задачи');
  const data = await res.json();
  return data.content !== undefined ? data.content : data;
}

/** @returns {Promise<import('../types/api').TaskSummary & Record<string, unknown>>} */
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
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res, 'Не удалось создать задачу'));
  }
  return res.json();
}

export async function updateTask(id, data) {
  const res = await fetch(`${TASKS_API}/tasks/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(await errorMessageFromResponse(res, 'Не удалось обновить задачу'));
  }
  return res.json();
}

export async function deleteTask(id) {
  const res = await fetch(`${TASKS_API}/tasks/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить задачу');
}

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

export async function getAttachments(taskId) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/attachments`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить вложения');
  return res.json();
}

export async function uploadAttachmentFile(taskId, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/attachments/upload`, {
    method: 'POST',
    headers: authOnlyHeaders(),
    body: form,
  });
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error('Файл слишком большой. Максимум: 25 МБ');
    }
    throw new Error('Не удалось загрузить файл');
  }
  return res.json();
}

export async function deleteAttachment(taskId, attachmentId) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить вложение');
}

export async function getAttachmentBlob(taskId, attachmentId, { preview = false } = {}) {
  const endpoint = preview ? 'preview' : 'download';
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/attachments/${attachmentId}/${endpoint}`, {
    headers: authOnlyHeaders(),
  });
  if (!res.ok) {
    throw new Error('Не удалось получить файл');
  }
  const blob = await res.blob();
  return {
    blob,
    contentType: res.headers.get('content-type') || 'application/octet-stream',
  };
}

export async function getTaskHistory(taskId, limit = 50) {
  const res = await fetch(`${TASKS_API}/tasks/${taskId}/history?limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}
