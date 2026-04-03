import { test, expect } from '@playwright/test';
import { apiJson, authHeaders } from './helpers.js';

test('dashboard welcome and nav to tasks', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Добро пожаловать/i })).toBeVisible();
  await page.getByRole('link', { name: 'Задачи', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Задачи' })).toBeVisible();
});

test('tasks page shows filters and list sections', async ({ page }) => {
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Задачи' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Фильтры' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Список задач' })).toBeVisible();
});

test('profile page shows account sections', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Личный кабинет' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Данные профиля' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Безопасность' })).toBeVisible();
});

test('notifications page loads', async ({ page }) => {
  await page.goto('/notifications');
  await expect(page.getByRole('heading', { name: 'Уведомления' })).toBeVisible();
});

test('projects list and project detail after API create', async ({ page }) => {
  const TASKS = process.env.E2E_TASKS_API || 'http://localhost:8082/api';
  const suffix = String(Date.now());
  // localStorage недоступен на about:blank; нужен переход на origin приложения.
  await page.goto('/');
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token, 'storageState should provide token').toBeTruthy();

  const created = await apiJson(TASKS, '/projects', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name: `E2E Flow Project ${suffix}`, description: 'e2e flows-pages' }),
  });
  expect(created.ok, created.text).toBeTruthy();
  const id = created.json?.id;
  expect(id, 'project id').toBeTruthy();

  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Проекты' })).toBeVisible();
  await expect(page.getByRole('link', { name: `E2E Flow Project ${suffix}` })).toBeVisible({ timeout: 15000 });

  await page.goto(`/projects/${id}`);
  await expect(page.getByRole('heading', { level: 1, name: `E2E Flow Project ${suffix}` })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Фильтры списка задач' })).toBeVisible();
});
