import { describe, expect, it } from 'vitest';
import {
  ALERT_SEVERITY_META,
  compareAlertSeverity,
  getHighestAlertSeverity,
  normalizeAlertSeverity,
} from './severity';

describe('alert severity', () => {
  it('Use Case: normalizes every CAP severity value', () => {
    expect(normalizeAlertSeverity('Extreme')).toBe('extreme');
    expect(normalizeAlertSeverity('SEVERE')).toBe('severe');
    expect(normalizeAlertSeverity(' moderate ')).toBe('moderate');
    expect(normalizeAlertSeverity('Minor')).toBe('minor');
    expect(normalizeAlertSeverity('Unknown')).toBe('unknown');
  });

  it('Use Case: never infers severity from an event name', () => {
    expect(normalizeAlertSeverity(undefined)).toBe('unknown');
    expect(normalizeAlertSeverity(null)).toBe('unknown');
    expect(normalizeAlertSeverity('')).toBe('unknown');
    expect(normalizeAlertSeverity('Tornado Warning')).toBe('unknown');
  });

  it('Use Case: orders severities from most to least severe', () => {
    expect(compareAlertSeverity('extreme', 'severe')).toBeLessThan(0);
    expect(compareAlertSeverity('severe', 'moderate')).toBeLessThan(0);
    expect(compareAlertSeverity('moderate', 'minor')).toBeLessThan(0);
    expect(compareAlertSeverity('minor', 'unknown')).toBeLessThan(0);
    expect(compareAlertSeverity('unknown', 'unknown')).toBe(0);
  });

  it('Use Case: reports the highest severity in a collection', () => {
    expect(
      getHighestAlertSeverity([
        { severity: 'minor' },
        { severity: 'extreme' },
        { severity: 'moderate' },
      ])
    ).toBe('extreme');
  });

  it('Use Case: reports unknown when there are no alerts', () => {
    expect(getHighestAlertSeverity([])).toBe('unknown');
  });

  it('Use Case: exposes display labels for every severity', () => {
    expect(ALERT_SEVERITY_META.extreme.label).toBe('Extreme');
    expect(ALERT_SEVERITY_META.severe.label).toBe('Severe');
    expect(ALERT_SEVERITY_META.moderate.label).toBe('Moderate');
    expect(ALERT_SEVERITY_META.minor.label).toBe('Minor');
    expect(ALERT_SEVERITY_META.unknown.label).toBe('Unknown');
  });
});
