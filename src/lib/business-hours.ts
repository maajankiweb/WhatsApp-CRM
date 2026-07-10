/**
 * Pure helper function to check if the given date is outside the configured daily business hours.
 * Uses Intl.DateTimeFormat to project the system date to the organization's timezone.
 */
export function isOutsideBusinessHours(
  now: Date,
  timezone: string,
  dailyHours: Record<string, { enabled: boolean; open: string; close: string }>
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'long',
    });

    const parts = formatter.formatToParts(now);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    if (!partMap.weekday || !partMap.hour || !partMap.minute) {
      return false;
    }

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = DAYS.findIndex((d) => d.toLowerCase() === partMap.weekday.toLowerCase());
    if (dayIndex === -1) return false;

    const config = dailyHours[String(dayIndex)];
    if (!config || !config.enabled) {
      // If the day is not enabled, then we are closed all day
      return true;
    }

    const currentMins = Number(partMap.hour) * 60 + Number(partMap.minute);

    const parse = (s: string) => {
      const [h, m] = s.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const openMins = parse(config.open);
    const closeMins = parse(config.close);

    if (openMins <= closeMins) {
      return currentMins < openMins || currentMins >= closeMins;
    } else {
      // Support over-midnight hours (e.g. 18:00 to 02:00)
      return currentMins < openMins && currentMins >= closeMins;
    }
  } catch (err) {
    console.error('[business-hours] check failed:', err);
    return false;
  }
}
