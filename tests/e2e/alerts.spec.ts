import { test, expect } from '@playwright/test';

const POINT = { latitude: 35.7915, longitude: -78.7811 };

const POLYGON_ALERT = {
  source: 'NWS',
  id: 'polygon-alert',
  retrievedAt: '2026-10-26T12:00:00Z',
  issuedAt: '2026-10-26T11:00:00Z',
  event: 'Heat Advisory',
  headline: 'Heat advisory in effect',
  severity: 'Moderate',
  certainty: 'Likely',
  urgency: 'Expected',
  status: 'Actual',
  areaDescription: 'Wake / Chatham / Durham counties',
  effective: '2026-10-26T12:00:00Z',
  expires: '2099-10-26T23:00:00Z',
  description: 'Hot and humid conditions.',
  instruction: 'Drink water and limit outdoor activity.',
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
};

const AREA_ALERT = {
  ...POLYGON_ALERT,
  id: 'area-alert',
  event: 'Flood Watch',
  severity: 'Minor',
  areaDescription: 'Central North Carolina',
  geometry: null,
};

test('Use Case: renders polygon and area-based active alerts in the sidebar', async ({
  page,
}) => {
  await page.route('**/api/nws/alerts/point**', (route) =>
    route.fulfill({ json: { point: POINT, alerts: [POLYGON_ALERT, AREA_ALERT] } })
  );

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Active alerts (2)' })
  ).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'Heat Advisory, Moderate severity' })
  ).toBeVisible();
  await expect(page.getByText('Affects this location')).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Polygon preview for Heat Advisory' })
  ).toBeVisible();
  await expect(
    page.getByText(
      'Area-based alert. NWS did not publish a polygon for this alert.'
    )
  ).toBeVisible();
  await expect(page.getByText('Highest: Moderate')).toBeVisible();
});

test('Use Case: reports when active alerts cannot be loaded', async ({ page }) => {
  await page.route('**/api/nws/alerts/point**', (route) =>
    route.fulfill({ status: 502, json: { error: 'NWS unavailable' } })
  );

  await page.goto('/');

  await expect(
    page.getByText('Unable to load alerts for this location.')
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
