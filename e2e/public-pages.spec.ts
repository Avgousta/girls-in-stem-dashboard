import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('home / root redirects or loads', async ({ page }) => {
    const response = await page.goto('/');
    // Should either load a page or redirect — not a 500
    expect(response?.status()).not.toBe(500);
  });

  test('login page has correct title elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toContainText('Girls in STEM');
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    // Should load the register form without crashing
    expect(page.url()).toContain('register');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('forgot password page loads', async ({ page }) => {
    const response = await page.goto('/forgot-password');
    expect(response?.status()).not.toBe(500);
  });

  test('no page crashes with unhandled JS error on login', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('hydration'))).toHaveLength(0);
  });
});
