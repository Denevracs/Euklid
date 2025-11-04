import { test, expect } from '@playwright/test';

test('homepage has headline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /collaborative reasoning/i })).toBeVisible();
});
