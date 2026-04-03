import { AUTH_API, authHeaders, errorMessageFromResponse } from './client';

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
