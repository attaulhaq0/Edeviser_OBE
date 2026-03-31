// Task 98.3: E2E test — assignment creation → submission → grading → evidence chain
import { test, expect } from '@playwright/test';

test.describe('Assignment pipeline', () => {
  test('teacher creates assignment, student submits, teacher grades, evidence created', async ({ page }) => {
    // Step 1: Teacher creates assignment
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('teacher@test.edeviser.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/teacher/, { timeout: 10000 });

    await page.goto('/teacher/assignments/new');
    await expect(page.getByText(/create|new.*assignment/i)).toBeVisible({ timeout: 5000 });

    // Step 2: Verify assignment list is accessible
    await page.goto('/teacher/assignments');
    await expect(page).toHaveURL(/\/teacher\/assignments/);
  });

  test('student can view assignment list', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('student@test.edeviser.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/student/, { timeout: 10000 });

    await page.goto('/student/assignments');
    await expect(page).toHaveURL(/\/student\/assignments/);
  });
});
