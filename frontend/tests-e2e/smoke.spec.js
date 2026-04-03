import { test, expect } from '@playwright/test';
import {
  apiJson,
  authHeaders,
  waitForAuthReady,
  registerAndLogin,
  injectSession,
  waitForNotificationInApi,
} from './helpers.js';

test('login, create project+task, receive realtime notification', async ({ page, browser }) => {
  const TASKS = process.env.E2E_TASKS_API || 'http://localhost:8082/api';

  await waitForAuthReady();
  const suffix = String(Date.now());
  // ADMIN-сессия приходит из auth.setup.js (первый пользователь в пустой БД); дальше регистрируем только исполнителя.
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();

  const exec = await registerAndLogin({
    username: `e2e_exec_${suffix}`,
    email: `e2e_exec_${suffix}@example.com`,
    password: 'password123',
  });

  const adminToken = await page.evaluate(() => localStorage.getItem('token'));
  expect(adminToken, 'admin token from setup session').toBeTruthy();

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

  const addMember = await apiJson(TASKS, `/projects/${projectId}/members`, {
    method: 'POST',
    headers: authHeaders(adminToken),
    body: JSON.stringify({ userId: exec.userId }),
  });
  if (!(addMember.status === 201 || addMember.status === 409)) {
    throw new Error(`add member failed: ${addMember.status} ${addMember.text}`);
  }

  const execContext = await browser.newContext();
  const execPage = await execContext.newPage();
  try {
    await injectSession(execPage, exec);
    await execPage.goto('/notifications');
    await expect(execPage.getByRole('heading', { name: 'Уведомления' })).toBeVisible();

    const createTask = await apiJson(TASKS, '/tasks', {
      method: 'POST',
      headers: authHeaders(adminToken),
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

    await waitForNotificationInApi(exec.accessToken, 'Вам назначена');
    await execPage.reload();
    const assignCard = execPage.locator('.notification-card').filter({ hasText: 'Вам назначена задача' }).first();
    await expect(assignCard).toBeVisible({ timeout: 15000 });
    await assignCard.locator('.notification-toggle').click();
    await expect(assignCard.locator('.notification-detail-value')).toHaveText(`E2E Task ${suffix}`);
  } finally {
    await execContext.close();
  }
});

test('analytics page renders key sections', async ({ page }) => {
  await waitForAuthReady();
  const suffix = String(Date.now());
  const auth = await registerAndLogin({
    username: `e2e_analytics_${suffix}`,
    email: `e2e_analytics_${suffix}@example.com`,
    password: 'password123',
  });

  await injectSession(page, auth);

  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'Аналитика' })).toBeVisible();
  await expect(page.locator('#analytics-from')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Сводные показатели' })).toBeVisible();
});
