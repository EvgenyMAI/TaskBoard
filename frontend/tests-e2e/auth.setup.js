import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as setup } from '@playwright/test';
import { injectSession, registerAndLogin, waitForAuthReady, assertFreshDbAdmin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const authFile = join(__dirname, '.auth', 'user.json');

setup('bootstrap admin session (first user on empty DB)', async ({ page }) => {
  await waitForAuthReady();
  const suffix = String(Date.now());
  const auth = await registerAndLogin({
    username: `e2e_setup_admin_${suffix}`,
    email: `e2e_setup_admin_${suffix}@example.com`,
    password: 'password123',
  });
  await assertFreshDbAdmin(auth);

  mkdirSync(dirname(authFile), { recursive: true });
  await injectSession(page, auth);
  await page.context().storageState({ path: authFile });
});
