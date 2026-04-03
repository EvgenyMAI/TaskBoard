import { expect } from '@playwright/test';

export async function apiJson(base, path, options = {}) {
  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const txt = await res.text();
    let json = null;
    try {
      json = JSON.parse(txt);
    } catch {
      /* ignore */
    }
    return { ok: res.ok, status: res.status, json, text: txt };
  } catch (e) {
    return { ok: false, status: 0, json: null, text: String(e?.message || e) };
  }
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function waitForAuthReady() {
  const AUTH = process.env.E2E_AUTH_API || 'http://localhost:8081/api/auth';
  for (let i = 0; i < 60; i++) {
    const r = await apiJson(AUTH, '/login', {
      method: 'POST',
      body: JSON.stringify({ username: '___healthcheck___', password: '___healthcheck___' }),
    });
    if (r.status && r.status >= 400) return;
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error('auth-service not ready in time');
}

export async function registerAndLogin({ username, email, password }) {
  const AUTH = process.env.E2E_AUTH_API || 'http://localhost:8081/api/auth';
  for (let i = 0; i < 30; i++) {
    await apiJson(AUTH, '/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    });
    const login = await apiJson(AUTH, '/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (login.ok) return login.json;
    if (login.status === 0) {
      await new Promise((res) => setTimeout(res, 1000));
      continue;
    }
    throw new Error(`login failed: ${login.status} ${login.text}`);
  }
  throw new Error('login failed after retries');
}

/** Сохранить сессию в localStorage (как в UI после логина). */
export async function injectSession(page, auth) {
  await page.goto('/');
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    {
      token: auth.accessToken,
      user: { userId: auth.userId, username: auth.username, roles: auth.roles },
    },
  );
}

/** Первый зарегистрированный пользователь в пустой БД получает ADMIN (см. auth-service). */
export async function assertFreshDbAdmin(auth) {
  const roles = auth.roles || [];
  expect(roles, 'roles from login').toContain('ADMIN');
}

/**
 * Ждём появления уведомления в analytics API (обход: UI обновляет список по SSE, в headless/параллели событие иногда не успевает).
 */
export async function waitForNotificationInApi(accessToken, titleSubstring, options = {}) {
  const base = process.env.E2E_ANALYTICS_API || 'http://localhost:8083/api';
  const timeoutMs = options.timeoutMs ?? 30000;
  const stepMs = options.stepMs ?? 400;
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const r = await apiJson(base, '/notifications', { headers: authHeaders(accessToken) });
    last = r;
    if (r.ok && Array.isArray(r.json)) {
      const hit = r.json.some((n) => String(n.title || '').includes(titleSubstring));
      if (hit) return;
    }
    await new Promise((res) => setTimeout(res, stepMs));
  }
  throw new Error(
    `notification "${titleSubstring}" not in API after ${timeoutMs}ms (last status=${last?.status} body=${String(last?.text || '').slice(0, 200)})`,
  );
}
