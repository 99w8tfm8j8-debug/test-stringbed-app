// String physics: f = (1 / 2L) * sqrt(T / mu), so T = mu * (2 L f)^2, mu = rho * pi * d^2 / 4.

export const N_PER_LB = 4.4482216;
export const KG_PER_LB = 0.45359237;

export type MaterialClass = 'polyester' | 'multifilament' | 'synthetic' | 'natural-gut' | 'aramid';

export interface MaterialDensity {
  label: string;
  /** g/cm^3. Always an estimate: manufacturers rarely publish string density. */
  gPerCm3: number;
  source: string;
  sourceUrl: string;
}

/**
 * Material-class density defaults. These are bulk-polymer figures, not measured
 * tennis strings, so the UI labels them as estimates and calibration learns a
 * per-setup correction factor on top.
 */
export const MATERIAL_DENSITY: Record<MaterialClass, MaterialDensity> = {
  polyester: {
    label: 'Polyester / co-polyester',
    gPerCm3: 1.3,
    source: 'Bulk PET is about 1.38 g/cm3; co-polyester strings blend in lighter polymers, so 1.30 (lower end of the 1.3 to 1.4 range) is used. Matches the 46 lb / 559.6 Hz reference case.',
    sourceUrl: 'https://en.wikipedia.org/wiki/Polyethylene_terephthalate',
  },
  multifilament: {
    label: 'Multifilament',
    gPerCm3: 1.14,
    source: 'Nylon 6,6 bulk density about 1.14 g/cm3. Multifilaments are mostly nylon or PU-bonded nylon fibres.',
    sourceUrl: 'https://en.wikipedia.org/wiki/Nylon_66',
  },
  synthetic: {
    label: 'Nylon / synthetic gut',
    gPerCm3: 1.14,
    source: 'Nylon 6,6 bulk density about 1.14 g/cm3.',
    sourceUrl: 'https://en.wikipedia.org/wiki/Nylon_66',
  },
  'natural-gut': {
    label: 'Natural gut',
    gPerCm3: 1.3,
    source: 'Dry collagen is roughly 1.3 to 1.4 g/cm3; 1.30 is used. Gut strings are coated and absorb moisture, so treat this as a rough estimate.',
    sourceUrl: 'https://en.wikipedia.org/wiki/Collagen',
  },
  aramid: {
    label: 'Aramid (Kevlar-type)',
    gPerCm3: 1.44,
    source: 'Kevlar 49 density 1.44 g/cm3.',
    sourceUrl: 'https://en.wikipedia.org/wiki/Kevlar',
  },
};

export const MATERIAL_CLASSES = Object.keys(MATERIAL_DENSITY) as MaterialClass[];

/** Linear mass density in kg/m from density (g/cm^3) and gauge (mm). */
export function linearDensity(gPerCm3: number, gaugeMm: number): number {
  const rho = gPerCm3 * 1000; // kg/m^3
  const d = gaugeMm / 1000;
  return (rho * Math.PI * d * d) / 4;
}

export interface PhysicsInput {
  lengthMm: number;
  gaugeMm: number;
  /** g/cm^3 */
  density: number;
}

export function tensionNewtons(hz: number, p: PhysicsInput): number {
  const L = p.lengthMm / 1000;
  return linearDensity(p.density, p.gaugeMm) * (2 * L * hz) ** 2;
}

export function physicsLb(hz: number, p: PhysicsInput): number {
  return tensionNewtons(hz, p) / N_PER_LB;
}

/** Inverse: the frequency a string at `lb` should ring at. */
export function frequencyForLb(lb: number, p: PhysicsInput): number {
  const T = lb * N_PER_LB;
  const L = p.lengthMm / 1000;
  return Math.sqrt(T / linearDensity(p.density, p.gaugeMm)) / (2 * L);
}

/** Calibrated mode: T = T_ref * (f / f_ref)^2. Cancels errors in L, rho and gauge. */
export function calibratedLb(hz: number, refHz: number, refLb: number): number {
  return refLb * (hz / refHz) ** 2;
}

/**
 * Correction factor learned from a calibration: how far the physics model is off
 * for this racquet and string. physicsLb * factor reproduces the reference.
 */
export function learnedFactor(refHz: number, refLb: number, p: PhysicsInput): number {
  return refLb / physicsLb(refHz, p);
}

export type ConversionMode = 'calibrated' | 'physics';

/**
 * Systematic error assumed per mode (fraction of tension).
 * Calibrated: reference meter error, string relaxation since the reference,
 *   temperature; about 5%, which is 2 to 3 lb at typical tensions.
 * Physics: effective length (enters squared), density estimate, real gauge
 *   (enters squared), cross-string coupling; about 15%.
 */
export const SYSTEMATIC: Record<ConversionMode, number> = { calibrated: 0.05, physics: 0.15 };
/** Never show a range tighter than this, whatever the spread. */
export const MIN_HALF_RANGE_LB = 2;

/**
 * Honest +/- half-range in lb. Measurement part: T ~ f^2 so dT/T = 2 df/f, with
 * df the hit standard deviation (or half the spread when only the spread is known).
 */
export function uncertaintyLb(lb: number, hz: number, sdHz: number, mode: ConversionMode): number {
  const meas = hz > 0 ? (2 * Math.max(0, sdHz)) / hz : 0;
  const u = lb * Math.sqrt(meas * meas + SYSTEMATIC[mode] ** 2);
  return Math.max(MIN_HALF_RANGE_LB, u);
}

export type Unit = 'lb' | 'kg';

export function fromLb(lb: number, unit: Unit): number {
  return unit === 'kg' ? lb * KG_PER_LB : lb;
}
export function toLb(v: number, unit: Unit): number {
  return unit === 'kg' ? v / KG_PER_LB : v;
}
/** Display with one decimal for lb and kg alike; ranges are rounded to whole units. */
export function formatTension(lb: number, unit: Unit, digits = 1): string {
  const v = fromLb(lb, unit);
  return (Math.round(v * 10 ** digits) / 10 ** digits).toFixed(digits);
}
