// Task 98.2: E2E test — login → dashboard redirect
import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('redirects to role-appropriate dashboard on valid login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /log in|sign in/i })).toBeVisible();

    await page.getByLabel(/email/i).fill('admin@test.edeviser.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('wrong@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 });
  });

  test('locks account after failed attempts', async ({ page }) => {
    await page.goto('/login');

    for (let i = 0; i < 6; i++) {
      await page.getByLabel(/email/i).fill('locktest@test.com');
      await page.getByLabel(/password/i).fill('wrong');
      await page.getByRole('button', { name: /log in|sign in/i }).click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/locked|too many/i)).toBeVisible({ timeout: 5000 });
  });
});
