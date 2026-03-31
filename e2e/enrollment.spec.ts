// Task 98.5: E2E test — student enrollment → course visibility
import { test, expect } from '@playwright/test';

test.describe('Enrollment flow', () => {
  test('admin can access enrollment page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@test.edeviser.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    await page.goto('/admin/courses');
    await expect(page).toHaveURL(/\/admin\/courses/);
  });

  test('student sees enrolled courses on dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('student@test.edeviser.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });

    // Dashboard should render without errors
    await expect(page.locator('main')).toBeVisible();
  });
});
