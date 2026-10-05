import { formatAuditTimestamp } from './audit-display';

describe('formatAuditTimestamp', () => {
  it('shows the profile time zone and local date and time across UTC midnight', () => {
    const timestamp = '2026-09-30T23:30:00.000Z';
    const local = formatAuditTimestamp(timestamp, 'Europe/Moscow');
    const utc = formatAuditTimestamp(timestamp, 'UTC');

    expect(local).toContain('01.10.2026');
    expect(local).toContain('02:30');
    expect(local).toContain('Europe/Moscow');
    expect(utc).toContain('30.09.2026');
    expect(utc).toContain('23:30');
    expect(utc).toContain('UTC');
  });
});
