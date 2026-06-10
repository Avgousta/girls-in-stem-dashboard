import { test, expect } from '@playwright/test';

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    ?? 'aldridmcanda@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('you@girlsstem.org')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error with wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@girlsstem.org').fill('wrong@example.com');
    await page.getByPlaceholder('you@girlsstem.org').press('Tab');
    // Fill password field (second input)
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should stay on login page and show an error toast or message
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated user is redirected to login from /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated user is redirected to login from /learners', async ({ page }) => {
    await page.goto('/learners');
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated user is redirected to login from /interventions', async ({ page }) => {
    await page.goto('/interventions');
    await expect(page).toHaveURL(/login/);
  });

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /show password/i }).click();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  // Skipped when no credentials provided — run locally with E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD set
  test('admin can log in and reach dashboard', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD not set');
    await page.goto('/login');
    await page.getByPlaceholder('you@girlsstem.org').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
  });
});
