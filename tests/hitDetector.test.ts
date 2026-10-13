import { describe, expect, it } from 'vitest';
import { HitDetector } from '../src/lib/hitDetector';
import { analyse, summarizeHits, DEFAULT_MAINS_RANGE } from '../src/lib/dsp';
import { concat, gaussian, pluck, rng } from './synth';

function feed(det: HitDetector, x: Float32Array, chunk = 128) {
  const segs = [];
  for (let i = 0; i < x.length; i += chunk) segs.push(...det.push(x.subarray(i, i + chunk)));
  return segs;
}

describe('HitDetector (streaming)', () => {
  for (const sr of [44100, 48000]) {
    it(`emits three analysable hits from a live-like stream at ${sr} Hz and locks`, () => {
      const g = gaussian(rng(9));
      const quiet = Float32Array.from({ length: Math.round(0.5 * sr) }, () => 0.0005 * g());
      const hits = [559.5, 559.8, 559.6].map((f0, i) => pluck({ sampleRate: sr, f0, partials: [1, 0.5, 0.3], seconds: 1.1, pre: 0.15, noise: 0.0005, seed: 20 + i }));
      const x = concat(quiet, ...hits, quiet);
      const det = new HitDetector({ sampleRate: sr });
      const segs = feed(det, x);
      expect(segs).toHaveLength(3);
      const hz = segs.map((s) => analyse(s.samples, sr, DEFAULT_MAINS_RANGE)!.hz);
      const sum = summarizeHits(hz)!;
      expect(sum.locked).toBe(true);
      expect(Math.abs(sum.hz - 559.6)).toBeLessThan(0.05);
    });
  }

  it('ignores steady background noise', () => {
    const sr = 48000, g = gaussian(rng(4));
    const x = Float32Array.from({ length: 3 * sr }, () => 0.002 * g());
    expect(feed(new HitDetector({ sampleRate: sr }), x)).toHaveLength(0);
  });

  it('reports a level for the meter', () => {
    const det = new HitDetector({ sampleRate: 48000 });
    det.push(new Float32Array(4800).fill(0.1));
    expect(det.level).toBeCloseTo(0.1, 6);
    expect(det.takePeak()).toBeCloseTo(0.1, 6);
    expect(det.takePeak()).toBe(0);
  });
});
