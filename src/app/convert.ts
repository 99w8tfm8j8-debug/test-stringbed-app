// Turn a measured frequency into a tension estimate for a setup and side,
// choosing calibrated mode when a calibration exists.
import { calibratedLb, learnedFactor, MATERIAL_DENSITY, MIN_HALF_RANGE_LB, physicsLb, SYSTEMATIC, type ConversionMode, type PhysicsInput } from '../lib/physics';
import type { Racquet, Setup, Side, StringChoice, StringModel } from '../lib/types';

export const DEFAULT_MAIN_LENGTH_MM = 320;

export interface Library {
  strings: Map<string, StringModel>;
  racquets: Map<string, Racquet>;
}

export interface Estimate {
  lb: number;
  /** +/- half range, lb. */
  rangeLb: number;
  mode: ConversionMode;
  /** Plain-language description of where the number comes from. */
  how: string;
  physics: PhysicsInput;
  /** Length is the user's ruler measurement rather than an estimate. */
  lengthMeasured: boolean;
}

export function stringFor(setup: Setup, side: Side): StringChoice {
  return side === 'crosses' && setup.crosses ? setup.crosses : setup.mains;
}

export function densityFor(choice: StringChoice, lib: Library): number {
  if (choice.densityOverride) return choice.densityOverride;
  const model = choice.stringId ? lib.strings.get(choice.stringId) : undefined;
  if (model?.densityOverride) return model.densityOverride;
  return MATERIAL_DENSITY[model?.material ?? choice.material].gPerCm3;
}

export function lengthFor(setup: Setup, side: Side, lib: Library): { mm: number; measured: boolean } {
  if (side === 'crosses' && setup.crossLengthMm) return { mm: setup.crossLengthMm, measured: true };
  if (side === 'mains' && setup.mainLengthMm) return { mm: setup.mainLengthMm, measured: true };
  const rq = setup.racquetId ? lib.racquets.get(setup.racquetId) : undefined;
  const mains = rq?.mainLengthMm ?? DEFAULT_MAIN_LENGTH_MM;
  // Without a measurement, a centre cross is assumed about 80% of a centre main.
  return { mm: side === 'crosses' ? Math.round(mains * 0.8) : mains, measured: false };
}

export function physicsInputFor(setup: Setup, side: Side, lib: Library): { p: PhysicsInput; measured: boolean } {
  const choice = stringFor(setup, side);
  const len = lengthFor(setup, side, lib);
  return { p: { lengthMm: len.mm, gaugeMm: choice.gaugeMm, density: densityFor(choice, lib) }, measured: len.measured };
}

/** Systematic error for physics mode: 15% raw, 8% once a calibration factor has been learned. */
export function physicsSystematic(hasFactor: boolean, lengthMeasured: boolean): number {
  if (hasFactor) return 0.08;
  return lengthMeasured ? SYSTEMATIC.physics : 0.2;
}

export function estimate(setup: Setup, side: Side, hz: number, sdHz: number, lib: Library, forceMode?: ConversionMode): Estimate {
  const { p, measured } = physicsInputFor(setup, side, lib);
  const cal = setup.calib[side];
  const mode: ConversionMode = forceMode ?? (cal ? 'calibrated' : 'physics');
  const meas = hz > 0 ? (2 * Math.max(0, sdHz)) / hz : 0;
  if (mode === 'calibrated' && cal) {
    const lb = calibratedLb(hz, cal.refHz, cal.refLb);
    const u = lb * Math.sqrt(meas ** 2 + SYSTEMATIC.calibrated ** 2);
    return { lb, rangeLb: Math.max(MIN_HALF_RANGE_LB, u), mode, physics: p, lengthMeasured: measured, how: `Scaled from your ${side} calibration: ${cal.refLb.toFixed(1)} lb at ${cal.refHz.toFixed(1)} Hz on ${cal.on}.` };
  }
  const factor = cal?.factor ?? setup.carriedFactor?.[side];
  const raw = physicsLb(hz, p);
  const lb = raw * (factor ?? 1);
  const sys = physicsSystematic(factor != null, measured);
  const u = lb * Math.sqrt(meas ** 2 + sys ** 2);
  const parts = [`${p.gaugeMm.toFixed(2)} mm gauge`, `${p.lengthMm} mm ${measured ? 'measured' : 'estimated'} length`, `${p.density.toFixed(2)} g/cm³ density (estimate)`];
  return {
    lb, rangeLb: Math.max(MIN_HALF_RANGE_LB, u), mode: 'physics', physics: p, lengthMeasured: measured,
    how: `String physics from ${parts.join(', ')}${factor != null ? `, corrected by a learned factor of ${factor.toFixed(3)}` : ''}.`,
  };
}

/** Build a calibration record from a locked measurement and a known tension. */
export function makeCalibration(setup: Setup, side: Side, refHz: number, refLb: number, lib: Library, on: string, spreadHz?: number, hits?: number) {
  const { p } = physicsInputFor(setup, side, lib);
  return { refHz, refLb, on, factor: learnedFactor(refHz, refLb, p), ...(spreadHz != null ? { spreadHz } : {}), ...(hits != null ? { hits } : {}) };
}
