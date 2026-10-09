import { jest } from '@jest/globals';
import {
  followingOccurrence,
  localDate,
  nextOccurrence,
} from './recurrence.js';

describe('recurring monthly schedule', () => {
  afterEach(() => jest.useRealTimers());

  it.each([
    [
      '2026-04-01T12:00:00.000Z',
      15,
      'UTC',
      '2026-04-15',
      '2026-04-15T00:00:00.000Z',
    ],
    [
      '2026-05-01T12:00:00.000Z',
      30,
      'UTC',
      '2026-05-30',
      '2026-05-30T00:00:00.000Z',
    ],
    [
      '2026-04-01T12:00:00.000Z',
      31,
      'UTC',
      '2026-04-30',
      '2026-04-30T00:00:00.000Z',
    ],
    [
      '2026-02-01T12:00:00.000Z',
      29,
      'UTC',
      '2026-02-28',
      '2026-02-28T00:00:00.000Z',
    ],
    [
      '2028-02-01T12:00:00.000Z',
      29,
      'UTC',
      '2028-02-29',
      '2028-02-29T00:00:00.000Z',
    ],
    [
      '2028-02-01T12:00:00.000Z',
      31,
      'Europe/Amsterdam',
      '2028-02-29',
      '2028-02-28T23:00:00.000Z',
    ],
    [
      '2024-03-01T12:00:00.000Z',
      31,
      'America/New_York',
      '2024-03-31',
      '2024-03-31T04:00:00.000Z',
    ],
  ])(
    'plans from %s on day %i in %s',
    (now, day, timeZone, scheduledDate, nextRunAt) => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(now));

      expect(
        nextOccurrence(localDate(new Date(), timeZone), day, timeZone),
      ).toEqual({
        scheduledDate,
        nextRunAt: new Date(nextRunAt),
      });
    },
  );

  it('uses the last day of a short month and local midnight', () => {
    expect(nextOccurrence('2028-02-01', 31, 'Europe/Amsterdam')).toEqual({
      scheduledDate: '2028-02-29',
      nextRunAt: new Date('2028-02-28T23:00:00.000Z'),
    });
  });

  it('clamps a non-leap February and advances exactly one calendar month', () => {
    expect(nextOccurrence('2026-02-01', 29, 'UTC').scheduledDate).toBe(
      '2026-02-28',
    );
    expect(followingOccurrence('2026-02-28', 29, 'UTC').scheduledDate).toBe(
      '2026-03-29',
    );
  });

  it('uses the post-DST offset at New York midnight', () => {
    expect(nextOccurrence('2024-03-01', 31, 'America/New_York')).toEqual({
      scheduledDate: '2024-03-31',
      nextRunAt: new Date('2024-03-31T04:00:00.000Z'),
    });
  });

  it('preserves four-digit years below 0100', () => {
    expect(nextOccurrence('0099-02-01', 31, 'UTC')).toEqual({
      scheduledDate: '0099-02-28',
      nextRunAt: new Date('0099-02-28T00:00:00.000Z'),
    });
    expect(followingOccurrence('0099-12-31', 31, 'UTC').scheduledDate).toBe(
      '0100-01-31',
    );
  });
});
