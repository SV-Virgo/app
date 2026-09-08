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

export function currentWeekId(): string {
  return isoWeekId(new Date());
}

export function nextWeekId(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return isoWeekId(d);
}

export function weekAfterNextId(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return isoWeekId(d);
}
