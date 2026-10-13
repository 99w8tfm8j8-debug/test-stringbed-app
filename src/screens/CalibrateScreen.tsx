// Guided calibration: a known tension plus a locked pitch gives T = T_ref (f / f_ref)^2.
import { useState } from 'preact/hooks';
import { useApp } from '../app/state';
import { useMeasure } from '../app/useMeasure';
import { makeCalibration } from '../app/convert';
import { MeasurePanel, type Excitation } from '../components/MeasurePanel';
import { NoSetup, Seg, SetupPicker } from '../components/common';
import { num, shortDate, tu } from '../app/format';
import { todayIso } from '../lib/status';
import { toLb, fromLb } from '../lib/physics';
import type { Side } from '../lib/types';

type Basis = 'fresh' | 'meter';

export function CalibrateScreen() {
  const { state, actions } = useApp();
  const s = state.active;
  const unit = state.settings.unit;
  const [side, setSide] = useState<Side>('mains');
  const [basis, setBasis] = useState<Basis>('fresh');
  const [excitation, setExcitation] = useState<Excitation>('pluck');
  const [known, setKnown] = useState('');
  const [done, setDone] = useState(false);
  const range = side === 'mains' ? state.settings.mainsRange : state.settings.crossesRange;
  const m = useMeasure(range);

  if (!state.loaded) return <p class="empty">Loading…</p>;
  if (!s) return <NoSetup />;

  const strungAt = side === 'mains' ? s.startLb : (s.crossStartLb ?? s.startLb);
  const knownLb = num(known) != null ? toLb(num(known)!, unit) : basis === 'fresh' ? strungAt ?? null : null;
  const sum = m.summary;
  const existing = s.calib[side];
  const ready = sum?.locked && knownLb != null && knownLb > 0;

  const save = async () => {
    if (!sum || knownLb == null) return;
    const cal = makeCalibration(s, side, sum.hz, knownLb, state.lib, todayIso(), sum.spreadHz, sum.kept.length);
    await actions.saveSetup({ ...s, calib: { ...s.calib, [side]: { ...cal, note: basis === 'fresh' ? 'Straight after stringing' : 'Against a tension meter' } } });
    setDone(true);
  };

  return (
    <>
      <SetupPicker />
      <section class="panel">
        <h2>Calibrate {s.name}</h2>
        <p>Calibration ties this racquet and string to a tension you trust. Later readings scale from it as tension = reference × (pitch ÷ reference pitch)², which cancels errors in the length, gauge and density. Mains and crosses are calibrated separately.</p>
        {existing && <p class="note ok">Current {side} calibration: {tu(existing.refLb, unit)} at {existing.refHz.toFixed(1)} Hz on {shortDate(existing.on)}. Saving replaces it.</p>}
        <div class="row center spread">
          <Seg label="Side" value={side} onChange={(v) => { setSide(v); m.clear(); setDone(false); }} options={[['mains', 'Mains'], ['crosses', 'Crosses']]} />
          <Seg label="Excitation" value={excitation} onChange={setExcitation} options={[['pluck', 'Pluck'], ['tap', 'Tap']]} />
        </div>
      </section>

      <section class="panel">
        <h3>Step 1. Where does the known tension come from?</h3>
        <fieldset>
          <legend>Reference</legend>
          <label><input type="radio" name="basis" checked={basis === 'fresh'} onChange={() => setBasis('fresh')} /> Just strung (within about an hour)</label>
          <label><input type="radio" name="basis" checked={basis === 'meter'} onChange={() => setBasis('meter')} /> A stringer's tension meter (ERT, Stringmeter) right now</label>
        </fieldset>
        {basis === 'fresh' && <p class="hint">A new string relaxes roughly 10% in the first 24 hours, so calibrate as soon after stringing as you can. The machine's reference tension is not the bed's real tension either; this is a consistent reference, not a perfect one.</p>}
        <div class="field">
          <label for="known">Known {side} tension ({unit})</label>
          <input id="known" type="number" inputMode="decimal" step="0.1" value={known} placeholder={basis === 'fresh' && strungAt ? String(Math.round(fromLb(strungAt, unit) * 10) / 10) : ''} onInput={(e) => setKnown(e.currentTarget.value)} />
          {basis === 'fresh' && strungAt && !known && <span class="hint">Using the strung-at tension from the setup.</span>}
        </div>
      </section>

      <section class="panel tight">
        <h3>Step 2. Measure until it locks</h3>
        <p class="hint">Use the same {excitation} technique and phone position you will use later.</p>
      </section>
      <MeasurePanel m={m} range={range} excitation={excitation} />

      <section class="panel">
        <h3>Step 3. Save</h3>
        {done ? (
          <p class="note ok" role="status">Saved. Measurements of the {side} now use calibrated mode. <a href="#/measure">Measure</a> or <a href="#/validate">check repeatability</a>.</p>
        ) : (
          <>
            <p>{ready ? `Reference: ${tu(knownLb!, unit)} at ${sum!.hz.toFixed(2)} Hz (spread ${sum!.spreadHz.toFixed(2)} Hz).` : 'Needs a known tension and a locked measurement.'}</p>
            <button class="primary" disabled={!ready} onClick={() => void save()}>Save {side} calibration</button>
          </>
        )}
      </section>
    </>
  );
}
