// Streaming version of findOnsets: feed audio chunks, get back one segment per hit
// once enough ring-down has been captured to analyse it.

export interface HitSegment {
  samples: Float32Array;
  /** Sample index of the onset in the overall stream. */
  onsetAt: number;
}

export interface HitDetectorOptions {
  sampleRate: number;
  /** Seconds kept before the onset (default 0.02). */
  preRoll?: number;
  /** Seconds captured after the onset before emitting (default 0.03 + 16384 / sr + 0.05). */
  postRoll?: number;
  /** Absolute RMS floor for an onset (default 0.003, about -50 dBFS). */
  minRms?: number;
  /** Minimum seconds between hits (default 0.25). */
  minGap?: number;
}

export class HitDetector {
  readonly sampleRate: number;
  private readonly win: number;
  private readonly pre: number;
  private readonly post: number;
  private readonly minRms: number;
  private readonly gapWindows: number;
  private readonly buf: Float32Array;
  private written = 0; // total samples ever written
  private acc = 0; // sum of squares in the current 10 ms window
  private accN = 0;
  private windowIndex = 0;
  private bg = 0;
  private armed = true;
  private peak = 0;
  private lastOnsetWindow = -Infinity;
  private pending: number | null = null; // onset sample index awaiting post-roll
  /** RMS of the most recent 10 ms window, for a level meter. */
  level = 0;
  /** Peak absolute sample since the last read of `takePeak()`. */
  private peakAbs = 0;

  constructor(opts: HitDetectorOptions) {
    const sr = opts.sampleRate;
    this.sampleRate = sr;
    this.win = Math.max(1, Math.round(sr * 0.01));
    this.pre = Math.round((opts.preRoll ?? 0.02) * sr);
    this.post = Math.round((opts.postRoll ?? 0.03 + 16384 / sr + 0.05) * sr);
    this.minRms = opts.minRms ?? 0.003;
    this.gapWindows = Math.max(1, Math.round((opts.minGap ?? 0.25) / 0.01));
    this.buf = new Float32Array(Math.ceil((this.pre + this.post) * 1.5) + this.win * 4);
  }

  takePeak(): number {
    const p = this.peakAbs;
    this.peakAbs = 0;
    return p;
  }

  /** True while a hit is being recorded. */
  get busy(): boolean { return this.pending !== null; }

  push(chunk: Float32Array): HitSegment[] {
    const out: HitSegment[] = [];
    const n = this.buf.length;
    for (let i = 0; i < chunk.length; i++) {
      const v = chunk[i]!;
      this.buf[this.written % n] = v;
      this.written++;
      const a = Math.abs(v);
      if (a > this.peakAbs) this.peakAbs = a;
      this.acc += v * v;
      if (++this.accN === this.win) {
        this.onWindow(Math.sqrt(this.acc / this.win));
        this.acc = 0;
        this.accN = 0;
      }
      if (this.pending !== null && this.written - this.pending >= this.post) {
        out.push({ samples: this.extract(this.pending - this.pre, this.written), onsetAt: this.pending });
        this.pending = null;
      }
    }
    return out;
  }

  reset(): void {
    this.written = 0; this.acc = 0; this.accN = 0; this.windowIndex = 0; this.bg = 0;
    this.armed = true; this.peak = 0; this.lastOnsetWindow = -Infinity; this.pending = null; this.level = 0;
  }

  private onWindow(v: number): void {
    const w = this.windowIndex++;
    this.level = v;
    if (!this.armed) {
      this.peak = Math.max(this.peak, v);
      if (v < this.peak * 0.35 && w - this.lastOnsetWindow >= this.gapWindows) this.armed = true;
    }
    if (this.armed && this.pending === null && v > this.minRms && v > 4 * Math.max(this.bg, 1e-5)) {
      this.armed = false;
      this.peak = v;
      this.lastOnsetWindow = w;
      // Onset sample: start of the previous window, as in findOnsets.
      this.pending = Math.max(0, this.written - 2 * this.win);
    }
    this.bg = 0.9 * this.bg + 0.1 * v;
  }

  private extract(from: number, to: number): Float32Array {
    const n = this.buf.length;
    const start = Math.max(from, this.written - n, 0);
    const out = new Float32Array(to - start);
    for (let i = start; i < to; i++) out[i - start] = this.buf[i % n]!;
    return out;
  }
}
