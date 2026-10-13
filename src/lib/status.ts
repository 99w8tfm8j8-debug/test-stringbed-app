// Restring logic ported from the prototype: loss against the strung-at tension,
// plus a weeks-since-stringing cap and an optional hours cap.
import type { Reading, Setup } from './types';

export type Level = 'ok' | 'watch' | 'bad';
export const LEVEL_LABEL: Record<Level, string> = { ok: 'Playable', watch: 'Check it', bad: 'Restring now' };

export interface Status {
  level: Level;
  label: string;
  reasons: string[];
  last: Reading | null;
  lossLb: number | null;
  lossPct: number | null;
  weeks: number | null;
  hours: number;
  /** Loss rate from a least-squares fit of the readings, % per week. */
  lossPctPerWeek: number | null;
  /** Projected date the restring line is crossed, ISO. */
  projectedRestring: string | null;
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso + 'T00:00:00Z') + days * 864e5).toISOString().slice(0, 10);
}

export function sortReadings(rs: readonly Reading[]): Reading[] {
  return [...rs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt));
}

const r0 = (n: number) => String(Math.round(n));

/** Least-squares slope of loss % against days, through readings after the first 24 h. */
function lossRate(s: Setup, rs: Reading[]): number | null {
  if (!s.startLb || !s.strungOn) return null;
  const pts = rs
    .map((r) => ({ d: daysBetween(s.strungOn!, r.date), p: ((s.startLb! - r.lb) / s.startLb!) * 100 }))
    .filter((p) => p.d >= 1);
  if (pts.length < 2) return null;
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.d, 0) / n, my = pts.reduce((a, p) => a + p.p, 0) / n;
  const sxx = pts.reduce((a, p) => a + (p.d - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope = pts.reduce((a, p) => a + (p.d - mx) * (p.p - my), 0) / sxx;
  return slope * 7;
}

export function computeStatus(s: Setup, readings: readonly Reading[], today = todayIso()): Status {
  const rs = sortReadings(readings.filter((r) => r.setupId === s.id && r.side === 'mains'));
  const last = rs[rs.length - 1] ?? null;
  const hours = s.hours.reduce((a, h) => a + h.hours, 0);
  const out: Status = { level: 'ok', label: LEVEL_LABEL.ok, reasons: [], last, lossLb: null, lossPct: null, weeks: null, hours, lossPctPerWeek: null, projectedRestring: null };
  let lvl = 0;
  if (last && s.startLb) {
    out.lossLb = s.startLb - last.lb;
    out.lossPct = (out.lossLb / s.startLb) * 100;
    if (out.lossPct >= s.restringPct) {
      lvl = 2;
      out.reasons.push(`${r0(out.lossPct)}% below the strung-at tension. Restring line is ${r0(s.restringPct)}%.`);
    } else if (out.lossPct >= s.checkPct) {
      lvl = 1;
      out.reasons.push(`${r0(out.lossPct)}% below the strung-at tension. Check feel and notching; restring line is ${r0(s.restringPct)}%.`);
    } else {
      out.reasons.push(`${r0(Math.max(0, out.lossPct))}% below the strung-at tension, inside the normal first-week drop and wear.`);
    }
  }
  if (s.strungOn) {
    out.weeks = Math.floor(daysBetween(s.strungOn, today) / 7);
    if (out.weeks >= s.capWeeks * 1.5) {
      lvl = Math.max(lvl, 2);
      out.reasons.push(`${out.weeks} weeks since stringing; your cap is ${s.capWeeks}.`);
    } else if (out.weeks >= s.capWeeks) {
      lvl = Math.max(lvl, 1);
      out.reasons.push(`${out.weeks} weeks since stringing, past your ${s.capWeeks}-week cap.`);
    }
  }
  if (s.capHours && hours > 0) {
    if (hours >= s.capHours * 1.5) {
      lvl = Math.max(lvl, 2);
      out.reasons.push(`${r0(hours)} hours played; your cap is ${s.capHours}.`);
    } else if (hours >= s.capHours) {
      lvl = Math.max(lvl, 1);
      out.reasons.push(`${r0(hours)} hours played, past your ${s.capHours}-hour cap.`);
    }
  }
  out.lossPctPerWeek = lossRate(s, rs);
  if (out.lossPctPerWeek && out.lossPctPerWeek > 0 && out.lossPct != null && last && out.lossPct < s.restringPct) {
    const weeksLeft = (s.restringPct - out.lossPct) / out.lossPctPerWeek;
    out.projectedRestring = addDays(last.date, Math.round(weeksLeft * 7));
  }
  const level = (['ok', 'watch', 'bad'] as const)[lvl]!;
  out.level = level;
  out.label = LEVEL_LABEL[level];
  return out;
}
