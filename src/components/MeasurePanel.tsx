// Microphone controls, guidance, live spectrum, hit list and lock status.
// Shared by the Measure, Calibrate and Validate screens.
import { useState } from 'preact/hooks';
import type { Measure, Range } from '../app/useMeasure';
import { LevelMeter } from './LevelMeter';
import { Spectrum } from './Spectrum';
import { noteName } from '../lib/dsp';

export type Excitation = 'pluck' | 'tap';

const QUALITY_LABEL = { clear: ['good', 'Clear peak'], usable: ['', 'Usable peak'], weak: ['weak', 'Weak peak, check it'] } as const;

export function Guidance({ excitation }: { excitation: Excitation }) {
  return (
    <details>
      <summary>How to measure</summary>
      <ol class="steps">
        <li>Quiet room. Remove any vibration dampener.</li>
        <li>Rest the frame on your knee or a table; do not touch the strings near the centre.</li>
        <li>Hold the phone microphone 2 to 10 cm from the centre of the string bed (the mic is usually at the bottom edge of the phone).</li>
        {excitation === 'pluck'
          ? <li>Pluck one centre main with a fingertip, firmly, then let it ring. Repeat about a second apart.</li>
          : <li>Tap the centre of the bed lightly with a pen or another light, stiff object. Repeat about a second apart.</li>}
        <li>Take at least three hits. The result locks when they agree within about 1 Hz.</li>
      </ol>
      {excitation === 'tap' && <p class="hint">A tap rings more partials and the strongest peak can be a harmonic. The detector scores harmonics; if the marker sits on 2f, tap the spectrum on the lower peak.</p>}
    </details>
  );
}

export function MeasurePanel({ m, range, excitation, minHits = 3 }: { m: Measure; range: Range; excitation: Excitation; minHits?: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const hit = m.hits.find((h) => h.id === selected) ?? m.hits[m.hits.length - 1] ?? null;
  const listening = m.status === 'listening';
  const s = m.summary;
  const need = Math.max(0, minHits - (s?.kept.length ?? 0));

  return (
    <div class="panel">
      <Guidance excitation={excitation} />
      {listening ? (
        <button class="big" onClick={() => void m.stop()}>Stop listening</button>
      ) : (
        <button class="big primary" onClick={() => void m.start()} disabled={m.status === 'starting'}>
          {m.status === 'starting' ? 'Opening microphone…' : 'Start listening'}
        </button>
      )}
      {m.error && <p class="note bad" role="alert">{m.error}</p>}
      {listening && <LevelMeter level={m.live.level} clipping={m.live.clipping} />}
      {listening && <p class="hint" aria-live="polite">Listening via {m.path}. {excitation === 'pluck' ? 'Pluck' : 'Tap'} now.</p>}

      <Spectrum
        spectrum={hit?.result.spectrum ?? null}
        markerHz={hit?.hz ?? null}
        autoHz={hit?.autoHz ?? null}
        live={listening ? m.live.live : null}
        liveBinHz={m.live.liveBinHz}
        fromHz={range.fmin * 0.7}
        toHz={range.fmax * 3.2}
        onPick={hit ? (hz) => m.pickPeak(hit.id, hz) : undefined}
      />
      {hit && (
        <p class="hint">
          Hit {m.hits.indexOf(hit) + 1}: marker at {hit.hz.toFixed(1)} Hz ({noteName(hit.hz)}). {hit.picked ? 'You picked this peak. ' : ''}Tap the spectrum to choose a different peak.
          {hit.picked && <> <button class="quiet" onClick={() => m.resetPeak(hit.id)}>Use automatic peak</button></>}
        </p>
      )}

      <div class={'lock ' + (s?.locked ? 'on' : 'off')} role="status" aria-live="polite">
        {s?.locked ? (
          <span>Locked: {s.hz.toFixed(1)} Hz, spread {s.spreadHz.toFixed(2)} Hz over {s.kept.length} hits</span>
        ) : s ? (
          <span>
            Median {s.hz.toFixed(1)} Hz, spread {s.spreadHz.toFixed(2)} Hz. {need > 0 ? `${need} more hit${need === 1 ? '' : 's'} needed.` : 'Spread above 1 Hz: keep going, or remove a bad hit.'}
          </span>
        ) : (
          <span>No hits yet{m.noResult ? ` (${m.noResult} sound${m.noResult === 1 ? '' : 's'} without a clear pitch)` : ''}.</span>
        )}
      </div>

      {m.hits.length > 0 && (
        <div class="hits" role="list" aria-label="Hits">
          {m.hits.map((h, i) => {
            const q = QUALITY_LABEL[h.quality];
            const rejected = s?.rejected.includes(h.hz);
            return (
              <div class="hit" role="listitem" key={h.id} aria-current={h === hit}>
                <button class="quiet" onClick={() => setSelected(h.id)} aria-label={`Show spectrum of hit ${i + 1}`} style={{ padding: 0, minHeight: 32, color: 'var(--ink)' }}>
                  <span class="mono">{i + 1}. {h.hz.toFixed(2)} Hz</span>
                </button>
                <span class="chips">
                  <span class={'badge ' + q[0]}>{q[1]}</span>
                  {h.picked && <span class="badge">picked</span>}
                  {h.clipped && <span class="badge bad">clipped</span>}
                  {rejected && <span class="badge bad">outlier</span>}
                  <button class="quiet" onClick={() => m.removeHit(h.id)} aria-label={`Remove hit ${i + 1}`}>✕</button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div class="row spread center">
        <span class="filebtn">
          <span class="btn">Analyse a recording</span>
          <input type="file" accept="audio/*" aria-label="Choose a recording of string plucks to analyse"
            onChange={(ev) => { const f = (ev.currentTarget as HTMLInputElement).files?.[0]; if (f) void m.analyseFile(f); (ev.currentTarget as HTMLInputElement).value = ''; }} />
        </span>
        {m.hits.length > 0 && <button class="quiet" onClick={m.clear}>Clear hits</button>}
      </div>
    </div>
  );
}
