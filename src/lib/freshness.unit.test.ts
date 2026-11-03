import { describe, expect, it } from 'vitest';
import { deriveFreshness, FRESHNESS_THRESHOLD_MS, getOldestTimestamp } from './freshness';

const NOW = new Date('2026-11-03T12:00:00Z');

describe('deriveFreshness', () => {
  it('Use Case: reports data at the freshness threshold as live', () => {
    const freshness = deriveFreshness(new Date(NOW.getTime() - FRESHNESS_THRESHOLD_MS), NOW);

    expect(freshness.state).toBe('live');
    expect(freshness.label).toBe('LIVE');
    expect(freshness.ageMs).toBe(FRESHNESS_THRESHOLD_MS);
  });

  it('Use Case: reports data one millisecond past the threshold as stale', () => {
    const freshness = deriveFreshness(new Date(NOW.getTime() - FRESHNESS_THRESHOLD_MS - 1), NOW);

    expect(freshness.state).toBe('stale');
    expect(freshness.label).toBe('STALE');
  });

  it('Use Case: treats missing or invalid timestamps as stale without an age', () => {
    for (const value of [null, undefined, '', 'not-a-timestamp']) {
      const freshness = deriveFreshness(value, NOW);

      expect(freshness.state).toBe('stale');
      expect(freshness.ageMs).toBeNull();
      expect(freshness.title).toBe('Update time unavailable');
    }
  });

  it('Use Case: clamps future timestamps to zero age so clock skew stays live', () => {
    const freshness = deriveFreshness(new Date(NOW.getTime() + 60_000), NOW);

    expect(freshness.state).toBe('live');
    expect(freshness.ageMs).toBe(0);
  });

  it('Use Case: accepts ISO strings and describes the age in the title', () => {
    expect(deriveFreshness('2026-11-03T11:56:00Z', NOW).title).toBe('Updated 4 minutes ago');
    expect(deriveFreshness('2026-11-03T11:59:30Z', NOW).title).toBe(
      'Updated less than a minute ago',
    );
    expect(deriveFreshness('2026-11-03T11:00:00Z', NOW).title).toBe('Updated 1 hour ago');
    expect(deriveFreshness('2026-11-02T10:00:00Z', NOW).title).toBe('Updated 1 day ago');
    expect(deriveFreshness('2026-10-31T12:00:00Z', NOW).title).toBe('Updated 3 days ago');
  });

  it('Use Case: allows a caller to override the threshold', () => {
    const retrievedAt = '2026-11-03T11:55:00Z';

    expect(deriveFreshness(retrievedAt, NOW, 10 * 60 * 1000).state).toBe('live');
    expect(deriveFreshness(retrievedAt, NOW, 4 * 60 * 1000).state).toBe('stale');
  });
});

describe('getOldestTimestamp', () => {
  it('Use Case: summarizes several panels using the oldest valid timestamp', () => {
    const oldest = getOldestTimestamp([
      new Date('2026-11-03T11:58:00Z'),
      '2026-11-03T11:52:00Z',
      null,
      undefined,
      'not-a-timestamp',
    ]);

    expect(oldest?.toISOString()).toBe('2026-11-03T11:52:00.000Z');
  });

  it('Use Case: returns null when no source has a valid timestamp', () => {
    expect(getOldestTimestamp([])).toBeNull();
    expect(getOldestTimestamp([null, undefined, 'nope'])).toBeNull();
  });
});
