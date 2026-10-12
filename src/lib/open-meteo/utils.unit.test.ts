import { describe, expect, it } from 'vitest';
import {
  buildOpenMeteoForecastQuery,
  normalizeOpenMeteoModels,
  OPEN_METEO_MODELS,
} from './utils';

describe('Open-Meteo model configuration', () => {
  it('Use Case: selects two named models by default and maps them to provider IDs', () => {
    expect(normalizeOpenMeteoModels(null)).toEqual(['gfs', 'hrrr']);
    expect(OPEN_METEO_MODELS.gfs.id).toBe('ncep_gfs_seamless');
    expect(OPEN_METEO_MODELS.hrrr.id).toBe('ncep_hrrr_conus');
  });

  it('Use Case: accepts display aliases and exact provider model IDs', () => {
    expect(normalizeOpenMeteoModels('GFS,hrr,ncep_hrrr_conus')).toEqual([
      'gfs',
      'hrrr',
    ]);
  });

  it('Use Case: rejects a selection without a supported model', () => {
    expect(() => normalizeOpenMeteoModels('ecmwf,unknown')).toThrow(
      'models must include gfs or hrrr'
    );
  });

  it('Use Case: builds a provider query with the selected model and canonical units', () => {
    const query = new URL(
      buildOpenMeteoForecastQuery(35.7915, -78.7811, 'ncep_gfs_seamless'),
      'https://api.open-meteo.com'
    );

    expect(query.searchParams.get('models')).toBe('ncep_gfs_seamless');
    expect(query.searchParams.get('latitude')).toBe('35.7915');
    expect(query.searchParams.get('longitude')).toBe('-78.7811');
    expect(query.searchParams.get('temperature_unit')).toBe('celsius');
    expect(query.searchParams.get('wind_speed_unit')).toBe('ms');
  });
});