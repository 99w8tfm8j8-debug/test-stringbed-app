import type { ConversionMode, MaterialClass, Unit } from './physics';

export type Feel = 'soft' | 'medium' | 'stiff';

export interface Gauge {
  /** Label as sold, e.g. "16L" or "1.25". */
  label: string;
  mm: number;
}

export interface StringModel {
  id: string;
  brand: string;
  model: string;
  material: MaterialClass;
  construction: string;
  gauges: Gauge[];
  /** Only when the manufacturer states one. */
  feel?: Feel;
  /** g/cm^3, overrides the material-class default. */
  densityOverride?: number;
  sourceUrl: string;
  verified: boolean;
  /** How the record was checked, or why it is not verified. */
  verification?: string;
  custom?: boolean;
}

export interface Racquet {
  id: string;
  brand: string;
  model: string;
  headSizeSqIn: number;
  /** e.g. "16x19" */
  pattern: string;
  /** Inches; 27 is standard. */
  lengthIn: number;
  /** Estimated vibrating length of a centre main, mm. Measure it! */
  mainLengthMm: number;
  sourceUrl: string;
  verified: boolean;
  verification?: string;
  custom?: boolean;
}

export type Side = 'mains' | 'crosses';

export interface StringChoice {
  stringId?: string;
  /** Free text when no library string is chosen. */
  name?: string;
  material: MaterialClass;
  gaugeLabel?: string;
  gaugeMm: number;
  densityOverride?: number;
}

export interface Calibration {
  refHz: number;
  refLb: number;
  on: string;
  spreadHz?: number;
  hits?: number;
  /** Physics-model correction factor learned at calibration time. */
  factor?: number;
  note?: string;
}

export type HitterStyle = 'hard' | 'light';

export interface HoursEntry {
  date: string;
  hours: number;
}

export interface Setup {
  id: string;
  name: string;
  racquetId?: string;
  racquetName?: string;
  /** Measured vibrating length of a centre main, mm (preferred over the estimate). */
  mainLengthMm?: number;
  /** Measured vibrating length of a centre cross, mm. */
  crossLengthMm?: number;
  mains: StringChoice;
  /** Present for a hybrid. */
  crosses?: StringChoice;
  /** Strung-at tension in lb (mains). */
  startLb?: number;
  crossStartLb?: number;
  strungOn?: string;
  hitter: HitterStyle;
  capWeeks: number;
  checkPct: number;
  restringPct: number;
  /** Optional cap on hours played since stringing. */
  capHours?: number;
  hours: HoursEntry[];
  calib: Partial<Record<Side, Calibration>>;
  /** Physics correction factors carried over from a previous setup with the same racquet and string. */
  carriedFactor?: Partial<Record<Side, number>>;
  /** Id of the setup this one replaced (restring history). */
  previousId?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type ReadingSource = 'app' | 'estimate' | 'meter' | 'other';

export interface Reading {
  id: string;
  setupId: string;
  date: string;
  /** Always stored in lb. */
  lb: number;
  side: Side;
  source: ReadingSource;
  hz?: number;
  spreadHz?: number;
  sdHz?: number;
  hits?: number;
  mode?: ConversionMode;
  /** +/- half range in lb. */
  rangeLb?: number;
  note?: string;
  createdAt: number;
}

export interface Settings {
  unit: Unit;
  theme: 'system' | 'light' | 'dark';
  activeSetupId?: string;
  /** Detection ranges in Hz. */
  mainsRange: { fmin: number; fmax: number };
  crossesRange: { fmin: number; fmax: number };
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'lb',
  theme: 'system',
  mainsRange: { fmin: 300, fmax: 900 },
  crossesRange: { fmin: 250, fmax: 1100 },
};

export const CAP_WEEKS: Record<HitterStyle, number> = { hard: 6, light: 12 };
