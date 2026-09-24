// ISO-8601 week helpers, e.g. "2026-W38".
export function isoWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function weekNumber(weekId: string): number {
  return Number(weekId.split('-W')[1]);
}

/** weeksFromNow=0 is this week, 1 is next week, etc. — the building block behind currentWeekId/nextWeekId/weekAfterNextId and the manager's week navigator. */
export function weekIdWithOffset(weeksFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeksFromNow * 7);
  return isoWeekId(d);
}

export function currentWeekId(): string {
  return weekIdWithOffset(0);
}

export function nextWeekId(): string {
  return weekIdWithOffset(1);
}

export function weekAfterNextId(): string {
  return weekIdWithOffset(2);
}

/** The Monday (00:00 local) of the week `weeksFromNow` weeks from today — used to bound a date picker to a specific week. */
export function mondayOfWeekWithOffset(weeksFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + weeksFromNow * 7);
  const isoDay = d.getDay() || 7; // 1=Mon..7=Sun
  d.setDate(d.getDate() - isoDay + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The Sunday (23:59 local) of the week `weeksFromNow` weeks from today. */
export function sundayOfWeekWithOffset(weeksFromNow: number): Date {
  const d = mondayOfWeekWithOffset(weeksFromNow);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}
