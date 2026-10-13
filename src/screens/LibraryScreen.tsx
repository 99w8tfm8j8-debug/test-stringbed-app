// Browse and extend the string and racquet libraries.
import { useState } from 'preact/hooks';
import { newId, useApp } from '../app/state';
import { Seg } from '../components/common';
import { SEED_STRINGS } from '../data/strings';
import { SEED_RACQUETS, estimateMainLengthMm } from '../data/racquets';
import { MATERIAL_CLASSES, MATERIAL_DENSITY, type MaterialClass } from '../lib/physics';
import type { Feel, Racquet, StringModel } from '../lib/types';
import { num } from '../app/format';

const seedStringIds = new Set(SEED_STRINGS.map((s) => s.id));
const seedRacquetIds = new Set(SEED_RACQUETS.map((r) => r.id));

/** Parse "16L=1.25, 17=1.20" or "1.25, 1.30". */
export function parseGauges(text: string): StringModel['gauges'] {
  return text.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean).flatMap((p) => {
    const m = p.match(/^(.+?)\s*[=:]\s*([\d.,]+)$/);
    const label = m ? m[1]!.trim() : p;
    const mm = num(m ? m[2]! : p);
    return mm && mm > 0.8 && mm < 2 ? [{ label: m ? label : mm.toFixed(2), mm }] : [];
  });
}

function StringForm({ initial, onSave, onCancel }: { initial?: StringModel; onSave: (s: StringModel) => void; onCancel: () => void }) {
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [material, setMaterial] = useState<MaterialClass>(initial?.material ?? 'polyester');
  const [construction, setConstruction] = useState(initial?.construction ?? '');
  const [gauges, setGauges] = useState(initial?.gauges.map((g) => (g.label === g.mm.toFixed(2) ? g.label : `${g.label}=${g.mm.toFixed(2)}`)).join(', ') ?? '');
  const [feel, setFeel] = useState<Feel | ''>(initial?.feel ?? '');
  const [density, setDensity] = useState(initial?.densityOverride ? String(initial.densityOverride) : '');
  const [url, setUrl] = useState(initial?.sourceUrl ?? '');
  const parsed = parseGauges(gauges);
  const ok = brand.trim() && model.trim() && parsed.length;
  return (
    <div class="panel">
      <h3>{initial ? `Edit ${initial.brand} ${initial.model}` : 'Add a string'}</h3>
      <div class="grid2">
        <div class="field"><label for="lsB">Brand</label><input id="lsB" value={brand} onInput={(e) => setBrand(e.currentTarget.value)} /></div>
        <div class="field"><label for="lsM">Model</label><input id="lsM" value={model} onInput={(e) => setModel(e.currentTarget.value)} /></div>
        <div class="field"><label for="lsMat">Material</label><select id="lsMat" value={material} onChange={(e) => setMaterial(e.currentTarget.value as MaterialClass)}>{MATERIAL_CLASSES.map((m) => <option key={m} value={m}>{MATERIAL_DENSITY[m].label}</option>)}</select></div>
        <div class="field"><label for="lsC">Construction</label><input id="lsC" value={construction} onInput={(e) => setConstruction(e.currentTarget.value)} placeholder="e.g. Co-polyester monofilament" /></div>
        <div class="field" style={{ gridColumn: '1 / -1' }}><label for="lsG">Gauges (label=mm, comma separated)</label><input id="lsG" class="mono" value={gauges} onInput={(e) => setGauges(e.currentTarget.value)} placeholder="16L=1.25, 17=1.20" /><span class="hint">{parsed.length ? parsed.map((g) => `${g.label}: ${g.mm.toFixed(2)} mm`).join(' · ') : 'Enter at least one gauge in mm.'}</span></div>
        <div class="field"><label for="lsF">Feel (only if the maker states it)</label><select id="lsF" value={feel} onChange={(e) => setFeel(e.currentTarget.value as Feel | '')}><option value="">Not stated</option><option value="soft">Soft</option><option value="medium">Medium</option><option value="stiff">Stiff</option></select></div>
        <div class="field"><label for="lsD">Density override (g/cm³)</label><input id="lsD" type="number" step="0.01" class="mono" value={density} placeholder={`default ${MATERIAL_DENSITY[material].gPerCm3}`} onInput={(e) => setDensity(e.currentTarget.value)} /></div>
        <div class="field" style={{ gridColumn: '1 / -1' }}><label for="lsU">Source URL</label><input id="lsU" type="url" value={url} onInput={(e) => setUrl(e.currentTarget.value)} placeholder="https://" /></div>
      </div>
      <div class="row">
        <button class="primary" disabled={!ok} onClick={() => {
          const d = num(density);
          onSave({
            id: initial?.id ?? newId('str-user'), brand: brand.trim(), model: model.trim(), material, construction: construction.trim(), gauges: parsed,
            sourceUrl: url.trim(), verified: false, verification: initial && seedStringIds.has(initial.id) ? 'Edited by you; the seed record was verified.' : 'Added by you.', custom: true,
            ...(feel ? { feel } : {}), ...(d ? { densityOverride: d } : {}),
          });
        }}>Save</button>
        <button class="quiet" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function RacquetForm({ initial, onSave, onCancel }: { initial?: Racquet; onSave: (r: Racquet) => void; onCancel: () => void }) {
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [head, setHead] = useState(String(initial?.headSizeSqIn ?? 100));
  const [pattern, setPattern] = useState(initial?.pattern ?? '16x19');
  const [len, setLen] = useState(String(initial?.lengthIn ?? 27));
  const [main, setMain] = useState(initial ? String(initial.mainLengthMm) : '');
  const [url, setUrl] = useState(initial?.sourceUrl ?? '');
  const h = num(head);
  const ok = brand.trim() && model.trim() && h && /^\d{1,2}\s*x\s*\d{1,2}$/i.test(pattern.trim());
  return (
    <div class="panel">
      <h3>{initial ? `Edit ${initial.brand} ${initial.model}` : 'Add a racquet'}</h3>
      <div class="grid2">
        <div class="field"><label for="lrB">Brand</label><input id="lrB" value={brand} onInput={(e) => setBrand(e.currentTarget.value)} /></div>
        <div class="field"><label for="lrM">Model</label><input id="lrM" value={model} onInput={(e) => setModel(e.currentTarget.value)} /></div>
        <div class="field"><label for="lrH">Head size (sq in)</label><input id="lrH" type="number" class="mono" value={head} onInput={(e) => setHead(e.currentTarget.value)} /></div>
        <div class="field"><label for="lrP">Pattern</label><input id="lrP" class="mono" value={pattern} onInput={(e) => setPattern(e.currentTarget.value)} /></div>
        <div class="field"><label for="lrL">Length (in)</label><input id="lrL" type="number" step="0.1" class="mono" value={len} onInput={(e) => setLen(e.currentTarget.value)} /></div>
        <div class="field"><label for="lrC">Centre main (mm)</label><input id="lrC" type="number" class="mono" value={main} placeholder={h ? `estimate ${estimateMainLengthMm(h)}` : ''} onInput={(e) => setMain(e.currentTarget.value)} /></div>
        <div class="field" style={{ gridColumn: '1 / -1' }}><label for="lrU">Source URL</label><input id="lrU" type="url" value={url} onInput={(e) => setUrl(e.currentTarget.value)} placeholder="https://" /></div>
      </div>
      <div class="row">
        <button class="primary" disabled={!ok} onClick={() => onSave({
          id: initial?.id ?? newId('rq-user'), brand: brand.trim(), model: model.trim(), headSizeSqIn: h!, pattern: pattern.replace(/\s/g, '').toLowerCase(),
          lengthIn: num(len) ?? 27, mainLengthMm: num(main) ?? estimateMainLengthMm(h!), sourceUrl: url.trim(), verified: false,
          verification: initial && seedRacquetIds.has(initial.id) ? 'Edited by you; the seed record was verified.' : 'Added by you.', custom: true,
        })}>Save</button>
        <button class="quiet" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export function LibraryScreen() {
  const { state, actions } = useApp();
  const [tab, setTab] = useState<'strings' | 'racquets'>('strings');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const needle = q.trim().toLowerCase();
  const strings = state.strings.filter((s) => !needle || `${s.brand} ${s.model} ${s.material}`.toLowerCase().includes(needle));
  const racquets = state.racquets.filter((r) => !needle || `${r.brand} ${r.model} ${r.pattern}`.toLowerCase().includes(needle));

  return (
    <>
      <section class="panel">
        <div class="row spread center">
          <h2>Library</h2>
          <Seg label="Library section" value={tab} onChange={(v) => { setTab(v); setEditing(null); }} options={[['strings', `Strings (${state.strings.length})`], ['racquets', `Racquets (${state.racquets.length})`]]} />
        </div>
        <p class="hint">Seed records were checked against the manufacturer's page (linked). String density is rarely published, so it comes from material-class estimates; calibration learns a correction. Edits and additions are stored on this device and marked as yours.</p>
        <div class="row">
          <div class="field"><label for="libq">Search</label><input id="libq" type="search" value={q} onInput={(e) => setQ(e.currentTarget.value)} /></div>
          <button onClick={() => setEditing('new')}>Add {tab === 'strings' ? 'string' : 'racquet'}</button>
        </div>
      </section>

      {editing === 'new' && tab === 'strings' && <StringForm onCancel={() => setEditing(null)} onSave={(s) => { void actions.saveString(s); setEditing(null); }} />}
      {editing === 'new' && tab === 'racquets' && <RacquetForm onCancel={() => setEditing(null)} onSave={(r) => { void actions.saveRacquet(r); setEditing(null); }} />}

      <section class="panel">
        <div class="list">
          {tab === 'strings' ? strings.map((s) => editing === s.id ? (
            <StringForm key={s.id} initial={s} onCancel={() => setEditing(null)} onSave={(n) => { void actions.saveString(n); setEditing(null); }} />
          ) : (
            <div class="item" key={s.id}>
              <div>
                <div><strong>{s.brand} {s.model}</strong> {s.custom ? <span class="badge">yours</span> : s.verified ? <span class="badge good">verified</span> : <span class="badge weak">unverified</span>}</div>
                <div class="meta">{MATERIAL_DENSITY[s.material].label}{s.construction ? ` · ${s.construction}` : ''}{s.feel ? ` · ${s.feel}` : ''}</div>
                <div class="meta mono">{s.gauges.map((g) => (g.label === g.mm.toFixed(2) ? `${g.mm.toFixed(2)}` : `${g.label} ${g.mm.toFixed(2)}`)).join(' · ')} mm</div>
                <div class="meta">Density {(s.densityOverride ?? MATERIAL_DENSITY[s.material].gPerCm3).toFixed(2)} g/cm³ {s.densityOverride ? '(override)' : '(estimate)'}{s.sourceUrl && <> · <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">source</a></>}</div>
              </div>
              <div class="row" style={{ flexWrap: 'nowrap' }}>
                <button class="quiet" onClick={() => setEditing(s.id)} aria-label={`Edit ${s.brand} ${s.model}`}>Edit</button>
                {s.custom && <button class="quiet danger" onClick={() => void actions.deleteString(s.id)} aria-label={`${seedStringIds.has(s.id) ? 'Reset' : 'Delete'} ${s.brand} ${s.model}`}>{seedStringIds.has(s.id) ? 'Reset' : 'Delete'}</button>}
              </div>
            </div>
          )) : racquets.map((r) => editing === r.id ? (
            <RacquetForm key={r.id} initial={r} onCancel={() => setEditing(null)} onSave={(n) => { void actions.saveRacquet(n); setEditing(null); }} />
          ) : (
            <div class="item" key={r.id}>
              <div>
                <div><strong>{r.brand} {r.model}</strong> {r.custom ? <span class="badge">yours</span> : r.verified ? <span class="badge good">verified</span> : <span class="badge weak">unverified</span>}</div>
                <div class="meta mono">{r.headSizeSqIn} sq in · {r.pattern} · {r.lengthIn} in · main ≈ {r.mainLengthMm} mm</div>
                {r.verification && !r.custom && <div class="meta">{r.verification}</div>}
                {r.sourceUrl && <div class="meta"><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">source</a></div>}
              </div>
              <div class="row" style={{ flexWrap: 'nowrap' }}>
                <button class="quiet" onClick={() => setEditing(r.id)} aria-label={`Edit ${r.brand} ${r.model}`}>Edit</button>
                {r.custom && <button class="quiet danger" onClick={() => void actions.deleteRacquet(r.id)} aria-label={`${seedRacquetIds.has(r.id) ? 'Reset' : 'Delete'} ${r.brand} ${r.model}`}>{seedRacquetIds.has(r.id) ? 'Reset' : 'Delete'}</button>}
              </div>
            </div>
          ))}
          {(tab === 'strings' ? strings : racquets).length === 0 && <p class="empty">Nothing matches.</p>}
        </div>
      </section>
    </>
  );
}
