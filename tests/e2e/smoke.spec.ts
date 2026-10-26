import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/nws/alerts/point**', (route) =>
    route.fulfill({
      json: {
        point: { latitude: 35.7915, longitude: -78.7811 },
        alerts: [],
      },
    })
  );
});

test('Use Case: loads the home page and surfaces the primary app shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/barotropic/i);
  await expect(page.getByText('◉ Barotropic')).toBeVisible();
});

test('Use Case: uses granted browser geolocation to select the current city', async ({ page }) => {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 35.78, longitude: -78.64 });
  await page.route('**/api/nws/point/location**', (route) =>
    route.fulfill({
      json: {
        location: { latitude: 35.78, longitude: -78.64, city: 'Raleigh', state: 'NC' },
      },
    })
  );

  await page.goto('/');
  await page.getByRole('button', { name: /Cary, NC/i }).click();
  await page.getByRole('button', { name: 'Use my current location' }).click();

  await expect(page.getByRole('button', { name: /Raleigh, NC/i })).toBeVisible();
});
