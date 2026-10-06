import { test, expect } from '@playwright/test';

test('Use Case: loads the home page and surfaces the primary app shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/barotropic/i);
  await expect(page.getByText(/barotropic/i)).toBeVisible();
});
