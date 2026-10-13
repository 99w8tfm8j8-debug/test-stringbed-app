import { describe, expect, it } from 'vitest';
import { computeStatus, daysBetween } from '../src/lib/status';
import type { Reading, Setup } from '../src/lib/types';

const base: Setup = {
  id: 's1', name: 'Main frame', mains: { material: 'polyester', gaugeMm: 1.25 }, startLb: 50, strungOn: '2026-01-01',
  hitter: 'hard', capWeeks: 6, checkPct: 20, restringPct: 25, hours: [], calib: {}, createdAt: 0, updatedAt: 0,
};
let n = 0;
const rd = (date: string, lb: number, side: 'mains' | 'crosses' = 'mains'): Reading => ({ id: 'r' + n++, setupId: 's1', date, lb, side, source: 'app', createdAt: n });

describe('computeStatus', () => {
  it('is Playable inside the check line', () => {
    const s = computeStatus(base, [rd('2026-01-08', 45)], '2026-01-10');
    expect(s.level).toBe('ok');
    expect(s.lossPct).toBeCloseTo(10, 6);
  });
  it('is Check it at 20% loss', () => {
    expect(computeStatus(base, [rd('2026-01-08', 40)], '2026-01-10').level).toBe('watch');
  });
  it('is Restring now at 25% loss', () => {
    expect(computeStatus(base, [rd('2026-01-08', 37.5)], '2026-01-10').level).toBe('bad');
  });
  it('uses the latest mains reading, not crosses', () => {
    const s = computeStatus(base, [rd('2026-01-05', 36), rd('2026-01-08', 46), rd('2026-01-09', 30, 'crosses')], '2026-01-10');
    expect(s.last!.lb).toBe(46);
    expect(s.level).toBe('ok');
  });
  it('flags the weeks cap: watch at the cap, restring at 1.5x', () => {
    expect(computeStatus(base, [], '2026-02-12').level).toBe('watch'); // 6 weeks
    expect(computeStatus(base, [], '2026-02-26').level).toBe('watch'); // 8 weeks
    expect(computeStatus(base, [], '2026-03-05').level).toBe('bad'); // 9 weeks
  });
  it('honours a 12-week cap for light hitters', () => {
    expect(computeStatus({ ...base, hitter: 'light', capWeeks: 12 }, [], '2026-02-26').level).toBe('ok');
  });
  it('honours editable lines', () => {
    expect(computeStatus({ ...base, checkPct: 10 }, [rd('2026-01-08', 44)], '2026-01-10').level).toBe('watch');
  });
  it('honours an hours cap', () => {
    const s = { ...base, capHours: 20, hours: [{ date: '2026-01-02', hours: 12 }, { date: '2026-01-04', hours: 9 }] };
    expect(computeStatus(s, [], '2026-01-05').level).toBe('watch');
    expect(computeStatus(s, [], '2026-01-05').hours).toBe(21);
  });
  it('projects a restring date from the loss rate', () => {
    const s = computeStatus(base, [rd('2026-01-08', 45), rd('2026-01-15', 43), rd('2026-01-22', 41)], '2026-01-22');
    // 4 lb per 2 weeks = 4% per week; 18% loss now, 7% to go -> about 12 days
    expect(s.lossPctPerWeek).toBeCloseTo(4, 6);
    expect(daysBetween('2026-01-22', s.projectedRestring!)).toBe(12);
  });
});
