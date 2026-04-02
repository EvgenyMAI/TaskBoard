import { test, expect } from '@playwright/test';

async function apiJson(base, path, options = {}) {
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
    try { json = JSON.parse(txt); } catch { /* ignore */ }
    return { ok: res.ok, status: res.status, json, text: txt };
  } catch (e) {
    return { ok: false, status: 0, json: null, text: String(e?.message || e) };
  }
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function waitForAuthReady() {
  const AUTH = process.env.E2E_AUTH_API || 'http://localhost:8081/api/auth';
  for (let i = 0; i < 60; i++) {
    // POST /login with dummy creds should return 4xx when ready, but fetch must succeed.
    const r = await apiJson(AUTH, '/login', {
      method: 'POST',
      body: JSON.stringify({ username: '___healthcheck___', password: '___healthcheck___' }),
    });
    if (r.status && r.status >= 400) return;
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error('auth-service not ready in time');
}

async function registerAndLogin({ username, email, password }) {
  const AUTH = process.env.E2E_AUTH_API || 'http://localhost:8081/api/auth';
  // Retry for transient connection resets while container is starting.
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
    // If service isn't reachable yet (status 0), wait and retry.
    if (login.status === 0) {
      await new Promise((res) => setTimeout(res, 1000));
      continue;
    }
    throw new Error(`login failed: ${login.status} ${login.text}`);
  }
  throw new Error('login failed after retries');
}

test('login, create project+task, receive realtime notification', async ({ page, browser }) => {
  const TASKS = process.env.E2E_TASKS_API || 'http://localhost:8082/api';

  await waitForAuthReady();
  const suffix = String(Date.now());
  const admin = await registerAndLogin({
    username: `e2e_admin_${suffix}`,
    email: `e2e_admin_${suffix}@example.com`,
    password: 'password123',
  });
  const exec = await registerAndLogin({
    username: `e2e_exec_${suffix}`,
    email: `e2e_exec_${suffix}@example.com`,
    password: 'password123',
  });

  // Inject session into localStorage (skip UI login form)
  await page.goto('/');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, {
    token: admin.accessToken,
    user: { userId: admin.userId, username: admin.username, roles: admin.roles },
  });

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();

  // Create project via UI (button exists on page)
  await page.getByRole('button', { name: /создать проект/i }).click();
  const projectModal = page.locator('.modal', { hasText: /новый проект/i });
  await expect(projectModal).toBeVisible();
  await projectModal.locator('input[type="text"]').first().fill(`E2E Project ${suffix}`);
  await projectModal.getByRole('button', { name: /^создать$/i }).click();
  await expect(page.getByRole('link', { name: `E2E Project ${suffix}` })).toBeVisible({ timeout: 15000 });

  const projectLink = page.getByRole('link', { name: `E2E Project ${suffix}` });
  const href = await projectLink.getAttribute('href');
  const projectId = Number(String(href || '').split('/').pop());
  if (!projectId) throw new Error('Failed to resolve project id from UI link');

  // Stable setup through API: add executor to project.
  const addMember = await apiJson(TASKS, `/projects/${projectId}/members`, {
    method: 'POST',
    headers: authHeaders(admin.accessToken),
    body: JSON.stringify({ userId: exec.userId }),
  });
  if (!(addMember.status === 201 || addMember.status === 409)) {
    throw new Error(`add member failed: ${addMember.status} ${addMember.text}`);
  }

  // Open notifications as executor first, then create task to verify near-realtime delivery.
  const execContext = await browser.newContext();
  const execPage = await execContext.newPage();
  try {
    await execPage.goto('/');
    await execPage.evaluate(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, {
      token: exec.accessToken,
      user: { userId: exec.userId, username: exec.username, roles: exec.roles },
    });
    await execPage.goto('/notifications');
    await expect(execPage.getByRole('heading', { name: 'Уведомления' })).toBeVisible();

    const createTask = await apiJson(TASKS, '/tasks', {
      method: 'POST',
      headers: authHeaders(admin.accessToken),
      body: JSON.stringify({
        title: `E2E Task ${suffix}`,
        description: 'e2e smoke task',
        projectId,
        assigneeId: exec.userId,
        status: 'OPEN',
      }),
    });
    if (!createTask.ok) {
      throw new Error(`create task failed: ${createTask.status} ${createTask.text}`);
    }

    await expect(execPage.getByText(`E2E Task ${suffix}`)).toBeVisible({ timeout: 30000 });
  } finally {
    await execContext.close();
  }
});

