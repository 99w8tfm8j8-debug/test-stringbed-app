// Microphone capture: raw Float32 samples via AudioWorklet, with a
// ScriptProcessorNode fallback for browsers without AudioWorklet.
// Must be started from a user gesture (iOS Safari requirement).
import workletUrl from './recorder.worklet.js?url';

export type CaptureError = 'unsupported' | 'denied' | 'no-device' | 'insecure' | 'failed';

export class CaptureFailure extends Error {
  constructor(readonly kind: CaptureError, message: string) { super(message); }
}

type AC = typeof AudioContext;

export interface Capture {
  sampleRate: number;
  /** "worklet" or "script-processor". */
  path: 'worklet' | 'script-processor';
  analyser: AnalyserNode;
  stop(): Promise<void>;
}

/** Microphone constraints: every processing stage that would distort a pluck is off. */
export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
};

export async function startCapture(onSamples: (chunk: Float32Array) => void): Promise<Capture> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new CaptureFailure('insecure', 'The microphone needs HTTPS (or localhost).');
  }
  const Ctor: AC | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
  if (!navigator.mediaDevices?.getUserMedia || !Ctor) {
    throw new CaptureFailure('unsupported', 'This browser cannot record audio. Use the file upload instead.');
  }
  // Create and resume the context inside the user gesture, before awaiting anything else.
  const ctx = new Ctor({ latencyHint: 'interactive' });
  const resumed = ctx.resume();

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS, video: false });
  } catch (e) {
    void ctx.close();
    const name = (e as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new CaptureFailure('denied', 'Microphone permission was refused. Allow it in the browser settings and try again.');
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new CaptureFailure('no-device', 'No microphone was found.');
    throw new CaptureFailure('failed', 'Could not open the microphone.');
  }
  await resumed.catch(() => undefined);
  if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 8192;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);
  // A silent sink keeps the graph pulled on every browser without playing the mic back.
  const sink = ctx.createGain();
  sink.gain.value = 0;
  sink.connect(ctx.destination);

  let node: AudioNode;
  let path: Capture['path'];
  if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
    try {
      await ctx.audioWorklet.addModule(workletUrl);
      const w = new AudioWorkletNode(ctx, 'stringbed-recorder', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit' });
      w.port.onmessage = (ev: MessageEvent<Float32Array>) => onSamples(ev.data);
      node = w;
      path = 'worklet';
    } catch {
      ({ node, path } = scriptProcessor(ctx, onSamples));
    }
  } else {
    ({ node, path } = scriptProcessor(ctx, onSamples));
  }
  source.connect(node);
  node.connect(sink);

  return {
    sampleRate: ctx.sampleRate,
    path,
    analyser,
    async stop() {
      try { source.disconnect(); node.disconnect(); } catch { /* already gone */ }
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close().catch(() => undefined);
    },
  };
}

function scriptProcessor(ctx: AudioContext, onSamples: (c: Float32Array) => void): { node: AudioNode; path: 'script-processor' } {
  const sp = ctx.createScriptProcessor(2048, 1, 1);
  sp.onaudioprocess = (ev) => onSamples(new Float32Array(ev.inputBuffer.getChannelData(0)));
  return { node: sp, path: 'script-processor' };
}

/** Decode an uploaded recording to mono Float32 at its native rate. */
export async function decodeFile(file: Blob): Promise<{ samples: Float32Array; sampleRate: number }> {
  const Ctor: AC | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
  if (!Ctor) throw new Error('This browser cannot decode audio.');
  const buf = await file.arrayBuffer();
  const ctx = new Ctor();
  try {
    const audio = await new Promise<AudioBuffer>((res, rej) => {
      const p = ctx.decodeAudioData(buf, res, rej);
      if (p && typeof p.then === 'function') p.then(res, rej);
    });
    // Mix to mono.
    const n = audio.length, out = new Float32Array(n);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const ch = audio.getChannelData(c);
      for (let i = 0; i < n; i++) out[i] = out[i]! + ch[i]! / audio.numberOfChannels;
    }
    return { samples: out, sampleRate: audio.sampleRate };
  } finally {
    void ctx.close().catch(() => undefined);
  }
}
