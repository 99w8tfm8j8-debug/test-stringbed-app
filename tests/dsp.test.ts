import { describe, expect, it } from 'vitest';
import { analyse, analyseHits, fft, findOnsets, noteName, quality, refineAt, summarizeHits, DEFAULT_MAINS_RANGE, DEFAULT_CROSSES_RANGE } from '../src/lib/dsp';
import { concat, gaussian, pluck, rng } from './synth';

const MAINS = { ...DEFAULT_MAINS_RANGE };

describe('fft', () => {
  it('puts a pure tone in the right bin', () => {
    const n = 1024, re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * 37 * i) / n);
    fft(re, im);
    const mags = Array.from(re, (r, i) => Math.hypot(r, im[i]!));
    expect(mags.indexOf(Math.max(...mags.slice(0, n / 2)))).toBe(37);
    expect(mags[37]).toBeCloseTo(n / 2, 6);
  });
  it('rejects non power of two lengths', () => {
    expect(() => fft(new Float64Array(100), new Float64Array(100))).toThrow();
  });
});

describe('analyse: synthetic plucked strings', () => {
  const cases: Array<{ name: string; sr: number; f0: number; partials: number[]; noise: number; B?: number; range?: { fmin: number; fmax: number } }> = [
    { name: '44.1 kHz, 559.6 Hz, normal harmonics', sr: 44100, f0: 559.6, partials: [1, 0.5, 0.3, 0.15], noise: 0.002 },
    { name: '48 kHz, 559.6 Hz, normal harmonics', sr: 48000, f0: 559.6, partials: [1, 0.5, 0.3, 0.15], noise: 0.002 },
    { name: '44.1 kHz, 2nd harmonic louder than fundamental', sr: 44100, f0: 512.37, partials: [0.4, 1, 0.5, 0.2], noise: 0.002 },
    { name: '48 kHz, 2nd harmonic louder than fundamental', sr: 48000, f0: 487.91, partials: [0.35, 1, 0.45, 0.25], noise: 0.002 },
    { name: '48 kHz, 2f also inside the search band (tap)', sr: 48000, f0: 401.23, partials: [0.3, 1, 0.6, 0.3], noise: 0.002 },
    { name: '44.1 kHz, low tension 330 Hz', sr: 44100, f0: 330.42, partials: [1, 0.6, 0.4], noise: 0.003 },
    { name: '48 kHz, high tension 860 Hz', sr: 48000, f0: 861.07, partials: [1, 0.4, 0.2], noise: 0.003 },
    { name: '44.1 kHz, stiff string (inharmonic partials)', sr: 44100, f0: 603.3, partials: [0.6, 1, 0.5], noise: 0.002, B: 3e-4 },
    { name: '48 kHz, crosses range', sr: 48000, f0: 701.11, partials: [1, 0.7, 0.4], noise: 0.002, range: { ...DEFAULT_CROSSES_RANGE } },
    { name: '44.1 kHz, heavier noise', sr: 44100, f0: 559.6, partials: [1, 0.5, 0.3], noise: 0.01 },
  ];
  for (const c of cases) {
    it(`${c.name} within 0.05 Hz`, () => {
      const x = pluck({ sampleRate: c.sr, f0: c.f0, partials: c.partials, noise: c.noise, inharmonicity: c.B, seed: 7 });
      const r = analyse(x, c.sr, c.range ?? MAINS);
      expect(r).not.toBeNull();
      // A stiff string's fundamental itself sits at f0 * sqrt(1 + B).
      const truth = c.f0 * Math.sqrt(1 + (c.B ?? 0));
      expect(Math.abs(r!.hz - truth)).toBeLessThan(0.05);
    });
  }

  it('returns a spectrum and quality data', () => {
    const x = pluck({ sampleRate: 44100, f0: 559.6, partials: [1, 0.5, 0.3], noise: 0.001 });
    const r = analyse(x, 44100, MAINS)!;
    expect(r.spectrum.length).toBeGreaterThan(100);
    expect(r.peakRatio).toBeGreaterThan(25);
    expect(quality(r.peakRatio)).toBe('clear');
    expect(r.harmonics.h2).toBeGreaterThan(0.2);
  });

  it('refineAt snaps to the peak the user taps', () => {
    const x = pluck({ sampleRate: 48000, f0: 450.5, partials: [1, 0.8, 0.5], noise: 0.001 });
    const r = analyse(x, 48000, { fmin: 300, fmax: 1000 })!;
    const second = refineAt(r, 905)!;
    expect(Math.abs(second - 901)).toBeLessThan(0.5);
    expect(Math.abs(refineAt(r, 452)! - 450.5)).toBeLessThan(0.05);
  });
});

describe('analyse: returns no result instead of a wrong one', () => {
  it('digital silence', () => {
    expect(analyse(new Float32Array(48000), 48000, MAINS)).toBeNull();
  });
  it('near silence (very low noise)', () => {
    const g = gaussian(rng(3));
    const x = Float32Array.from({ length: 48000 }, () => 1e-5 * g());
    expect(analyse(x, 48000, MAINS)).toBeNull();
  });
  it('white noise without a tone', () => {
    const g = gaussian(rng(5));
    const x = Float32Array.from({ length: 48000 }, () => 0.05 * g());
    expect(analyse(x, 48000, MAINS)).toBeNull();
  });
  for (const sr of [44100, 48000]) {
    it(`clips shorter than 0.1 s at ${sr} Hz`, () => {
      for (const sec of [0.02, 0.05, 0.099]) {
        const x = pluck({ sampleRate: sr, f0: 559.6, partials: [1, 0.5], seconds: sec, pre: 0 });
        expect(analyse(x, sr, MAINS)).toBeNull();
      }
    });
    it(`a 0.1 s clip whose ring after the transient is too short at ${sr} Hz`, () => {
      const x = pluck({ sampleRate: sr, f0: 559.6, partials: [1, 0.5], seconds: 0.1, pre: 0 });
      expect(analyse(x, sr, MAINS)).toBeNull();
    });
  }
  it('empty input and bad sample rate', () => {
    expect(analyse(new Float32Array(0), 48000, MAINS)).toBeNull();
    expect(analyse(new Float32Array(48000), 0, MAINS)).toBeNull();
  });
});

describe('multi-hit capture', () => {
  it('finds three hits a second apart and locks', () => {
    const sr = 48000;
    const hits = [559.4, 559.7, 559.9].map((f0, i) => pluck({ sampleRate: sr, f0, partials: [1, 0.5, 0.3], seconds: 1, pre: 0.2, noise: 0.001, seed: i + 1 }));
    const x = concat(...hits);
    expect(findOnsets(x, sr)).toHaveLength(3);
    const res = analyseHits(x, sr, MAINS);
    expect(res).toHaveLength(3);
    const s = summarizeHits(res.map((r) => r.hz))!;
    expect(s.locked).toBe(true);
    expect(Math.abs(s.hz - 559.7)).toBeLessThan(0.05);
  });

  it('rejects an outlier hit and reports spread', () => {
    const s = summarizeHits([560.1, 560.4, 612.0, 559.9])!;
    expect(s.rejected).toEqual([612.0]);
    expect(s.kept).toHaveLength(3);
    expect(s.spreadHz).toBeCloseTo(0.5, 6);
    expect(s.locked).toBe(true);
  });

  it('does not lock with a wide spread or too few hits', () => {
    expect(summarizeHits([560, 561.4, 560.6])!.locked).toBe(false);
    expect(summarizeHits([560, 560.2])!.locked).toBe(false);
    expect(summarizeHits([])).toBeNull();
  });
});

describe('noteName', () => {
  it('names A4 and nearby notes', () => {
    expect(noteName(440)).toBe('A4');
    expect(noteName(261.63)).toBe('C4');
    expect(noteName(559.6)).toBe('C#5');
  });
});
