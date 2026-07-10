import { describe, expect, it } from 'vitest';
import { isOutsideBusinessHours } from './business-hours';

describe('business-hours — isOutsideBusinessHours', () => {
  const dailyHours = {
    '0': { enabled: false, open: '09:00', close: '18:00' }, // Sunday (Closed)
    '1': { enabled: true, open: '09:00', close: '18:00' },  // Monday
    '2': { enabled: true, open: '09:00', close: '18:00' },  // Tuesday
    '3': { enabled: true, open: '09:00', close: '18:00' },  // Wednesday
    '4': { enabled: true, open: '09:00', close: '18:00' },  // Thursday
    '5': { enabled: true, open: '09:00', close: '18:00' },  // Friday
    '6': { enabled: true, open: '18:00', close: '02:00' },  // Saturday (Over-midnight: 6 PM Saturday to 2 AM Sunday)
  };

  it('resolves as INSIDE (false) on a working weekday during open hours', () => {
    // 2026-07-08T10:00:00Z is Wednesday 3:30 PM in Asia/Kolkata (IST = UTC+5:30)
    // 10:00 UTC = 15:30 IST. Wednesday dailyHours = 09:00 to 18:00. 15:30 is inside.
    const now = new Date('2026-07-08T10:00:00Z');
    const result = isOutsideBusinessHours(now, 'Asia/Kolkata', dailyHours);
    expect(result).toBe(false); // false means NOT outside (i.e. inside)
  });

  it('resolves as OUTSIDE (true) on a working weekday before opening hours', () => {
    // 2026-07-08T02:00:00Z is Wednesday 7:30 AM in Asia/Kolkata (IST)
    // Wednesday dailyHours = 09:00 to 18:00. 7:30 AM is outside.
    const now = new Date('2026-07-08T02:00:00Z');
    const result = isOutsideBusinessHours(now, 'Asia/Kolkata', dailyHours);
    expect(result).toBe(true); // true means outside
  });

  it('resolves as OUTSIDE (true) on a disabled day', () => {
    // 2026-07-05T12:00:00Z is Sunday 5:30 PM in Asia/Kolkata. Sunday is disabled.
    const now = new Date('2026-07-05T12:00:00Z');
    const result = isOutsideBusinessHours(now, 'Asia/Kolkata', dailyHours);
    expect(result).toBe(true);
  });

  it('supports over-midnight hours config (Saturday night/Sunday morning)', () => {
    // Saturday dailyHours: 18:00 to 02:00.
    
    // Test 1: Saturday 8:00 PM IST (14:30 UTC on Saturday 2026-07-11)
    // 14:30 UTC = 20:00 IST (8:00 PM Saturday). Inside 18:00 - 02:00.
    const insideSat = new Date('2026-07-11T14:30:00Z');
    expect(isOutsideBusinessHours(insideSat, 'Asia/Kolkata', dailyHours)).toBe(false);

    // Test 2: Saturday 11:30 PM IST (18:00 UTC on Saturday 2026-07-11)
    // 18:00 UTC = 23:30 IST (11:30 PM Saturday). Inside.
    const insideSatLate = new Date('2026-07-11T18:00:00Z');
    expect(isOutsideBusinessHours(insideSatLate, 'Asia/Kolkata', dailyHours)).toBe(false);
  });
});
