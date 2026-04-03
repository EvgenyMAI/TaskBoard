import { USERS_API, authHeaders } from './client';

export async function getUsers() {
  const res = await fetch(USERS_API, { headers: authHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить пользователей');
  return res.json();
}
