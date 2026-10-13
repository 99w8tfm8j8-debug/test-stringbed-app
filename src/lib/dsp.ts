// Pitch detection for a plucked or tapped tennis string.
// Ported from the prototype's dsp.js and extended: harmonic-aware scoring with an
// octave-down check, explicit rejection of silence / noise / short clips, multi-hit
// segmentation and a re-refine hook for picking a different peak on the spectrum.

export interface AnalyseOptions {
  /** Lowest candidate fundamental in Hz. */
  fmin: number;
  /** Highest candidate fundamental in Hz. */
  fmax: number;
  /** Samples analysed after the transient (default 16384). */
  frameSize?: number;
  /** FFT size after zero padding (default 65536). */
  fftSize?: number;
  /** Seconds skipped after the loudest 10 ms window (default 0.03). */
  skipSeconds?: number;
  /** Results with a peak-to-median ratio below this are rejected (default 5). */
  minPeakRatio?: number;
}

export interface SpectrumPoint {
  hz: number;
  mag: number;
}

export interface PitchResult {
  /** Detected fundamental in Hz. */
  hz: number;
  /** Peak-to-median ratio of the chosen peak against the search band. */
  peakRatio: number;
  /** Down-sampled, normalised spectrum for drawing (fmin*0.7 .. ~fmax*3.2). */
  spectrum: SpectrumPoint[];
  /** Normalised magnitude per FFT bin (0 .. fftSize/2), for re-refining a picked peak. */
  mag: Float32Array;
  /** Hz per FFT bin. */
  binHz: number;
  /** Duration of the input in seconds. */
  seconds: number;
  /** Number of samples actually analysed. */
  analysedSamples: number;
  /** RMS of the loudest 10 ms window (0..1 full scale). */
  peakRms: number;
  /** Absolute peak sample, to warn about clipping. */
  peakAbs: number;
  /** Partials found at about 2f and 3f, relative to the fundamental's magnitude. */
  harmonics: { h2: number; h3: number };
}

export const DEFAULT_MAINS_RANGE = { fmin: 300, fmax: 900 } as const;
export const DEFAULT_CROSSES_RANGE = { fmin: 250, fmax: 1100 } as const;

/** Minimum clip length. Anything shorter returns null rather than a guess. */
export const MIN_CLIP_SECONDS = 0.1;
/** Minimum samples analysed after the transient. */
const MIN_FRAME = 4096;
const SILENCE_RMS = 1e-4;

/** In-place iterative radix-2 FFT. Length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n !== im.length || (n & (n - 1)) !== 0) throw new Error('fft: length must be a matching power of two');
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]!; re[i] = re[j]!; re[j] = t;
      t = im[i]!; im[i] = im[j]!; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const vr = re[b]! * cr - im[b]! * ci, vi = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - vr; im[b] = im[a]! - vi;
        re[a] = re[a]! + vr; im[a] = im[a]! + vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

function maxNear(mag: Float32Array, k: number, r: number): number {
  let m = 0;
  const lo = Math.max(0, k - r), hi = Math.min(mag.length - 1, k + r);
  for (let j = lo; j <= hi; j++) if (mag[j]! > m) m = mag[j]!;
  return m;
}

function argMaxNear(mag: Float32Array, k: number, r: number, lo: number, hi: number): number {
  let kp = Math.min(hi, Math.max(lo, k));
  for (let i = Math.max(lo, k - r); i <= Math.min(hi, k + r); i++) if (mag[i]! > mag[kp]!) kp = i;
  return kp;
}

/** Parabolic interpolation on log magnitude around bin kp; returns fractional bin. */
function interpolate(mag: Float32Array, kp: number): number {
  if (kp <= 0 || kp >= mag.length - 1) return kp;
  const a = Math.log(mag[kp - 1]! + 1e-12), b = Math.log(mag[kp]! + 1e-12), c = Math.log(mag[kp + 1]! + 1e-12);
  const denom = a - 2 * b + c;
  let delta = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
  if (!(Math.abs(delta) <= 1)) delta = 0;
  return kp + delta;
}

function rmsWindows(x: ArrayLike<number>, win: number): Float64Array {
  const nW = Math.floor(x.length / win);
  const out = new Float64Array(nW);
  for (let w = 0; w < nW; w++) {
    let s = 0;
    for (let i = w * win; i < (w + 1) * win; i++) { const v = x[i]!; s += v * v; }
    out[w] = Math.sqrt(s / win);
  }
  return out;
}

/**
 * Find the string's fundamental in a mono recording of one hit.
 * Returns null for silence, noise, clips shorter than 0.1 s, or no clear peak.
 */
export function analyse(x: ArrayLike<number>, sampleRate: number, opts: AnalyseOptions): PitchResult | null {
  const sr = sampleRate;
  if (!(sr > 0) || x.length < MIN_CLIP_SECONDS * sr) return null;
  const frameSize = opts.frameSize ?? 16384;
  const size = opts.fftSize ?? 65536;
  const skip = Math.round((opts.skipSeconds ?? 0.03) * sr);
  const minRatio = opts.minPeakRatio ?? 5;

  const win = Math.max(1, Math.round(sr * 0.01));
  const rms = rmsWindows(x, win);
  if (rms.length < 8) return null;
  let emax = 0, imax = 0;
  for (let w = 0; w < rms.length; w++) if (rms[w]! > emax) { emax = rms[w]!; imax = w; }
  if (emax < SILENCE_RMS) return null;

  let peakAbs = 0;
  for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]!); if (v > peakAbs) peakAbs = v; }

  const start = imax * win + skip;
  const avail = x.length - start;
  if (avail < MIN_FRAME) return null;
  const N = Math.min(frameSize, avail, size);

  const re = new Float64Array(size), im = new Float64Array(size);
  for (let i = 0; i < N; i++) re[i] = x[start + i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  fft(re, im);
  const half = size / 2;
  const mag = new Float32Array(half);
  for (let i = 0; i < half; i++) mag[i] = Math.sqrt(re[i]! * re[i]! + im[i]! * im[i]!);

  const df = sr / size;
  const kmin = Math.max(2, Math.floor(opts.fmin / df));
  const kmax = Math.min(Math.floor(opts.fmax / df), Math.floor(half / 3) - 8);
  if (kmax <= kmin) return null;

  let top = 0;
  for (let i = kmin; i < Math.min(half, kmax * 3 + 8); i++) if (mag[i]! > top) top = mag[i]!;
  if (!(top > 0)) return null;
  for (let i = 0; i < half; i++) mag[i] = mag[i]! / top;

  // Noise floor: median of the search band.
  const floorSamples: number[] = [];
  for (let i = kmin; i <= kmax; i += 4) floorSamples.push(mag[i]!);
  floorSamples.sort((p, q) => p - q);
  const median = Math.max(floorSamples[Math.floor(floorSamples.length / 2)] ?? 1e-9, 1e-9);

  // Harmonic score: f + 0.7 * near(2f) + 0.5 * near(3f). The windows widen with k
  // because string stiffness pushes higher partials slightly sharp.
  const r2 = (k: number) => Math.max(3, Math.round(k * 0.008));
  const r3 = (k: number) => Math.max(4, Math.round(k * 0.012));
  const score = (k: number) => mag[k]! + 0.7 * maxNear(mag, 2 * k, r2(k)) + 0.5 * maxNear(mag, 3 * k, r3(k));
  let best = kmin, bestScore = -1;
  for (let k = kmin; k <= kmax; k++) {
    const sc = score(k);
    if (sc > bestScore) { bestScore = sc; best = k; }
  }
  const snap = Math.max(3, Math.round(3 / df));
  let kp = argMaxNear(mag, best, snap, kmin, kmax);

  // Octave-down check: a tap can make 2f the strongest partial. If there is a real
  // peak near half the chosen frequency, well above the noise floor, prefer it.
  const kh = Math.round(kp / 2);
  if (kh >= kmin) {
    const kc = argMaxNear(mag, kh, Math.max(3, Math.round(kh * 0.008)), kmin, kmax);
    const isLocalPeak = mag[kc]! >= mag[kc - 1]! && mag[kc]! >= mag[kc + 1]!;
    if (isLocalPeak && mag[kc]! > 0.08 && mag[kc]! > 8 * median) kp = kc;
  }

  const hz = interpolate(mag, kp) * df;
  const peakRatio = mag[kp]! / median;
  if (peakRatio < minRatio) return null;

  const h2 = maxNear(mag, 2 * kp, r2(kp)) / Math.max(mag[kp]!, 1e-12);
  const h3 = maxNear(mag, 3 * kp, r3(kp)) / Math.max(mag[kp]!, 1e-12);

  return {
    hz,
    peakRatio,
    spectrum: downsampleSpectrum(mag, df, opts.fmin * 0.7, Math.min(opts.fmax * 3.2, sr / 2.2)),
    mag,
    binHz: df,
    seconds: x.length / sr,
    analysedSamples: N,
    peakRms: emax,
    peakAbs,
    harmonics: { h2, h3 },
  };
}

export function downsampleSpectrum(mag: Float32Array, df: number, fromHz: number, toHz: number, points = 360): SpectrumPoint[] {
  const lo = Math.max(1, Math.floor(fromHz / df));
  const hi = Math.min(mag.length - 1, Math.floor(toHz / df));
  const step = Math.max(1, Math.floor((hi - lo) / points));
  const out: SpectrumPoint[] = [];
  for (let i = lo; i <= hi; i += step) {
    let m = 0;
    for (let q = i; q < i + step && q <= hi; q++) if (mag[q]! > m) m = mag[q]!;
    out.push({ hz: (i + step / 2) * df, mag: m });
  }
  return out;
}

/**
 * Re-refine around a frequency the user tapped on the spectrum. Snaps to the
 * strongest bin within searchHz and interpolates. Returns null if nothing is there.
 */
export function refineAt(result: Pick<PitchResult, 'mag' | 'binHz'>, hzGuess: number, searchHz = 6): number | null {
  const { mag, binHz: df } = result;
  const k = Math.round(hzGuess / df);
  if (k < 2 || k >= mag.length - 2) return null;
  const kp = argMaxNear(mag, k, Math.max(2, Math.round(searchHz / df)), 1, mag.length - 2);
  if (!(mag[kp]! > 0)) return null;
  return interpolate(mag, kp) * df;
}

/**
 * Split a recording into hits. An onset is a 10 ms window whose RMS exceeds both an
 * absolute floor and 4x the recent background, at least `minGapSeconds` after the last.
 * Returns sample offsets where each hit segment starts.
 */
export function findOnsets(x: ArrayLike<number>, sampleRate: number, minGapSeconds = 0.25): number[] {
  const win = Math.max(1, Math.round(sampleRate * 0.01));
  const rms = rmsWindows(x, win);
  const gap = Math.max(1, Math.round(minGapSeconds / 0.01));
  const onsets: number[] = [];
  let bg = rms.length ? rms[0]! : 0;
  let last = -Infinity;
  let armed = true;
  let peak = 0;
  for (let w = 0; w < rms.length; w++) {
    const v = rms[w]!;
    if (!armed) {
      // Re-arm only once the previous hit has decayed well below its peak.
      peak = Math.max(peak, v);
      if (v < peak * 0.35 && w - last >= gap) armed = true;
    }
    if (armed && v > 0.003 && v > 4 * Math.max(bg, 1e-5)) {
      onsets.push(Math.max(0, (w - 1) * win));
      last = w;
      armed = false;
      peak = v;
    }
    bg = 0.9 * bg + 0.1 * v;
  }
  return onsets;
}

/** Analyse every hit in a recording. Hits that give no clear result are skipped. */
export function analyseHits(x: Float32Array, sampleRate: number, opts: AnalyseOptions): PitchResult[] {
  const onsets = findOnsets(x, sampleRate);
  if (onsets.length <= 1) {
    const r = analyse(x, sampleRate, opts);
    return r ? [r] : [];
  }
  const out: PitchResult[] = [];
  for (let i = 0; i < onsets.length; i++) {
    const seg = x.subarray(onsets[i]!, onsets[i + 1] ?? x.length);
    const r = analyse(seg, sampleRate, opts);
    if (r) out.push(r);
  }
  return out;
}

export interface HitSummary {
  /** Median of the kept hits, Hz. */
  hz: number;
  /** max - min of the kept hits, Hz. */
  spreadHz: number;
  /** Sample standard deviation of the kept hits, Hz (0 for one hit). */
  sdHz: number;
  kept: number[];
  rejected: number[];
  /** True when at least `minHits` agree within `lockHz`. */
  locked: boolean;
}

export function median(values: readonly number[]): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function stdev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1));
}

/**
 * Combine several hits: reject outliers by median absolute deviation, take the median.
 * A hit is an outlier when it sits more than max(3 * 1.4826 * MAD, 1.5 Hz) from the median.
 */
export function summarizeHits(hz: readonly number[], minHits = 3, lockHz = 1): HitSummary | null {
  const vals = hz.filter((v) => Number.isFinite(v) && v > 0);
  if (!vals.length) return null;
  const m = median(vals);
  const mad = median(vals.map((v) => Math.abs(v - m)));
  const limit = Math.max(3 * 1.4826 * mad, 1.5);
  const kept = vals.filter((v) => Math.abs(v - m) <= limit);
  const rejected = vals.filter((v) => Math.abs(v - m) > limit);
  const spreadHz = kept.length ? Math.max(...kept) - Math.min(...kept) : 0;
  return {
    hz: median(kept),
    spreadHz,
    sdHz: stdev(kept),
    kept,
    rejected,
    locked: kept.length >= minHits && spreadHz < lockHz,
  };
}

export type Quality = 'clear' | 'usable' | 'weak';

/** Quality badge from the peak-to-median ratio. */
export function quality(peakRatio: number): Quality {
  return peakRatio > 25 ? 'clear' : peakRatio > 10 ? 'usable' : 'weak';
}

export function noteName(hz: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const r = Math.round(69 + (12 * Math.log(hz / 440)) / Math.LN2);
  return names[((r % 12) + 12) % 12]! + (Math.floor(r / 12) - 1);
}
