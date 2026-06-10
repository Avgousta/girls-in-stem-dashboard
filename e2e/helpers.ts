import { Page } from '@playwright/test';

export const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    ?? 'aldridmcanda@gmail.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('you@girlsstem.org').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
}
