export const AUTH_API = import.meta.env.VITE_AUTH_API || 'http://localhost:8081/api/auth';
export const USERS_API = import.meta.env.VITE_USERS_API || 'http://localhost:8081/api/users';
export const TASKS_API = import.meta.env.VITE_TASKS_API || 'http://localhost:8082/api';
export const ANALYTICS_API = import.meta.env.VITE_ANALYTICS_API || 'http://localhost:8083/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function authOnlyHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Читает сообщение из JSON-ответа Spring (поле message у ResponseStatusException и др.). */
export async function errorMessageFromResponse(res, fallback) {
  try {
    const text = await res.text();
    if (!text?.trim()) return fallback;
    const j = JSON.parse(text);
    if (typeof j.message === 'string' && j.message.trim()) return j.message.trim();
  } catch {
    /* не JSON или сеть */
  }
  return fallback;
}
