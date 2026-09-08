const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const WEEKDAYS_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Dinsdag 23 sep" — used for planning slot labels. */
export function formatDutchDayLong(date: Date): string {
  return `${capitalize(WEEKDAYS[date.getDay()])} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** "di 23 sep" — used for compact booking list rows. */
export function formatDutchDayShort(date: Date): string {
  return `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** "14:05" */
export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** "19:30 – 21:00" */
export function formatTimeRange(from: Date, to: Date): string {
  return `${formatTime(from)} – ${formatTime(to)}`;
}

/** "2026-09-23" in LOCAL time (not UTC, so it never shifts a day off from what was picked). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses "2026-09-23" (local) back into a Date, and formats it for display. */
export function formatIsoDateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return formatDutchDayShort(new Date(y, m - 1, d));
}
