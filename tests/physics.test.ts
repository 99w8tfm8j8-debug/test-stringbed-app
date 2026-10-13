import { describe, expect, it } from 'vitest';
import { calibratedLb, formatTension, frequencyForLb, fromLb, learnedFactor, linearDensity, MATERIAL_DENSITY, MIN_HALF_RANGE_LB, N_PER_LB, physicsLb, toLb, uncertaintyLb } from '../src/lib/physics';

const POLY_125_320 = { lengthMm: 320, gaugeMm: 1.25, density: MATERIAL_DENSITY.polyester.gPerCm3 };

describe('physics sanity check', () => {
  it('polyester 1.25 mm, 320 mm, 46 lb rings at about 559.6 Hz', () => {
    expect(frequencyForLb(46, POLY_125_320)).toBeCloseTo(559.6, 1);
  });
  it('and the inverse gives back 46 lb', () => {
    expect(physicsLb(559.6, POLY_125_320)).toBeCloseTo(46, 1);
    expect(physicsLb(frequencyForLb(46, POLY_125_320), POLY_125_320)).toBeCloseTo(46, 10);
  });
  it('linear density matches rho * pi * d^2 / 4', () => {
    expect(linearDensity(1.3, 1.25)).toBeCloseTo(1300 * Math.PI * 0.00125 ** 2 / 4, 12);
  });
  it('tension scales with f^2, L^2, d^2 and rho', () => {
    const base = physicsLb(500, POLY_125_320);
    expect(physicsLb(1000, POLY_125_320) / base).toBeCloseTo(4, 10);
    expect(physicsLb(500, { ...POLY_125_320, lengthMm: 640 }) / base).toBeCloseTo(4, 10);
    expect(physicsLb(500, { ...POLY_125_320, gaugeMm: 2.5 }) / base).toBeCloseTo(4, 10);
    expect(physicsLb(500, { ...POLY_125_320, density: 2.6 }) / base).toBeCloseTo(2, 10);
  });
  it('uses the stated lb/N factor', () => {
    expect(N_PER_LB).toBe(4.4482216);
  });
});

describe('calibrated mode', () => {
  it('reproduces the reference exactly', () => {
    expect(calibratedLb(561.2, 561.2, 48)).toBe(48);
  });
  it('reproduces a known ratio exactly', () => {
    // f / f_ref = 0.9 -> T / T_ref = 0.81
    expect(calibratedLb(450, 500, 50)).toBeCloseTo(40.5, 12);
    // f / f_ref = 1.1 -> 1.21
    expect(calibratedLb(550, 500, 50)).toBeCloseTo(60.5, 12);
  });
  it('a learned factor makes physics mode agree with the calibration', () => {
    const p = { ...POLY_125_320, lengthMm: 300 };
    const k = learnedFactor(540, 50, p);
    expect(physicsLb(540, p) * k).toBeCloseTo(50, 10);
    expect(physicsLb(500, p) * k).toBeCloseTo(calibratedLb(500, 540, 50), 10);
  });
});

describe('uncertainty', () => {
  it('never claims better than +/- 2 lb', () => {
    expect(uncertaintyLb(20, 400, 0, 'calibrated')).toBe(MIN_HALF_RANGE_LB);
  });
  it('is about 2 to 3 lb calibrated at typical tension with a tight spread', () => {
    const u = uncertaintyLb(50, 560, 0.3, 'calibrated');
    expect(u).toBeGreaterThan(2);
    expect(u).toBeLessThan(3);
  });
  it('is wider in physics mode and grows with spread', () => {
    expect(uncertaintyLb(50, 560, 0.3, 'physics')).toBeGreaterThan(uncertaintyLb(50, 560, 0.3, 'calibrated'));
    expect(uncertaintyLb(50, 560, 5, 'calibrated')).toBeGreaterThan(uncertaintyLb(50, 560, 0.3, 'calibrated'));
  });
});

describe('units', () => {
  it('round-trips lb and kg', () => {
    expect(fromLb(50, 'kg')).toBeCloseTo(22.6796, 4);
    expect(toLb(fromLb(50, 'kg'), 'kg')).toBeCloseTo(50, 10);
    expect(formatTension(50, 'kg')).toBe('22.7');
    expect(formatTension(50, 'lb')).toBe('50.0');
  });
});
