// Create or edit a setup: racquet, string(s), gauge, tension, date, restring triggers.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { defaultSetup, useApp } from '../app/state';
import { CAP_WEEKS, type HitterStyle, type Setup, type StringChoice, type StringModel } from '../lib/types';
import { MATERIAL_CLASSES, MATERIAL_DENSITY, fromLb, toLb, type MaterialClass } from '../lib/physics';
import { lengthFor } from '../app/convert';
import { Seg } from '../components/common';
import { num, shortDate, tu } from '../app/format';
import { todayIso } from '../lib/status';
import { navigate } from '../app/router';

function groupByBrand<T extends { brand: string }>(items: T[]): Array<[string, T[]]> {
  const m = new Map<string, T[]>();
  for (const i of items) m.set(i.brand, [...(m.get(i.brand) ?? []), i]);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function StringEditor({ id, value, onChange, strings }: { id: string; value: StringChoice; onChange: (v: StringChoice) => void; strings: StringModel[] }) {
  const model = value.stringId ? strings.find((s) => s.id === value.stringId) : undefined;
  const grouped = useMemo(() => groupByBrand(strings), [strings]);
  const pick = (sid: string) => {
    if (!sid) { onChange({ material: value.material, gaugeMm: value.gaugeMm }); return; }
    const sm = strings.find((s) => s.id === sid)!;
    const g = sm.gauges.find((x) => Math.abs(x.mm - value.gaugeMm) < 0.001) ?? sm.gauges.find((x) => Math.abs(x.mm - 1.25) < 0.001) ?? sm.gauges[0]!;
    onChange({ stringId: sid, name: `${sm.brand} ${sm.model}`, material: sm.material, gaugeLabel: g.label, gaugeMm: g.mm, ...(value.densityOverride ? { densityOverride: value.densityOverride } : {}) });
  };
  return (
    <div class="grid2">
      <div class="field" style={{ gridColumn: '1 / -1' }}>
        <label for={id + '-s'}>String</label>
        <select id={id + '-s'} value={value.stringId ?? ''} onChange={(e) => pick(e.currentTarget.value)}>
          <option value="">Not in the library (enter details)</option>
          {grouped.map(([brand, list]) => (
            <optgroup key={brand} label={brand}>
              {list.map((s) => <option key={s.id} value={s.id}>{s.model}{s.custom ? ' (yours)' : s.verified ? '' : ' (unverified)'}</option>)}
            </optgroup>
          ))}
        </select>
        {model && <span class="hint">{model.construction}{model.feel ? `, ${model.feel}` : ''}. <a href={model.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>{model.verified ? '' : ' (unverified)'}</span>}
      </div>
      {!model && (
        <div class="field">
          <label for={id + '-n'}>Name</label>
          <input id={id + '-n'} value={value.name ?? ''} onInput={(e) => onChange({ ...value, name: e.currentTarget.value })} />
        </div>
      )}
      <div class="field">
        <label for={id + '-g'}>Gauge</label>
        {model ? (
          <select id={id + '-g'} value={String(value.gaugeMm)} onChange={(e) => { const g = model.gauges.find((x) => String(x.mm) === e.currentTarget.value)!; onChange({ ...value, gaugeLabel: g.label, gaugeMm: g.mm }); }}>
            {model.gauges.map((g) => <option key={g.label + g.mm} value={String(g.mm)}>{g.label === g.mm.toFixed(2) ? `${g.mm.toFixed(2)} mm` : `${g.label} (${g.mm.toFixed(2)} mm)`}</option>)}
          </select>
        ) : (
          <input id={id + '-g'} type="number" step="0.01" inputMode="decimal" class="mono" value={value.gaugeMm} onInput={(e) => { const v = num(e.currentTarget.value); if (v) onChange({ ...value, gaugeMm: v }); }} />
        )}
      </div>
      <div class="field">
        <label for={id + '-m'}>Material</label>
        <select id={id + '-m'} value={value.material} disabled={!!model} onChange={(e) => onChange({ ...value, material: e.currentTarget.value as MaterialClass })}>
          {MATERIAL_CLASSES.map((m) => <option key={m} value={m}>{MATERIAL_DENSITY[m].label}</option>)}
        </select>
      </div>
      <div class="field">
        <label for={id + '-d'}>Density override (g/cm³)</label>
        <input id={id + '-d'} type="number" step="0.01" inputMode="decimal" class="mono" placeholder={`default ${MATERIAL_DENSITY[value.material].gPerCm3.toFixed(2)} (estimate)`} value={value.densityOverride ?? ''}
          onInput={(e) => { const v = num(e.currentTarget.value); const n = { ...value }; if (v) n.densityOverride = v; else delete n.densityOverride; onChange(n); }} />
      </div>
    </div>
  );
}

export function SetupScreen({ isNew }: { isNew: boolean }) {
  const { state, actions } = useApp();
  const unit = state.settings.unit;
  const source = isNew ? null : state.active;
  const [d, setD] = useState<Setup>(() => source ?? defaultSetup(''));
  const [confirmDel, setConfirmDel] = useState(false);
  const [restringLb, setRestringLb] = useState('');
  const [restringOn, setRestringOn] = useState(todayIso());
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => { if (!isNew && state.active) setD(state.active); }, [isNew, state.active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state.loaded) return <p class="empty">Loading…</p>;
  if (!isNew && !source) { navigate('/setup/new'); return null; }

  const racquet = d.racquetId ? state.lib.racquets.get(d.racquetId) : undefined;
  const set = (patch: Partial<Setup>) => setD((x) => ({ ...x, ...patch }));
  const tensionField = (lb: number | undefined) => (lb != null ? String(Math.round(fromLb(lb, unit) * 10) / 10) : '');
  const estLen = lengthFor({ ...d, mainLengthMm: undefined }, 'mains', state.lib).mm;

  const save = async () => {
    const name = d.name.trim() || [racquet?.model, d.mains.name].filter(Boolean).join(' / ') || 'My racquet';
    const next = { ...d, name, racquetName: racquet ? `${racquet.brand} ${racquet.model}` : d.racquetName };
    if (isNew) {
      const created = await actions.newSetup(name);
      await actions.saveSetup({ ...next, id: created.id, createdAt: created.createdAt });
      navigate('/');
    } else {
      await actions.saveSetup(next);
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 1500);
    }
  };

  return (
    <>
      <section class="panel">
        <h2>{isNew ? 'New setup' : `Edit ${d.name}`}</h2>
        <div class="field"><label for="sName">Name</label><input id="sName" value={d.name} placeholder="e.g. Match frame" onInput={(e) => set({ name: e.currentTarget.value })} /></div>
      </section>

      <section class="panel">
        <h3>Racquet</h3>
        <div class="field">
          <label for="sRq">Model</label>
          <select id="sRq" value={d.racquetId ?? ''} onChange={(e) => set({ racquetId: e.currentTarget.value || undefined })}>
            <option value="">Not in the library</option>
            {groupByBrand(state.racquets).map(([brand, list]) => (
              <optgroup key={brand} label={brand}>{list.map((r) => <option key={r.id} value={r.id}>{r.model}{r.custom ? ' (yours)' : ''}</option>)}</optgroup>
            ))}
          </select>
          {racquet && <span class="hint">{racquet.headSizeSqIn} sq in, {racquet.pattern}, {racquet.lengthIn} in. <a href={racquet.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a></span>}
          {!racquet && <input aria-label="Racquet name" placeholder="Racquet name" value={d.racquetName ?? ''} onInput={(e) => set({ racquetName: e.currentTarget.value })} />}
        </div>
        <p class="note">Measure the centre main with a ruler, from where it leaves the frame on one side to the other (inside edge of the grommets). Head size only gives a rough estimate ({estLen} mm here), and in physics mode the length error counts twice.</p>
        <div class="grid2">
          <div class="field"><label for="sLen">Centre main, measured (mm)</label><input id="sLen" type="number" inputMode="decimal" step="1" class="mono" placeholder={`estimate ${estLen}`} value={d.mainLengthMm ?? ''} onInput={(e) => set({ mainLengthMm: num(e.currentTarget.value) ?? undefined })} /></div>
          <div class="field"><label for="sLenX">Centre cross, measured (mm)</label><input id="sLenX" type="number" inputMode="decimal" step="1" class="mono" placeholder={`estimate ${Math.round(estLen * 0.8)}`} value={d.crossLengthMm ?? ''} onInput={(e) => set({ crossLengthMm: num(e.currentTarget.value) ?? undefined })} /></div>
        </div>
      </section>

      <section class="panel">
        <h3>{d.crosses ? 'Mains string' : 'String'}</h3>
        <StringEditor id="mains" value={d.mains} onChange={(v) => set({ mains: v })} strings={state.strings} />
        <label class="check"><input type="checkbox" checked={!!d.crosses} onChange={(e) => set({ crosses: e.currentTarget.checked ? { ...d.mains } : undefined })} /> Hybrid (different crosses)</label>
        {d.crosses && (
          <>
            <h3>Crosses string</h3>
            <StringEditor id="crosses" value={d.crosses} onChange={(v) => set({ crosses: v })} strings={state.strings} />
          </>
        )}
      </section>

      <section class="panel">
        <h3>Stringing job</h3>
        <div class="grid2">
          <div class="field"><label for="sT">{d.crosses ? 'Mains tension' : 'Strung at'} ({unit})</label><input id="sT" type="number" step="0.5" inputMode="decimal" class="mono" value={tensionField(d.startLb)} onInput={(e) => { const v = num(e.currentTarget.value); set({ startLb: v != null ? toLb(v, unit) : undefined }); }} /></div>
          {d.crosses && <div class="field"><label for="sTX">Crosses tension ({unit})</label><input id="sTX" type="number" step="0.5" inputMode="decimal" class="mono" value={tensionField(d.crossStartLb)} onInput={(e) => { const v = num(e.currentTarget.value); set({ crossStartLb: v != null ? toLb(v, unit) : undefined }); }} /></div>}
          <div class="field"><label for="sOn">Strung on</label><input id="sOn" type="date" value={d.strungOn ?? ''} onInput={(e) => set({ strungOn: e.currentTarget.value || undefined })} /></div>
        </div>
      </section>

      <section class="panel">
        <h3>Restring triggers</h3>
        <div class="row center"><span class="lbl">Hitting style</span>
          <Seg<HitterStyle> label="Hitting style" value={d.hitter} onChange={(h) => set({ hitter: h, capWeeks: CAP_WEEKS[h] })} options={[['hard', 'Hard hitter'], ['light', 'Light hitter']]} />
        </div>
        <div class="grid2">
          <div class="field"><label for="sCap">Weeks cap</label><input id="sCap" type="number" step="1" class="mono" value={d.capWeeks} onInput={(e) => set({ capWeeks: num(e.currentTarget.value) ?? CAP_WEEKS[d.hitter] })} /></div>
          <div class="field"><label for="sChk">Check line (% loss)</label><input id="sChk" type="number" step="1" class="mono" value={d.checkPct} onInput={(e) => set({ checkPct: num(e.currentTarget.value) ?? 20 })} /></div>
          <div class="field"><label for="sRes">Restring line (% loss)</label><input id="sRes" type="number" step="1" class="mono" value={d.restringPct} onInput={(e) => set({ restringPct: num(e.currentTarget.value) ?? 25 })} /></div>
          <div class="field"><label for="sHrs">Hours cap (optional)</label><input id="sHrs" type="number" step="1" class="mono" value={d.capHours ?? ''} onInput={(e) => set({ capHours: num(e.currentTarget.value) ?? undefined })} /></div>
        </div>
        <p class="hint">Loss is measured against the strung-at tension. Status is Check it at the check line or the weeks cap, and Restring now at the restring line or 1.5 times the cap. Defaults: 20%, 25%, 6 weeks for hard hitters and 12 for light hitters.</p>
        <div class="field"><label for="sNotes">Notes</label><textarea id="sNotes" value={d.notes ?? ''} onInput={(e) => set({ notes: e.currentTarget.value })} /></div>
      </section>

      <div class="row">
        <button class="primary big" onClick={() => void save()}>{isNew ? 'Create setup' : savedMsg || 'Save setup'}</button>
      </div>

      {!isNew && source && (
        <>
          <section class="panel">
            <h3>Calibration</h3>
            {(['mains', 'crosses'] as const).filter((side) => side === 'mains' || d.crosses).map((side) => {
              const c = source.calib[side];
              return (
                <div class="row spread center" key={side}>
                  <span>{side}: {c ? `${tu(c.refLb, unit)} at ${c.refHz.toFixed(1)} Hz, ${shortDate(c.on)}` : 'not calibrated'}{source.carriedFactor?.[side] && !c ? ` (carried factor ${source.carriedFactor[side]!.toFixed(3)})` : ''}</span>
                  {c ? <button class="quiet" onClick={() => { const cal = { ...source.calib }; delete cal[side]; void actions.saveSetup({ ...source, calib: cal }); }}>Clear</button> : <a class="btn" href="#/calibrate">Calibrate</a>}
                </div>
              );
            })}
          </section>
          <section class="panel">
            <h3>Restrung?</h3>
            <p class="hint">Starts a new setup with the same racquet and string, a fresh log and caps. The old setup keeps its history, and its calibration factor carries over to sharpen physics mode until you calibrate again.</p>
            <div class="row">
              <div class="field"><label for="rsT">New tension ({unit})</label><input id="rsT" type="number" step="0.5" inputMode="decimal" class="mono" value={restringLb} placeholder={tensionField(source.startLb)} onInput={(e) => setRestringLb(e.currentTarget.value)} /></div>
              <div class="field"><label for="rsOn">Strung on</label><input id="rsOn" type="date" value={restringOn} onInput={(e) => setRestringOn(e.currentTarget.value)} /></div>
              <button onClick={() => { const v = num(restringLb); void actions.restring(source, v != null ? toLb(v, unit) : source.startLb, restringOn || todayIso()).then(() => navigate('/')); }}>Start new job</button>
            </div>
          </section>
          <section class="panel">
            <button class="danger" onClick={() => { if (confirmDel) { void actions.deleteSetup(source.id); navigate('/'); } else { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 4000); } }}>
              {confirmDel ? 'Tap again to delete this setup and its readings' : 'Delete setup'}
            </button>
          </section>
        </>
      )}
    </>
  );
}
