// Spectrum of the selected hit (normalised magnitude) with the chosen peak marked,
// plus a faint live analyser trace. Tap or click to choose a different peak;
// with focus, Left/Right jump to the neighbouring local peak.
import type { SpectrumPoint } from '../lib/dsp';

interface Props {
  spectrum: SpectrumPoint[] | null;
  markerHz: number | null;
  autoHz?: number | null;
  live?: Float32Array | null;
  liveBinHz?: number;
  fromHz: number;
  toHz: number;
  onPick?: (hz: number) => void;
}

const W = 600, H = 150, ML = 8, MR = 8, MT = 8, MB = 22;

export function Spectrum({ spectrum, markerHz, autoHz, live, liveBinHz = 0, fromHz, toHz, onPick }: Props) {
  const f0 = spectrum?.[0]?.hz ?? fromHz;
  const f1 = spectrum?.[spectrum.length - 1]?.hz ?? toHz;
  const X = (f: number) => ML + ((W - ML - MR) * (f - f0)) / (f1 - f0);
  const Y = (m: number) => MT + (H - MT - MB) * (1 - Math.max(0, Math.min(1, m)));
  const path = spectrum?.length ? spectrum.map((p, i) => `${i ? 'L' : 'M'}${X(p.hz).toFixed(1)} ${Y(p.mag).toFixed(1)}`).join('') : '';

  let livePath = '';
  if (live && liveBinHz > 0) {
    const k0 = Math.max(1, Math.floor(f0 / liveBinHz)), k1 = Math.min(live.length - 1, Math.ceil(f1 / liveBinHz));
    const pts: string[] = [];
    for (let k = k0; k <= k1; k++) {
      const db = live[k]!;
      const m = Number.isFinite(db) ? (db + 100) / 80 : 0; // -100..-20 dBFS -> 0..1
      pts.push(`${pts.length ? 'L' : 'M'}${X(k * liveBinHz).toFixed(1)} ${Y(m).toFixed(1)}`);
    }
    livePath = pts.join('');
  }

  const toHzFromEvent = (ev: MouseEvent) => {
    const svg = ev.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * W;
    return f0 + ((x - ML) / (W - ML - MR)) * (f1 - f0);
  };

  const peaks = spectrum ? localPeaks(spectrum) : [];
  const onKey = (ev: KeyboardEvent) => {
    if (!onPick || markerHz == null || !peaks.length) return;
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    const next = ev.key === 'ArrowRight' ? peaks.find((p) => p > markerHz + 1) : [...peaks].reverse().find((p) => p < markerHz - 1);
    if (next != null) onPick(next);
  };

  const ticks = niceTicks(f0, f1);
  return (
    <div class="spec">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role={onPick ? 'slider' : 'img'}
        aria-label={onPick ? 'Spectrum. Tap a peak to choose it, or use the left and right arrow keys to move between peaks.' : 'Live spectrum'}
        aria-valuemin={onPick ? Math.round(f0) : undefined}
        aria-valuemax={onPick ? Math.round(f1) : undefined}
        aria-valuenow={onPick && markerHz != null ? Math.round(markerHz * 10) / 10 : undefined}
        aria-valuetext={markerHz != null ? `${markerHz.toFixed(1)} hertz` : undefined}
        tabIndex={onPick ? 0 : undefined}
        onKeyDown={onKey}
        onClick={onPick ? (ev) => onPick(toHzFromEvent(ev as unknown as MouseEvent)) : undefined}
        style={{ cursor: onPick ? 'crosshair' : 'default' }}
      >
        <rect x={ML} y={MT} width={W - ML - MR} height={H - MT - MB} fill="var(--bg)" rx="4" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1={MT} y2={H - MB} stroke="var(--grid)" />
            <text class="tx" x={X(t)} y={H - 6} text-anchor="middle">{t}</text>
          </g>
        ))}
        {livePath && <path d={livePath} fill="none" stroke="var(--muted)" stroke-width="1" opacity="0.45" />}
        {path && <path d={path} fill="none" stroke="var(--ink)" stroke-width="1.5" />}
        {autoHz != null && markerHz != null && Math.abs(autoHz - markerHz) > 0.5 && (
          <line x1={X(autoHz)} x2={X(autoHz)} y1={MT} y2={H - MB} stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3" />
        )}
        {markerHz != null && markerHz >= f0 && markerHz <= f1 && (
          <g>
            <line x1={X(markerHz)} x2={X(markerHz)} y1={MT} y2={H - MB} stroke="var(--accent)" stroke-width="2.5" />
            <text class="tx" x={Math.min(W - MR - 4, X(markerHz) + 6)} y={MT + 12} text-anchor={X(markerHz) > W - 90 ? 'end' : 'start'} style={{ fill: 'var(--accent)', fontWeight: 600 }}>
              {markerHz.toFixed(1)} Hz
            </text>
          </g>
        )}
        {!path && !livePath && <text class="tx" x={W / 2} y={H / 2} text-anchor="middle">Spectrum appears here</text>}
      </svg>
    </div>
  );
}

function localPeaks(sp: SpectrumPoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < sp.length - 1; i++) {
    const p = sp[i]!;
    if (p.mag > 0.08 && p.mag >= sp[i - 1]!.mag && p.mag > sp[i + 1]!.mag) out.push(p.hz);
  }
  return out;
}

function niceTicks(a: number, b: number): number[] {
  const span = b - a;
  const step = span > 2000 ? 500 : span > 800 ? 200 : 100;
  const out: number[] = [];
  for (let t = Math.ceil(a / step) * step; t <= b; t += step) out.push(t);
  return out;
}
