// JSON and CSV export, and validated JSON import.
import type { Backup } from './db';
import type { Reading, Setup } from './types';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDate = (v: unknown): v is string => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);

export class ImportError extends Error {}

/** Parse and validate a backup file. Throws ImportError with a readable message. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new ImportError('That file is not valid JSON.'); }
  if (!isObj(raw) || raw.app !== 'stringbed') throw new ImportError('That file is not a Stringbed backup.');
  if (raw.version !== 1) throw new ImportError(`Unsupported backup version: ${String(raw.version)}.`);
  const arr = (k: string): unknown[] => {
    const v = raw[k as keyof typeof raw];
    if (v === undefined) return [];
    if (!Array.isArray(v)) throw new ImportError(`"${k}" must be a list.`);
    return v;
  };
  const setups = arr('setups').map((s, i) => {
    if (!isObj(s) || !isStr(s.id) || !isStr(s.name) || !isObj(s.mains)) throw new ImportError(`Setup ${i + 1} is missing id, name or mains.`);
    return { hours: [], calib: {}, hitter: 'hard', capWeeks: 6, checkPct: 20, restringPct: 25, createdAt: 0, updatedAt: 0, ...s } as unknown as Setup;
  });
  const readings = arr('readings').map((r, i) => {
    if (!isObj(r) || !isStr(r.id) || !isStr(r.setupId) || !isDate(r.date) || !isNum(r.lb) || r.lb <= 0) throw new ImportError(`Reading ${i + 1} needs id, setupId, a YYYY-MM-DD date and a positive lb value.`);
    return { side: 'mains', source: 'other', createdAt: 0, ...r } as unknown as Reading;
  });
  const strings = arr('strings').map((s, i) => {
    if (!isObj(s) || !isStr(s.id) || !isStr(s.brand) || !isStr(s.model) || !Array.isArray(s.gauges)) throw new ImportError(`String ${i + 1} is incomplete.`);
    return s as unknown as Backup['strings'][number];
  });
  const racquets = arr('racquets').map((s, i) => {
    if (!isObj(s) || !isStr(s.id) || !isStr(s.brand) || !isStr(s.model)) throw new ImportError(`Racquet ${i + 1} is incomplete.`);
    return s as unknown as Backup['racquets'][number];
  });
  return { app: 'stringbed', version: 1, exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : '', setups, readings, strings, racquets };
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  // Guard against spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? "'" + s : s;
  return /[",\n\r]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
}

export function readingsCsv(setups: readonly Setup[], readings: readonly Reading[]): string {
  const name = new Map(setups.map((s) => [s.id, s.name]));
  const head = ['setup', 'date', 'side', 'lb', 'kg', 'range_lb', 'hz', 'spread_hz', 'hits', 'mode', 'source', 'note'];
  const rows = [...readings]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
    .map((r) => [
      name.get(r.setupId) ?? r.setupId, r.date, r.side, r.lb.toFixed(1), (r.lb * 0.45359237).toFixed(1),
      r.rangeLb != null ? r.rangeLb.toFixed(1) : '', r.hz != null ? r.hz.toFixed(2) : '', r.spreadHz != null ? r.spreadHz.toFixed(2) : '',
      r.hits ?? '', r.mode ?? '', r.source, r.note ?? '',
    ]);
  return [head, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function download(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
