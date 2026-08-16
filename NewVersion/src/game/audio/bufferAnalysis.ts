/**
 * PCM analysis used to decide whether a decoded sound is actually clean.
 *
 * Pure functions over Float32Array so they can be tested without WebAudio.
 *
 * What we are looking for, and why (see docs/AUDIO_PIPELINE.md for the full
 * story): the JPEXS exports carry no Xing/Info/LAME header, so no decoder can
 * know the encoder delay to trim. That surfaces as leading silence, and — on
 * looping music — as a discontinuity at the loop seam that is heard as a click
 * on every repeat.
 */

/** -60 dBFS. Below this a sample is inaudible against any game mix. */
export const SILENCE_THRESHOLD = 0.001;

export interface BufferAnalysis {
  sampleRate: number;
  durationSeconds: number;
  /** Largest absolute sample. 1.0 means the clip is at or past full scale. */
  peak: number;
  /** Root-mean-square level over the whole clip. */
  rms: number;
  /** Mean sample value; a non-zero DC offset thumps on start and stop. */
  dcOffset: number;
  /** Milliseconds before the first audible sample. */
  leadingSilenceMs: number;
  /** Milliseconds after the last audible sample. */
  trailingSilenceMs: number;
  /**
   * |last sample - first sample|, i.e. the step a looping clip takes when it
   * wraps. Only meaningful for sounds that loop.
   */
  loopSeamDelta: number;
  /** True if every sample is below the silence threshold. */
  silent: boolean;
}

export function analysePcm(
  samples: Float32Array,
  sampleRate: number,
  threshold = SILENCE_THRESHOLD,
): BufferAnalysis {
  const length = samples.length;
  const msPerSample = 1000 / sampleRate;

  if (length === 0 || sampleRate <= 0) {
    return {
      sampleRate,
      durationSeconds: 0,
      peak: 0,
      rms: 0,
      dcOffset: 0,
      leadingSilenceMs: 0,
      trailingSilenceMs: 0,
      loopSeamDelta: 0,
      silent: true,
    };
  }

  let peak = 0;
  let sum = 0;
  let sumSquares = 0;
  let firstAudible = -1;
  let lastAudible = -1;

  for (let i = 0; i < length; i += 1) {
    const value = samples[i];
    const abs = Math.abs(value);
    if (abs > peak) peak = abs;
    sum += value;
    sumSquares += value * value;
    if (abs >= threshold) {
      if (firstAudible < 0) firstAudible = i;
      lastAudible = i;
    }
  }

  const silent = firstAudible < 0;

  return {
    sampleRate,
    durationSeconds: length / sampleRate,
    peak,
    rms: Math.sqrt(sumSquares / length),
    dcOffset: sum / length,
    leadingSilenceMs: silent ? (length * msPerSample) : firstAudible * msPerSample,
    trailingSilenceMs: silent ? 0 : (length - 1 - lastAudible) * msPerSample,
    loopSeamDelta: Math.abs(samples[length - 1] - samples[0]),
    silent,
  };
}

/**
 * Averages the channels of an AudioBuffer down to mono, then analyses it.
 * Kept separate from `analysePcm` so the maths stays testable in Node.
 */
export function analyseAudioBuffer(buffer: AudioBuffer, threshold = SILENCE_THRESHOLD): BufferAnalysis {
  const channels = buffer.numberOfChannels;
  if (channels === 1) {
    return analysePcm(buffer.getChannelData(0), buffer.sampleRate, threshold);
  }

  const length = buffer.length;
  const mixed = new Float32Array(length);
  for (let c = 0; c < channels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) {
      mixed[i] += data[i] / channels;
    }
  }
  return analysePcm(mixed, buffer.sampleRate, threshold);
}

export interface VerdictThresholds {
  /** Decoded vs. header-derived duration, in ms. */
  maxDriftMs: number;
  /** Leading silence above this is audible as latency on a one-shot SFX. */
  maxLeadingSilenceMs: number;
  /** DC offset above this thumps. */
  maxDcOffset: number;
  /** Loop seam step above this clicks. */
  maxLoopSeamDelta: number;
}

const DEFAULT_THRESHOLDS: VerdictThresholds = {
  // Two MP3 frames at 44.1 kHz is ~52 ms; anything beyond that is a real
  // decode discrepancy rather than encoder padding.
  maxDriftMs: 60,
  maxLeadingSilenceMs: 30,
  maxDcOffset: 0.01,
  maxLoopSeamDelta: 0.05,
};

export interface VerdictInput {
  analysis: BufferAnalysis;
  expectedDuration: number;
  loops: boolean;
  playbackConfirmed: boolean;
}

export interface Verdict {
  verdict: 'ok' | 'warn' | 'fail';
  driftMs: number;
  notes: string[];
}

/**
 * Turns measurements into a pass/warn/fail plus human-readable reasons. The
 * reasons are what actually get read, so they name the fix.
 */
export function gradeTrack(
  { analysis, expectedDuration, loops, playbackConfirmed }: VerdictInput,
  thresholds: VerdictThresholds = DEFAULT_THRESHOLDS,
): Verdict {
  const notes: string[] = [];
  const driftMs = (analysis.durationSeconds - expectedDuration) * 1000;
  let verdict: 'ok' | 'warn' | 'fail' = 'ok';

  const fail = (note: string): void => {
    notes.push(note);
    verdict = 'fail';
  };
  const warn = (note: string): void => {
    notes.push(note);
    if (verdict !== 'fail') verdict = 'warn';
  };

  if (!playbackConfirmed) fail('Playback did not start (the audio clock never advanced).');
  if (analysis.silent) fail('Decoded buffer is entirely silent.');

  if (Math.abs(driftMs) > thresholds.maxDriftMs) {
    fail(
      `Decoded duration is ${driftMs > 0 ? '' : '-'}${Math.abs(driftMs).toFixed(0)} ms ` +
        `${driftMs > 0 ? 'longer' : 'shorter'} than the MP3 frame headers imply. ` +
        'Re-encode this file rather than trusting seek offsets.',
    );
  }

  if (analysis.leadingSilenceMs > thresholds.maxLeadingSilenceMs) {
    warn(
      `${analysis.leadingSilenceMs.toFixed(1)} ms of leading silence. ` +
        (loops
          ? 'On a loop this becomes an audible gap every repeat — trim it or convert to OGG/M4A.'
          : 'Trim it, or the SFX will feel late relative to the impact frame.'),
    );
  }

  if (Math.abs(analysis.dcOffset) > thresholds.maxDcOffset) {
    warn(
      `DC offset of ${analysis.dcOffset.toFixed(4)} — expect a thump on start/stop. ` +
        'Apply a high-pass filter when re-encoding.',
    );
  }

  if (loops && analysis.loopSeamDelta > thresholds.maxLoopSeamDelta) {
    warn(
      `Loop seam steps by ${analysis.loopSeamDelta.toFixed(3)} between the last and first ` +
        'sample, which clicks on every repeat. Crossfade or trim to a zero crossing.',
    );
  }

  if (analysis.peak >= 0.999) {
    warn('Peak is at full scale; the clip may already be clipped in the source export.');
  }

  if (notes.length === 0) notes.push('Clean: duration, silence, DC offset and peak all in range.');

  return { verdict, driftMs, notes };
}
