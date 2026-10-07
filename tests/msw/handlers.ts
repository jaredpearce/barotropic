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
];
