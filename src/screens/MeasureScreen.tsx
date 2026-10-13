// Measure tension from sound for the active setup.
import { useState } from 'preact/hooks';
import { newId, useApp } from '../app/state';
import { useMeasure } from '../app/useMeasure';
import { estimate } from '../app/convert';
import { MeasurePanel, type Excitation } from '../components/MeasurePanel';
import { NoSetup, Seg, SetupPicker } from '../components/common';
import { rangeText, t } from '../app/format';
import { todayIso } from '../lib/status';
import type { ConversionMode } from '../lib/physics';
import type { Side } from '../lib/types';

export function MeasureScreen() {
  const { state, actions } = useApp();
  const [side, setSide] = useState<Side>('mains');
  const [excitation, setExcitation] = useState<Excitation>('pluck');
  const [modeOverride, setModeOverride] = useState<ConversionMode | null>(null);
  const [saved, setSaved] = useState(false);
  const range = side === 'mains' ? state.settings.mainsRange : state.settings.crossesRange;
  const m = useMeasure(range);
  const s = state.active;
  const unit = state.settings.unit;

  if (!state.loaded) return <p class="empty">Loading…</p>;
  if (!s) return <NoSetup>You need one to convert pitch to tension.</NoSetup>;

  const sum = m.summary;
  const cal = s.calib[side];
  const mode: ConversionMode = modeOverride ?? (cal ? 'calibrated' : 'physics');
  const est = sum ? estimate(s, side, sum.hz, sum.sdHz || sum.spreadHz / 2, state.lib, mode === 'calibrated' && !cal ? 'physics' : mode) : null;

  const save = async () => {
    if (!sum || !est) return;
    await actions.saveReading({
      id: newId('r'), setupId: s.id, date: todayIso(), lb: Math.round(est.lb * 100) / 100, side, source: 'app',
      hz: sum.hz, spreadHz: sum.spreadHz, sdHz: sum.sdHz, hits: sum.kept.length, mode: est.mode, rangeLb: Math.round(est.rangeLb * 100) / 100,
      note: `${excitation}, ${sum.kept.length} hits${sum.locked ? '' : ', not locked'}`, createdAt: Date.now(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <>
      <SetupPicker />
      <div class="row center spread">
        <Seg label="String side" value={side} onChange={(v) => { setSide(v); m.clear(); }} options={[['mains', 'Mains'], ['crosses', 'Crosses']]} />
        <Seg label="Excitation" value={excitation} onChange={setExcitation} options={[['pluck', 'Pluck'], ['tap', 'Tap']]} />
      </div>
      <MeasurePanel m={m} range={range} excitation={excitation} />

      <section class="panel" aria-live="polite">
        <div class="row spread center">
          <h2>Estimated {side} tension</h2>
          {cal && <Seg label="Conversion mode" value={mode} onChange={setModeOverride} options={[['calibrated', 'Calibrated'], ['physics', 'Physics']]} />}
        </div>
        {est && sum ? (
          <>
            <div class="big"><span class="num md">{t(est.lb, unit)}</span><span class="unit">{unit}</span></div>
            <p><strong>Likely range {rangeText(est.lb, est.rangeLb, unit)}</strong> {sum.locked ? '' : <span class="badge weak">not locked yet</span>}</p>
            <p class="hint">{est.how}</p>
            {!cal && <p class="note">No {side} calibration yet, so this uses string physics and the range is wide. <a href="#/calibrate">Calibrate</a> right after stringing, or against a meter you trust, for about ±2 to 3 lb.</p>}
            {!est.lengthMeasured && est.mode === 'physics' && <p class="hint">The vibrating length is estimated from head size. Measure the centre {side === 'mains' ? 'main' : 'cross'} with a ruler on the <a href="#/setup">Setup</a> tab.</p>}
            <div class="row">
              <button class="primary" onClick={() => void save()} disabled={!sum.kept.length}>{saved ? 'Saved' : 'Save as reading'}</button>
              <a class="btn" href="#/about">Why a range?</a>
            </div>
          </>
        ) : (
          <p class="empty">Measure a few hits to see the tension.</p>
        )}
      </section>
    </>
  );
}
