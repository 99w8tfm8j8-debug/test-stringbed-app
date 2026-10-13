// Deterministic synthetic string signals for tests.

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(r: () => number): () => number {
  return () => {
    const u = Math.max(r(), 1e-12), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

export interface PluckSpec {
  sampleRate: number;
  f0: number;
  /** Amplitude of partial n (index 0 is the fundamental). */
  partials: number[];
  seconds?: number;
  /** Decay time constant in seconds. */
  tau?: number;
  /** Silence before the hit, seconds. */
  pre?: number;
  /** Noise standard deviation. */
  noise?: number;
  /** Stiffness coefficient B: f_n = n f0 sqrt(1 + B n^2). */
  inharmonicity?: number;
  seed?: number;
  amplitude?: number;
}

export function pluck(spec: PluckSpec): Float32Array {
  const sr = spec.sampleRate;
  const seconds = spec.seconds ?? 1.2;
  const pre = spec.pre ?? 0.1;
  const tau = spec.tau ?? 0.35;
  const B = spec.inharmonicity ?? 0;
  const amp = spec.amplitude ?? 0.3;
  const n = Math.round(seconds * sr);
  const out = new Float32Array(n);
  const g = gaussian(rng(spec.seed ?? 1));
  const phases = spec.partials.map((_, i) => (i * 1.7) % (2 * Math.PI));
  const p0 = Math.round(pre * sr);
  for (let i = 0; i < n; i++) {
    let v = 0;
    if (i >= p0) {
      const t = (i - p0) / sr;
      const env = Math.exp(-t / tau);
      for (let k = 0; k < spec.partials.length; k++) {
        const h = k + 1;
        const fk = h * spec.f0 * Math.sqrt(1 + B * h * h);
        // Higher partials decay a bit faster, as on a real string.
        v += spec.partials[k]! * Math.exp(-t * h * 0.4) * Math.sin(2 * Math.PI * fk * t + phases[k]!);
      }
      v *= env * amp;
    }
    out[i] = v + (spec.noise ?? 0) * g();
  }
  return out;
}

export function concat(...parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
