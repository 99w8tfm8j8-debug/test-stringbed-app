// Tension over time with the check and restring lines (ported from the prototype).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Reading, Setup } from '../lib/types';
import { daysBetween, sortReadings, todayIso } from '../lib/status';
import { fromLb, type Unit } from '../lib/physics';
import { shortDate } from '../app/format';

export function Chart({ setup, readings, unit }: { setup: Setup; readings: Reading[]; unit: Unit }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => { if (e) setW(Math.round(e.contentRect.width)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!setup.startLb) return <div class="empty">Set a strung-at tension on the Setup tab to draw the chart.</div>;
  const start = setup.startLb;
  const rs = sortReadings(readings.filter((r) => r.setupId === setup.id));
  const mains = rs.filter((r) => r.side === 'mains');
  const crosses = rs.filter((r) => r.side === 'crosses');
  const watchLb = start * (1 - setup.checkPct / 100), badLb = start * (1 - setup.restringPct / 100);
  const t0 = todayIso();
  const firstDate = setup.strungOn ?? rs[0]?.date ?? t0;
  const lastDate = [t0, ...rs.map((r) => r.date)].sort().pop()!;
  const span = Math.max(7, daysBetween(firstDate, lastDate));
  const u = (lb: number) => fromLb(lb, unit);
  const vals = [...rs.map((r) => u(r.lb)), u(badLb), u(start)];
  let lo = Math.min(...vals) - 2, hi = Math.max(...vals) + 2;
  const step = hi - lo <= 16 ? 2 : 5;
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const W = Math.max(300, Math.min(760, w)), H = 240, ml = 36, mr = 14, mt = 14, mb = 28, pw = W - ml - mr, ph = H - mt - mb;
  const X = (d: string) => ml + (pw * Math.max(0, daysBetween(firstDate, d))) / span;
  const Y = (lb: number) => mt + ph * (1 - (u(lb) - lo) / (hi - lo));
  const yt: number[] = [];
  for (let v = lo; v <= hi; v += step) yt.push(v);
  const xt = [0, 1, 2, 3, 4].map((i) => new Date(Date.parse(firstDate + 'T00:00:00Z') + (span * i / 4) * 864e5).toISOString().slice(0, 10));
  const seq = [...(setup.strungOn ? [{ d: setup.strungOn, v: start, start: true }] : []), ...mains.map((r) => ({ d: r.date, v: r.lb, start: false }))];
  const fmt = (lb: number) => (Math.round(u(lb) * 10) / 10).toFixed(1);
  const hline = (lb: number, color: string, label: string) => (
    <g>
      <line x1={ml} x2={W - mr} y1={Y(lb)} y2={Y(lb)} stroke={color} stroke-width="1.5" stroke-dasharray="5 4" />
      <text class="tx" x={ml + 6} y={Y(lb) - 5} style={{ fill: color }}>{label}</text>
    </g>
  );
  const last = seq[seq.length - 1];
  const desc = `Tension readings in ${unit}. Strung at ${fmt(start)}, check line ${fmt(watchLb)}, restring line ${fmt(badLb)}. ` +
    (mains.length ? `Latest mains reading ${fmt(mains[mains.length - 1]!.lb)} on ${mains[mains.length - 1]!.date}.` : 'No readings yet.');
  return (
    <div class="chartbox" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc}>
        {yt.map((v) => (
          <g key={v}>
            <line x1={ml} x2={W - mr} y1={mt + ph * (1 - (v - lo) / (hi - lo))} y2={mt + ph * (1 - (v - lo) / (hi - lo))} stroke="var(--grid)" />
            <text class="tx" x={ml - 6} y={mt + ph * (1 - (v - lo) / (hi - lo)) + 4} text-anchor="end">{v}</text>
          </g>
        ))}
        {xt.map((d, i) => (
          <text key={d + i} class="tx" x={ml + (pw * i) / 4} y={H - 8} text-anchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>{shortDate(d)}</text>
        ))}
        <line x1={ml} x2={W - mr} y1={Y(start)} y2={Y(start)} stroke="var(--muted)" />
        <text class="tx" x={W - mr - 4} y={Y(start) - 5} text-anchor="end">strung {fmt(start)}</text>
        {hline(watchLb, 'var(--watch)', `check ${fmt(watchLb)}`)}
        {hline(badLb, 'var(--bad)', `restring ${fmt(badLb)}`)}
        {seq.length > 1 && <polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" points={seq.map((p) => `${X(p.d).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')} />}
        {seq.map((p, i) => (
          <circle key={i} cx={X(p.d)} cy={Y(p.v)} r={p.start ? 4 : 5} fill={p.start ? 'var(--surface)' : 'var(--accent)'} stroke="var(--accent)" stroke-width="2" />
        ))}
        {crosses.map((r) => (
          <rect key={r.id} x={X(r.date) - 4} y={Y(r.lb) - 4} width="8" height="8" fill="var(--surface)" stroke="var(--muted)" stroke-width="2" />
        ))}
        {last && !last.start && (
          <text class="tx" x={Math.min(W - mr - 4, X(last.d) + 8)} y={Y(last.v) + 16} text-anchor={X(last.d) > W - 80 ? 'end' : 'start'} style={{ fill: 'var(--ink)', fontWeight: 500 }}>
            {fmt(last.v)} {unit}
          </text>
        )}
      </svg>
      <p class="hint">Filled dots: mains. {crosses.length ? 'Squares: crosses. ' : ''}{mains.length < 2 ? 'The line fills in as you log more readings.' : ''}</p>
    </div>
  );
}
