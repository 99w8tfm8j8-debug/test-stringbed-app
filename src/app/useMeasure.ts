// Shared measurement engine for the Measure, Calibrate and Validate screens.
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { analyse, analyseHits, quality, refineAt, summarizeHits, type HitSummary, type PitchResult, type Quality } from '../lib/dsp';
import { HitDetector } from '../lib/hitDetector';
import { CaptureFailure, decodeFile, startCapture, type Capture } from '../audio/capture';

export interface Hit {
  id: number;
  /** Frequency in use (auto or picked by the user). */
  hz: number;
  autoHz: number;
  picked: boolean;
  quality: Quality;
  result: PitchResult;
  clipped: boolean;
}

export type MeasureStatus = 'idle' | 'starting' | 'listening' | 'error';

export interface LiveView {
  level: number;
  clipping: boolean;
  /** dB values from the analyser over the display band, or null. */
  live: Float32Array | null;
  liveBinHz: number;
}

export interface Range { fmin: number; fmax: number }

let nextHitId = 1;

export function useMeasure(range: Range, maxHits = 8) {
  const [status, setStatus] = useState<MeasureStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const [live, setLive] = useState<LiveView>({ level: 0, clipping: false, live: null, liveBinHz: 0 });
  const [path, setPath] = useState<string>('');
  const [noResult, setNoResult] = useState(0);
  const capRef = useRef<Capture | null>(null);
  const detRef = useRef<HitDetector | null>(null);
  const rafRef = useRef<number>(0);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const addResults = useCallback((rs: PitchResult[]) => {
    if (!rs.length) return;
    setHits((h) => [
      ...h,
      ...rs.map((r) => ({ id: nextHitId++, hz: r.hz, autoHz: r.hz, picked: false, quality: quality(r.peakRatio), result: r, clipped: r.peakAbs > 0.98 })),
    ].slice(-maxHits));
  }, [maxHits]);

  const stop = useCallback(async () => {
    cancelAnimationFrame(rafRef.current);
    const c = capRef.current;
    capRef.current = null;
    detRef.current = null;
    setStatus('idle');
    setLive({ level: 0, clipping: false, live: null, liveBinHz: 0 });
    if (c) await c.stop();
  }, []);

  const start = useCallback(async () => {
    if (capRef.current) return;
    setError(null);
    setStatus('starting');
    try {
      let det: HitDetector | null = null;
      const cap = await startCapture((chunk) => {
        if (!det) return;
        for (const seg of det.push(chunk)) {
          const r = analyse(seg.samples, det.sampleRate, rangeRef.current);
          if (r) addResults([r]); else setNoResult((n) => n + 1);
        }
      });
      det = new HitDetector({ sampleRate: cap.sampleRate });
      detRef.current = det;
      capRef.current = cap;
      setPath(cap.path === 'worklet' ? 'AudioWorklet' : 'ScriptProcessor fallback');
      setStatus('listening');
      const fft = new Float32Array(cap.analyser.frequencyBinCount);
      let lastPeak = 0, lastClipAt = 0, frame = 0;
      const tick = (now: number) => {
        if (!capRef.current) return;
        frame++;
        if (frame % 3 === 0) {
          cap.analyser.getFloatFrequencyData(fft);
          const p = det!.takePeak();
          if (p > 0.98) lastClipAt = now;
          lastPeak = Math.max(p, lastPeak * 0.9);
          setLive({ level: det!.level, clipping: now - lastClipAt < 800, live: fft.slice(), liveBinHz: cap.sampleRate / cap.analyser.fftSize });
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setStatus('error');
      setError(e instanceof CaptureFailure ? e.message : 'Could not start the microphone.');
    }
  }, [addResults]);

  useEffect(() => () => { void stop(); }, [stop]);

  // Pause when the page is hidden (iOS suspends audio anyway).
  useEffect(() => {
    const onHide = () => { if (document.hidden) void stop(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [stop]);

  const analyseFile = useCallback(async (file: File): Promise<number> => {
    setError(null);
    try {
      const { samples, sampleRate } = await decodeFile(file);
      const rs = analyseHits(samples, sampleRate, rangeRef.current);
      addResults(rs);
      if (!rs.length) setError('No clear pluck found in that file. Record in a quiet room and pluck one centre main firmly.');
      return rs.length;
    } catch {
      setError('That file could not be decoded. Try .m4a, .mp3 or .wav.');
      return 0;
    }
  }, [addResults]);

  const pickPeak = useCallback((hitId: number, hz: number) => {
    setHits((hs) => hs.map((h) => {
      if (h.id !== hitId) return h;
      const refined = refineAt(h.result, hz);
      return refined ? { ...h, hz: refined, picked: Math.abs(refined - h.autoHz) > 0.05 } : h;
    }));
  }, []);

  const resetPeak = useCallback((hitId: number) => setHits((hs) => hs.map((h) => (h.id === hitId ? { ...h, hz: h.autoHz, picked: false } : h))), []);
  const removeHit = useCallback((hitId: number) => setHits((hs) => hs.filter((h) => h.id !== hitId)), []);
  const clear = useCallback(() => { setHits([]); setNoResult(0); }, []);

  const summary: HitSummary | null = summarizeHits(hits.map((h) => h.hz));
  return { status, error, hits, live, path, noResult, summary, start, stop, analyseFile, pickPeak, resetPeak, removeHit, clear };
}

export type Measure = ReturnType<typeof useMeasure>;
