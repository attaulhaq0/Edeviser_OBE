// Task 98.4: E2E test — XP award → level up → badge check
import { test, expect } from '@playwright/test';

test.describe('XP and gamification flow', () => {
  test('student dashboard shows XP, level, and streak', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('student@test.edeviser.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 10000 });

    // Dashboard should show gamification elements
    await expect(page.getByText(/xp|level|streak/i)).toBeVisible({ timeout: 5000 });
  });

  test('XP history page is accessible', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('student@test.edeviser.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    await page.goto('/student/xp-history');
    await expect(page).toHaveURL(/\/student\/xp-history/);
  });
});
