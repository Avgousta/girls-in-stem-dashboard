import { Page, expect } from '@playwright/test';

export const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    ?? 'aldridmcanda@gmail.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('you@girlsstem.org').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for either a successful redirect or an error toast
  await Promise.race([
    page.waitForURL(/dashboard/, { timeout: 15_000 }),
    page.waitForSelector('[data-sonner-toast]', { timeout: 15_000 }),
  ]);

  const currentUrl = page.url();
  if (!currentUrl.includes('dashboard')) {
    // Grab any visible toast error text to surface in the failure message
    const toastText = await page.locator('[data-sonner-toast]').textContent().catch(() => '(no toast)');
    throw new Error(`Login failed — stayed on ${currentUrl}. Toast: ${toastText}`);
  }
}
