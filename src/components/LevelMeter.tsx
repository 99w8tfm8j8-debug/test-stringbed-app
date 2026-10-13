// Input level meter on a dB scale (-60..0 dBFS) with the onset threshold marked.
export function LevelMeter({ level, clipping }: { level: number; clipping: boolean }) {
  const db = level > 0 ? 20 * Math.log10(level) : -100;
  const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  const threshold = ((20 * Math.log10(0.003) + 60) / 60) * 100;
  return (
    <div>
      <div class={'meter' + (clipping ? ' hot' : '')} role="meter" aria-label="Microphone level" aria-valuemin={-60} aria-valuemax={0} aria-valuenow={Math.round(Math.max(-60, db))} aria-valuetext={`${Math.round(Math.max(-60, db))} dB${clipping ? ', clipping' : ''}`}>
        <span style={{ width: pct + '%' }} />
        <i class="mark" style={{ left: threshold + '%' }} aria-hidden="true" />
      </div>
      <div class="row spread hint" style={{ marginTop: 4 }}>
        <span>Level {db > -100 ? Math.round(db) + ' dB' : 'silent'}</span>
        <span>{clipping ? 'Too loud: move the phone back' : 'Line marks the hit threshold'}</span>
      </div>
    </div>
  );
}
