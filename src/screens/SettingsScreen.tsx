// Units, theme, detection ranges, backup and links to the tools.
import { useState } from 'preact/hooks';
import { useApp } from '../app/state';
import { Seg } from '../components/common';
import { download, ImportError, parseBackup, readingsCsv } from '../lib/backup';
import type { Settings } from '../lib/types';
import { num } from '../app/format';
import { todayIso } from '../lib/status';
import { DROPPED_STRINGS } from '../data/strings';
import { DROPPED_RACQUETS } from '../data/racquets';

export function SettingsScreen() {
  const { state, actions } = useApp();
  const st = state.settings;
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  const setRange = (key: 'mainsRange' | 'crossesRange', which: 'fmin' | 'fmax', v: string) => {
    const n = num(v);
    if (n == null || n < 50 || n > 3000) return;
    void actions.setSettings({ [key]: { ...st[key], [which]: n } } as Partial<Settings>);
  };

  const exportJson = async () => {
    const b = await actions.exportAll();
    download(`stringbed-${todayIso()}.json`, JSON.stringify(b, null, 2), 'application/json');
  };
  const exportCsv = () => download(`stringbed-readings-${todayIso()}.csv`, readingsCsv(state.setups, state.readings), 'text/csv');
  const importJson = async (f: File) => {
    try {
      const b = parseBackup(await f.text());
      await actions.importAll(b, mode);
      setMsg({ kind: 'ok', text: `Imported ${b.setups.length} setups and ${b.readings.length} readings (${mode}).` });
    } catch (e) {
      setMsg({ kind: 'bad', text: e instanceof ImportError ? e.message : 'Import failed.' });
    }
  };

  return (
    <>
      <section class="panel">
        <h2>Settings</h2>
        <div class="row center spread"><span>Units</span><Seg label="Units" value={st.unit} onChange={(u) => void actions.setSettings({ unit: u })} options={[['lb', 'lb'], ['kg', 'kg']]} /></div>
        <div class="row center spread"><span>Theme</span><Seg label="Theme" value={st.theme} onChange={(t) => void actions.setSettings({ theme: t })} options={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]} /></div>
      </section>

      <section class="panel">
        <h3>Tools</h3>
        <div class="row">
          <a class="btn" href="#/calibrate">Calibrate</a>
          <a class="btn" href="#/validate">Validate repeatability</a>
          <a class="btn" href="#/about">Accuracy and error sources</a>
        </div>
      </section>

      <section class="panel">
        <h3>Detection range (Hz)</h3>
        <p class="hint">Candidate fundamentals are searched only inside these bands. Widen them for unusually low or high tensions or short crosses.</p>
        <div class="grid2">
          <div class="field"><label for="mlo">Mains from</label><input id="mlo" type="number" class="mono" defaultValue={String(st.mainsRange.fmin)} onChange={(e) => setRange('mainsRange', 'fmin', e.currentTarget.value)} /></div>
          <div class="field"><label for="mhi">Mains to</label><input id="mhi" type="number" class="mono" defaultValue={String(st.mainsRange.fmax)} onChange={(e) => setRange('mainsRange', 'fmax', e.currentTarget.value)} /></div>
          <div class="field"><label for="clo">Crosses from</label><input id="clo" type="number" class="mono" defaultValue={String(st.crossesRange.fmin)} onChange={(e) => setRange('crossesRange', 'fmin', e.currentTarget.value)} /></div>
          <div class="field"><label for="chi">Crosses to</label><input id="chi" type="number" class="mono" defaultValue={String(st.crossesRange.fmax)} onChange={(e) => setRange('crossesRange', 'fmax', e.currentTarget.value)} /></div>
        </div>
      </section>

      <section class="panel">
        <h3>Backup</h3>
        <p class="hint">Everything lives on this device only (IndexedDB). Export regularly; clearing site data or uninstalling deletes it.</p>
        <div class="row">
          <button onClick={() => void exportJson()}>Export JSON (full backup)</button>
          <button onClick={exportCsv}>Export readings CSV</button>
        </div>
        <div class="row center">
          <Seg label="Import mode" value={mode} onChange={setMode} options={[['merge', 'Merge'], ['replace', 'Replace all']]} />
          <span class="filebtn"><span class="btn">Import JSON</span><input type="file" accept="application/json,.json" aria-label="Choose a Stringbed backup file" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) void importJson(f); e.currentTarget.value = ''; }} /></span>
        </div>
        {msg && <p class={'note ' + msg.kind} role="status">{msg.text}</p>}
      </section>

      <section class="panel">
        <details>
          <summary>Library records left out</summary>
          <p class="hint">These could not be confirmed on a manufacturer page, so they are not seeded. Add them yourself in the Library.</p>
          <ul class="plain">{[...DROPPED_STRINGS, ...DROPPED_RACQUETS].map((d) => <li key={d.name}><strong>{d.name}</strong>: {d.reason}</li>)}</ul>
        </details>
      </section>
      <p class="hint" style={{ textAlign: 'center' }}>Stringbed {__APP_VERSION__}. Independent app; not affiliated with any string, racquet or app maker.</p>
    </>
  );
}
