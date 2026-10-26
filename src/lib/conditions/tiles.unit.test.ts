import { describe, expect, it } from 'vitest';
import type { CurrentConditions } from '@/types/domain';
import { buildConditionTiles } from './tiles';

const observation: CurrentConditions = {
  temperature: 28.9,
  humidity: 64,
  dewpoint: 21.1,
  windSpeed: 4.63,
  windDirection: 135,
  windGust: 7.72,
  pressure: 1012.4,
  pressureTrend: -0.8,
  condition: 'Partly Cloudy',
};

describe('buildConditionTiles', () => {
  it('Use Case: returns the condition tiles in reading order', () => {
    const tiles = buildConditionTiles(observation);

    expect(tiles.map((tile) => tile.kind)).toEqual([
      'temperature',
      'feels-like',
      'wind',
      'pressure',
      'dewpoint',
    ]);
  });

  it('Use Case: formats the temperature tile with the sky condition', () => {
    const tiles = buildConditionTiles(observation);
    const temperature = tiles.find((tile) => tile.kind === 'temperature');

    expect(temperature?.value).toBe('84°F');
    expect(temperature?.meta).toBe('Partly Cloudy');
  });

  it('Use Case: derives the feels-like tile with the heat index basis', () => {
    const tiles = buildConditionTiles(observation);
    const feelsLike = tiles.find((tile) => tile.kind === 'feels-like');

    expect(feelsLike?.value).toBe('89°F');
    expect(feelsLike?.meta).toBe('Heat index');
  });

  it('Use Case: warns when the apparent temperature exceeds the air temperature', () => {
    const tiles = buildConditionTiles(observation);
    const feelsLike = tiles.find((tile) => tile.kind === 'feels-like');

    expect(feelsLike?.tone).toBe('warning');
  });

  it('Use Case: formats the wind tile with direction and gust', () => {
    const tiles = buildConditionTiles(observation);
    const wind = tiles.find((tile) => tile.kind === 'wind');

    expect(wind?.value).toBe('↘ SE 9 kt');
    expect(wind?.meta).toBe('G 15 kt');
  });

  it('Use Case: formats the pressure tile with its three hour tendency', () => {
    const tiles = buildConditionTiles(observation);
    const pressure = tiles.find((tile) => tile.kind === 'pressure');

    expect(pressure?.value).toBe('1012.4 mb');
    expect(pressure?.meta).toBe('-0.8/3h ↓');
    expect(pressure?.tone).toBe('negative');
  });

  it('Use Case: formats the dewpoint tile with relative humidity', () => {
    const tiles = buildConditionTiles(observation);
    const dewpoint = tiles.find((tile) => tile.kind === 'dewpoint');

    expect(dewpoint?.value).toBe('70°F');
    expect(dewpoint?.meta).toBe('RH 64%');
  });

  it('Use Case: renders a placeholder for every missing reading', () => {
    const tiles = buildConditionTiles({});
    const temperature = tiles.find((tile) => tile.kind === 'temperature');
    const wind = tiles.find((tile) => tile.kind === 'wind');

    expect(temperature?.value).toBe('—');
    expect(wind?.value).toBe('—');
    expect(wind?.meta).toBeUndefined();
  });

  it('Use Case: keeps a supplied apparent temperature instead of deriving one', () => {
    const tiles = buildConditionTiles({ ...observation, feelsLike: 32.2 });
    const feelsLike = tiles.find((tile) => tile.kind === 'feels-like');

    expect(feelsLike?.value).toBe('90°F');
    expect(feelsLike?.meta).toBeUndefined();
  });

  it('Use Case: renders metric units when requested', () => {
    const tiles = buildConditionTiles(observation, { units: 'metric' });
    const wind = tiles.find((tile) => tile.kind === 'wind');
    const pressure = tiles.find((tile) => tile.kind === 'pressure');

    expect(wind?.value).toBe('↘ SE 5 m/s');
    expect(pressure?.value).toBe('1012.4 hPa');
  });
});
