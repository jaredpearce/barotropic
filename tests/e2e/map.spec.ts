import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/nws/alerts/point**', (route) =>
    route.fulfill({
      json: {
        point: { latitude: 35.7915, longitude: -78.7811 },
        alerts: [
          {
            source: 'NWS',
            id: 'alert-1',
            retrievedAt: new Date().toISOString(),
            issuedAt: new Date().toISOString(),
            event: 'Heat Advisory',
            headline: 'Heat advisory in effect',
            severity: 'Moderate',
            certainty: 'Likely',
            urgency: 'Expected',
            status: 'Actual',
            areaDescription: 'Wake / Chatham / Durham counties',
            effective: new Date().toISOString(),
            expires: '2099-10-26T23:00:00Z',
            description: 'Hot and humid conditions.',
            instruction: 'Drink water.',
            senderName: 'NWS Raleigh',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-79, 35],
                  [-78, 35],
                  [-78, 36],
                  [-79, 36],
                  [-79, 35],
                ],
              ],
            },
          },
        ],
      },
    }),
  );
  await page.route('**/api/nws/point**', (route) =>
    route.fulfill({
      json: {
        location: { latitude: 35.7915, longitude: -78.7811 },
        currentConditions: null,
        stations: [
          {
            id: 'KRDU',
            name: 'Raleigh-Durham International Airport',
            latitude: 35.89,
            longitude: -78.79,
          },
        ],
        forecast: [],
      },
    }),
  );
});

test('Use Case: renders the desk map with controls, marker, and attribution', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/');

  const map = page.getByRole('region', { name: 'Weather map for Cary, NC' });
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });

  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();
  await expect(page.locator('.maplibregl-ctrl-scale')).toBeVisible();
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('OpenFreeMap');
  await expect(page.getByRole('img', { name: 'Selected location: Cary, NC' })).toBeVisible();
  await expect(page.getByTestId('map-overlay-summary')).toContainText('1 alert');
  await expect(page.getByTestId('map-overlay-summary')).toContainText('1 station');

  expect(consoleErrors.filter((message) => /worker failed to load/i.test(message))).toEqual([]);
});
