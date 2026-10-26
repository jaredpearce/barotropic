import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/weather/forecast', () => {
    return HttpResponse.json(
      {
        location: 'Cary',
        summary: 'Partly cloudy',
        temperature: 84,
        units: 'F',
        confidence: 'moderate',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }),
  http.get('/api/nws/alerts/point', () => {
    return HttpResponse.json(
      {
        point: { latitude: 35.7915, longitude: -78.7811 },
        alerts: [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }),
  http.get('/api/nws/point', () => {
    return HttpResponse.json(
      {
        location: { latitude: 35.7915, longitude: -78.7811 },
        currentConditions: null,
        forecast: [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }),
];
