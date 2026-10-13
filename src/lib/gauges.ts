import type { StringModel } from './types';

function num(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Parse "16L=1.25, 17=1.20" or "1.25, 1.30". */
export function parseGauges(text: string): StringModel['gauges'] {
  return text.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean).flatMap((p) => {
    const m = p.match(/^(.+?)\s*[=:]\s*([\d.,]+)$/);
    const label = m ? m[1]!.trim() : p;
    const mm = num(m ? m[2]! : p);
    return mm && mm > 0.8 && mm < 2 ? [{ label: m ? label : mm.toFixed(2), mm }] : [];
  });
}
