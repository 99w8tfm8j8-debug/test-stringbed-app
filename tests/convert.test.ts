import { describe, expect, it } from 'vitest';
import { estimate, makeCalibration, type Library } from '../src/app/convert';
import type { Setup } from '../src/lib/types';
import { frequencyForLb } from '../src/lib/physics';

const lib: Library = {
  strings: new Map([['s1', { id: 's1', brand: 'X', model: 'Poly', material: 'polyester', construction: '', gauges: [{ label: '16L', mm: 1.25 }], sourceUrl: 'https://x', verified: true }]]),
  racquets: new Map([['r1', { id: 'r1', brand: 'Y', model: 'Frame', headSizeSqIn: 100, pattern: '16x19', lengthIn: 27, mainLengthMm: 320, sourceUrl: 'https://y', verified: true }]]),
};
const setup: Setup = {
  id: 'a', name: 'A', racquetId: 'r1', mains: { stringId: 's1', material: 'polyester', gaugeMm: 1.25 }, hitter: 'hard', capWeeks: 6, checkPct: 20, restringPct: 25,
  hours: [], calib: {}, createdAt: 0, updatedAt: 0,
};

describe('estimate', () => {
  it('uses physics mode without a calibration and hits the sanity check', () => {
    const e = estimate(setup, 'mains', 559.6, 0.2, lib);
    expect(e.mode).toBe('physics');
    expect(e.lb).toBeCloseTo(46, 1);
    expect(e.lengthMeasured).toBe(false);
    expect(e.rangeLb).toBeGreaterThan(8); // 20% of 46 lb: honest about an unmeasured length
  });
  it('narrows the physics range once the length is measured', () => {
    const e = estimate({ ...setup, mainLengthMm: 320 }, 'mains', 559.6, 0.2, lib);
    expect(e.rangeLb).toBeLessThan(estimate(setup, 'mains', 559.6, 0.2, lib).rangeLb);
  });
  it('switches to calibrated mode and reproduces the ratio exactly', () => {
    const cal = makeCalibration(setup, 'mains', 540, 50, lib, '2026-01-01');
    const s = { ...setup, calib: { mains: cal } };
    const e = estimate(s, 'mains', 486, 0.2, lib);
    expect(e.mode).toBe('calibrated');
    expect(e.lb).toBeCloseTo(50 * 0.81, 10);
    expect(e.rangeLb).toBeGreaterThanOrEqual(2);
    expect(e.rangeLb).toBeLessThan(3);
  });
  it('a carried-over factor corrects physics mode after a restring', () => {
    const cal = makeCalibration(setup, 'mains', 540, 50, lib, '2026-01-01');
    const s = { ...setup, carriedFactor: { mains: cal.factor } };
    expect(estimate(s, 'mains', 540, 0, lib).lb).toBeCloseTo(50, 8);
  });
  it('uses the crosses string and a shorter estimated length for crosses', () => {
    const hybrid = { ...setup, crosses: { material: 'synthetic' as const, gaugeMm: 1.3 } };
    const e = estimate(hybrid, 'crosses', frequencyForLb(45, { lengthMm: 256, gaugeMm: 1.3, density: 1.14 }), 0, lib);
    expect(e.physics.lengthMm).toBe(256);
    expect(e.physics.density).toBe(1.14);
    expect(e.lb).toBeCloseTo(45, 6);
  });
});
