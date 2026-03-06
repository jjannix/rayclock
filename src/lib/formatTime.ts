/**
 * Pad a number to `width` digits with leading zeros.
 */
function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

/**
 * Format milliseconds as HH:MM:SS.d (tenths of a second).
 * Used for the stopwatch display.
 *
 * @example formatElapsed(3661100) => "01:01:01.1"
 */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${tenths}`;
}

/**
 * Format milliseconds as a compact human-readable countdown string.
 * Omits leading zero-valued units.
 *
 * @example formatRemaining(90000)  => "1m 30s"
 * @example formatRemaining(3600000) => "1h 00m 00s"
 * @example formatRemaining(45000)  => "45s"
 * @example formatRemaining(0)      => "0s"
 */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "0s";

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${pad(seconds)}s`;
  }
  return `${seconds}s`;
}

/**
 * Format a duration in ms as a short label for recent-durations display.
 *
 * @example formatDurationLabel(300000) => "5m"
 * @example formatDurationLabel(5400000) => "1h 30m"
 * @example formatDurationLabel(45000) => "45s"
 */
export function formatDurationLabel(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

/**
 * Format a Date for clock display in a given IANA timezone.
 *
 * @example formatClockTime(new Date(), "America/New_York") => "3:45:12 PM"
 */
export function formatClockTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Format a Date for clock date display in a given IANA timezone.
 *
 * @example formatClockDate(new Date(), "America/New_York") => "Fri, Mar 6"
 */
export function formatClockDate(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get the UTC offset string for a timezone, e.g. "UTC-5" or "UTC+5:30".
 */
export function getUtcOffset(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const offsetPart = parts.find((p) => p.type === "timeZoneName");
  return offsetPart?.value ?? "";
}

/**
 * Get the hour difference between a timezone and the local timezone.
 *
 * @returns A string like "+3h", "-5.5h", or "same time"
 */
export function getTimeDifference(date: Date, timezone: string): string {
  const localOffset = date.getTimezoneOffset(); // minutes, inverted sign
  const targetDate = new Date(
    date.toLocaleString("en-US", { timeZone: timezone }),
  );
  const localDate = new Date(date.toLocaleString("en-US"));
  const diffMs = targetDate.getTime() - localDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (Math.abs(diffHours) < 0.01) return "same time";

  const sign = diffHours > 0 ? "+" : "";
  if (Number.isInteger(diffHours)) {
    return `${sign}${diffHours}h`;
  }
  return `${sign}${diffHours.toFixed(1)}h`;
}
