import { formatTension, fromLb, type Unit } from '../lib/physics';

export function t(lb: number, unit: Unit, digits = 1): string {
  return formatTension(lb, unit, digits);
}
export function tu(lb: number, unit: Unit, digits = 1): string {
  return `${formatTension(lb, unit, digits)} ${unit}`;
}
/** "46 ± 2.3 lb" style, range in the same unit. */
export function withRange(lb: number, rangeLb: number, unit: Unit): string {
  return `${formatTension(lb, unit)} ± ${formatTension(rangeLb, unit)} ${unit}`;
}
export function rangeText(lb: number, rangeLb: number, unit: Unit): string {
  return `${formatTension(lb - rangeLb, unit)} to ${formatTension(lb + rangeLb, unit)} ${unit}`;
}
export function unitValue(lb: number, unit: Unit): number {
  return Math.round(fromLb(lb, unit) * 10) / 10;
}
export function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
export function num(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
