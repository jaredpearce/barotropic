import { describe, expect, it } from 'vitest';
import type { ObservationStations } from '@/lib/schemas';
import { normalizeObservationStations } from './stations';

function makeStations(): ObservationStations {
  return {
    features: [
      {
        id: 'https://api.weather.gov/stations/KRDU',
        geometry: { type: 'Point', coordinates: [-78.79, 35.89] },
        properties: { name: 'Raleigh-Durham International Airport' },
      },
      {
        id: 'https://api.weather.gov/stations/KJNX',
        geometry: { type: 'Point', coordinates: [-78.39, 35.54] },
        properties: { name: 'Johnston Regional Airport' },
      },
      {
        id: 'https://api.weather.gov/stations/KRDU',
        geometry: { type: 'Point', coordinates: [-78.79, 35.89] },
      },
      {
        id: 'https://api.weather.gov/stations/KNONE',
        properties: { name: 'No geometry' },
      },
    ],
  } as ObservationStations;
}

describe('normalizeObservationStations', () => {
  it('Use Case: returns map coordinates in proximity order and collapses duplicates', () => {
    expect(normalizeObservationStations(makeStations())).toEqual([
      {
        id: 'KRDU',
        name: 'Raleigh-Durham International Airport',
        latitude: 35.89,
        longitude: -78.79,
      },
      {
        id: 'KJNX',
        name: 'Johnston Regional Airport',
        latitude: 35.54,
        longitude: -78.39,
      },
    ]);
  });

  it('Use Case: respects the map station limit', () => {
    expect(normalizeObservationStations(makeStations(), 1)).toHaveLength(1);
  });

  it('Use Case: returns an empty list when no stations are available', () => {
    expect(normalizeObservationStations(null)).toEqual([]);
    expect(normalizeObservationStations({ features: [] } as ObservationStations)).toEqual([]);
  });
});
