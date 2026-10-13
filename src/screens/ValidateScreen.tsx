// Repeatability check: five hits on the same string, raw standard deviation.
import { useState } from 'preact/hooks';
import { useApp } from '../app/state';
import { useMeasure } from '../app/useMeasure';
import { estimate } from '../app/convert';
import { MeasurePanel, type Excitation } from '../components/MeasurePanel';
import { NoSetup, Seg, SetupPicker } from '../components/common';
import { stdev } from '../lib/dsp';
import { t } from '../app/format';
import type { Side } from '../lib/types';

const N = 5;

export function ValidateScreen() {
  const { state } = useApp();
  const s = state.active;
  const unit = state.settings.unit;
  const [side, setSide] = useState<Side>('mains');
  const [excitation, setExcitation] = useState<Excitation>('pluck');
  const range = side === 'mains' ? state.settings.mainsRange : state.settings.crossesRange;
  const m = useMeasure(range, N);

  if (!state.loaded) return <p class="empty">Loading…</p>;
  if (!s) return <NoSetup />;

  const hz = m.hits.map((h) => h.hz);
  const lbs = hz.map((f) => estimate(s, side, f, 0, state.lib).lb);
  const complete = hz.length >= N;
  const mean = hz.length ? hz.reduce((a, b) => a + b, 0) / hz.length : 0;
  const sdHz = stdev(hz), sdLb = stdev(lbs);
  const verdict = sdHz < 0.5 ? ['ok', 'Excellent repeatability'] : sdHz < 1 ? ['ok', 'Good repeatability'] : sdHz < 2 ? ['watch', 'Fair: check technique'] : ['bad', 'Poor: readings disagree'];

  return (
    <>
      <SetupPicker />
      <section class="panel">
        <h2>Validate repeatability</h2>
        <p>Measure the same string {N} times without moving the racquet. The standard deviation shows how repeatable your technique and room are. It does not prove absolute accuracy; only a calibration against a trusted reference does that.</p>
        <div class="row center spread">
          <Seg label="Side" value={side} onChange={(v) => { setSide(v); m.clear(); }} options={[['mains', 'Mains'], ['crosses', 'Crosses']]} />
          <Seg label="Excitation" value={excitation} onChange={setExcitation} options={[['pluck', 'Pluck'], ['tap', 'Tap']]} />
        </div>
      </section>
      <MeasurePanel m={m} range={range} excitation={excitation} minHits={N} />
      <section class="panel" aria-live="polite">
        <h3>Result ({hz.length} of {N})</h3>
        {hz.length ? (
          <>
            <div class="tablewrap">
              <table>
                <thead><tr><th>#</th><th>Hz</th><th>{unit}</th></tr></thead>
                <tbody>{hz.map((f, i) => <tr key={i}><td class="n">{i + 1}</td><td class="n">{f.toFixed(2)}</td><td class="n">{t(lbs[i]!, unit)}</td></tr>)}</tbody>
              </table>
            </div>
            <dl class="facts">
              <dt>Mean</dt><dd>{mean.toFixed(2)} Hz</dd>
              <dt>Std dev</dt><dd>{sdHz.toFixed(2)} Hz ≈ {t(sdLb, unit, 2)} {unit}</dd>
              <dt>Range</dt><dd>{(Math.max(...hz) - Math.min(...hz)).toFixed(2)} Hz</dd>
            </dl>
            {complete && <p><span class={'pill ' + verdict[0]}>{verdict[1]}</span></p>}
            {complete && sdHz >= 1 && <p class="hint">Try: a quieter room, the same pluck spot and strength each time, phone held still 2 to 10 cm away, dampener removed. In Tap mode, check each hit's marker is on the fundamental.</p>}
          </>
        ) : <p class="empty">No hits yet.</p>}
      </section>
    </>
  );
}
