// Home: current tension and status, chart, reading log and hours played.
import { useState } from 'preact/hooks';
import { newId, useApp } from '../app/state';
import { computeStatus, sortReadings, todayIso } from '../lib/status';
import type { ReadingSource, Side } from '../lib/types';
import { toLb } from '../lib/physics';
import { Chart } from '../components/Chart';
import { NoSetup, Seg, SetupPicker } from '../components/common';
import { num, rangeText, shortDate, t, tu } from '../app/format';

const SOURCE_NAME: Record<ReadingSource, string> = { app: 'Stringbed', estimate: 'Recording', meter: "Stringer's meter", other: 'Other' };

export function LogScreen() {
  const { state, actions } = useApp();
  const s = state.active;
  const unit = state.settings.unit;
  const [val, setVal] = useState('');
  const [date, setDate] = useState(todayIso());
  const [source, setSource] = useState<ReadingSource>('meter');
  const [side, setSide] = useState<Side>('mains');
  const [note, setNote] = useState('');
  const [hours, setHours] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  if (!state.loaded) return <p class="empty">Loading…</p>;
  if (!s) return <NoSetup>Then log readings or measure from sound.</NoSetup>;

  const st = computeStatus(s, state.readings);
  const last = st.last;
  const rs = sortReadings(state.readings.filter((r) => r.setupId === s.id)).reverse();

  const add = async () => {
    const v = num(val);
    if (v == null || v <= 0) return;
    await actions.saveReading({ id: newId('r'), setupId: s.id, date: date || todayIso(), lb: Math.round(toLb(v, unit) * 100) / 100, side, source, note: note.trim(), createdAt: Date.now() });
    setVal(''); setNote('');
  };
  const addHours = async () => {
    const h = num(hours);
    if (h == null || h <= 0) return;
    await actions.saveSetup({ ...s, hours: [...s.hours, { date: todayIso(), hours: h }] });
    setHours('');
  };

  return (
    <>
      <SetupPicker />
      <section class="panel hero" aria-live="polite" aria-label="Current status">
        <div>
          <div class="lbl">Mains tension</div>
          <div class="big"><span class="num">{last ? t(last.lb, unit) : '--'}</span><span class="unit">{unit}</span></div>
          {last?.rangeLb != null && <p class="hint">Range {rangeText(last.lb, last.rangeLb, unit)} ({last.mode === 'calibrated' ? 'calibrated' : 'physics'} mode)</p>}
          <div class="chips" style={{ marginTop: 10 }}>
            {last ? <span class={'pill ' + st.level}>{st.label}</span> : <span class="pill neutral">No readings yet</span>}
            {last && s.startLb != null && st.lossLb != null && (
              <span class="hint mono">{Math.abs(st.lossLb) < 0.05 ? 'No change since stringing' : `${st.lossLb > 0 ? '−' : '+'}${t(Math.abs(st.lossLb), unit)} ${unit} (${Math.round(Math.abs(st.lossPct!))}%) since stringing`}</span>
            )}
            {!last && st.level !== 'ok' && <span class={'pill ' + st.level}>{st.label}</span>}
          </div>
          <p style={{ marginTop: 8 }}>{st.reasons.length ? st.reasons.join(' ') : 'Log or measure a first reading to see how this string is ageing.'}</p>
          {st.projectedRestring && <p class="hint" style={{ marginTop: 6 }}>At your current loss rate ({st.lossPctPerWeek!.toFixed(1)}% a week) the restring line arrives around {shortDate(st.projectedRestring)}.</p>}
        </div>
        <dl class="facts">
          <dt>Strung at</dt><dd>{s.startLb ? tu(s.startLb, unit) : 'not set'}{s.crosses && s.crossStartLb ? ` / ${tu(s.crossStartLb, unit)}` : ''}</dd>
          {s.strungOn && <><dt>Strung on</dt><dd>{shortDate(s.strungOn)}{st.weeks != null ? ` (${st.weeks} wk)` : ''}</dd></>}
          {s.racquetName && <><dt>Racquet</dt><dd>{s.racquetName}</dd></>}
          <dt>String</dt><dd>{s.mains.name ?? 'custom'} {s.mains.gaugeMm.toFixed(2)} mm{s.crosses ? ` / ${s.crosses.name ?? 'custom'} ${s.crosses.gaugeMm.toFixed(2)} mm` : ''}</dd>
          <dt>Hours</dt><dd>{st.hours ? `${Math.round(st.hours * 10) / 10} h${s.capHours ? ` of ${s.capHours}` : ''}` : 'not logged'}</dd>
          <dt>Calibration</dt><dd>{s.calib.mains ? `mains ${shortDate(s.calib.mains.on)}` : 'mains: none'}{s.crosses ? (s.calib.crosses ? `, crosses ${shortDate(s.calib.crosses.on)}` : ', crosses: none') : ''}</dd>
          <dt>Lines</dt><dd>check {s.checkPct}%, restring {s.restringPct}%, cap {s.capWeeks} wk</dd>
        </dl>
      </section>

      <div class="row">
        <a class="btn primary" href="#/measure" style={{ flex: 1 }}>Measure now</a>
        {!s.calib.mains && <a class="btn" href="#/calibrate" style={{ flex: 1 }}>Calibrate</a>}
      </div>

      <section class="panel">
        <h2>Tension over time</h2>
        <Chart setup={s} readings={state.readings} unit={unit} />
      </section>

      <section class="panel">
        <h2>Log a reading</h2>
        <div class="row">
          <div class="field"><label for="rVal">Tension ({unit})</label><input id="rVal" type="number" inputMode="decimal" step="0.1" value={val} onInput={(e) => setVal(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') void add(); }} /></div>
          <div class="field"><label for="rDate">Date</label><input id="rDate" type="date" value={date} onInput={(e) => setDate(e.currentTarget.value)} /></div>
        </div>
        <div class="row">
          <div class="field"><label for="rSource">Source</label>
            <select id="rSource" value={source} onChange={(e) => setSource(e.currentTarget.value as ReadingSource)}>
              <option value="meter">Stringer's meter</option><option value="app">Stringbed</option><option value="estimate">Recording</option><option value="other">Other</option>
            </select>
          </div>
          {s.crosses && <div class="field" style={{ flex: '0 0 auto' }}><span class="lbl">Side</span><Seg label="Side" value={side} onChange={setSide} options={[['mains', 'Mains'], ['crosses', 'Crosses']]} /></div>}
        </div>
        <div class="row">
          <div class="field" style={{ flex: '3 1 200px' }}><label for="rNote">Note (optional)</label><input id="rNote" type="text" value={note} onInput={(e) => setNote(e.currentTarget.value)} placeholder="e.g. before the weekend match" /></div>
          <button class="primary" onClick={() => void add()}>Add reading</button>
        </div>
        {rs.length ? (
          <div class="tablewrap">
            <table>
              <thead><tr><th>Date</th><th>{unit}</th><th>Side</th><th>Source</th><th>Note</th><th><span class="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {rs.map((r) => (
                  <tr key={r.id}>
                    <td class="n">{shortDate(r.date)}</td>
                    <td class="n">{t(r.lb, unit)}{r.rangeLb != null ? <span class="hint"> ±{t(r.rangeLb, unit)}</span> : null}</td>
                    <td>{r.side}</td>
                    <td>{SOURCE_NAME[r.source]}{r.hz ? <span class="hint mono"> {r.hz.toFixed(1)} Hz</span> : null}</td>
                    <td>{r.note}</td>
                    <td>
                      <button class="quiet" aria-label={`Delete reading of ${shortDate(r.date)}`}
                        onClick={() => { if (confirmDel === r.id) { setConfirmDel(null); void actions.deleteReading(r.id); } else { setConfirmDel(r.id); setTimeout(() => setConfirmDel((c) => (c === r.id ? null : c)), 3000); } }}>
                        {confirmDel === r.id ? 'Sure?' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p class="empty">No readings yet for {s.name}.</p>}
      </section>

      <section class="panel">
        <h2>Hours played</h2>
        <p class="hint">Optional. Log time on court to use an hours cap alongside the weeks cap.</p>
        <div class="row">
          <div class="field"><label for="hrs">Hours today</label><input id="hrs" type="number" inputMode="decimal" step="0.25" value={hours} onInput={(e) => setHours(e.currentTarget.value)} /></div>
          <button onClick={() => void addHours()}>Add hours</button>
          {s.hours.length > 0 && <button class="quiet" onClick={() => void actions.saveSetup({ ...s, hours: s.hours.slice(0, -1) })}>Undo last</button>}
        </div>
      </section>
    </>
  );
}
