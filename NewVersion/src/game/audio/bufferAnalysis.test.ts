import { describe, expect, it } from 'vitest';
import { analysePcm, gradeTrack, SILENCE_THRESHOLD } from './bufferAnalysis';

const SAMPLE_RATE = 44100;

/** A sine burst preceded by `leadingSilenceSamples` of digital silence. */
function makeClip({
  durationSeconds = 0.2,
  leadingSilenceSamples = 0,
  amplitude = 0.5,
  dc = 0,
  frequency = 440,
}: {
  durationSeconds?: number;
  leadingSilenceSamples?: number;
  amplitude?: number;
  dc?: number;
  frequency?: number;
} = {}): Float32Array {
  const length = Math.round(durationSeconds * SAMPLE_RATE);
  const out = new Float32Array(length);
  for (let i = leadingSilenceSamples; i < length; i += 1) {
    out[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE) + dc;
  }
  // The leading region still carries the DC offset if there is one.
  for (let i = 0; i < leadingSilenceSamples; i += 1) out[i] = dc;
  return out;
}

describe('analysePcm', () => {
  it('reports duration, peak and RMS for a clean tone', () => {
    const clip = makeClip({ durationSeconds: 0.5, amplitude: 0.8 });
    const a = analysePcm(clip, SAMPLE_RATE);

    expect(a.durationSeconds).toBeCloseTo(0.5, 4);
    expect(a.peak).toBeGreaterThan(0.79);
    expect(a.peak).toBeLessThanOrEqual(0.8);
    // RMS of a sine is amplitude / sqrt(2).
    expect(a.rms).toBeCloseTo(0.8 / Math.SQRT2, 2);
    expect(a.silent).toBe(false);
  });

  it('measures leading silence in milliseconds', () => {
    // 529 samples is exactly the Layer III decoder delay the audit warns about.
    const clip = makeClip({ leadingSilenceSamples: 529 });
    const a = analysePcm(clip, SAMPLE_RATE);
    expect(a.leadingSilenceMs).toBeCloseTo((529 / SAMPLE_RATE) * 1000, 3);
    expect(a.leadingSilenceMs).toBeCloseTo(12.0, 1);
  });

  it('measures trailing silence', () => {
    const clip = makeClip({ durationSeconds: 0.1 });
    clip.fill(0, clip.length - 441); // 10 ms of silence at the end
    const a = analysePcm(clip, SAMPLE_RATE);
    expect(a.trailingSilenceMs).toBeCloseTo(10, 0);
  });

  it('detects a DC offset', () => {
    const clip = makeClip({ dc: 0.05 });
    const a = analysePcm(clip, SAMPLE_RATE);
    expect(a.dcOffset).toBeCloseTo(0.05, 2);
  });

  it('measures the loop seam step', () => {
    const clip = new Float32Array([0.9, 0.1, 0.1, -0.9]);
    const a = analysePcm(clip, SAMPLE_RATE);
    expect(a.loopSeamDelta).toBeCloseTo(1.8, 5);
  });

  it('flags an all-silent buffer', () => {
    const a = analysePcm(new Float32Array(1000), SAMPLE_RATE);
    expect(a.silent).toBe(true);
    expect(a.peak).toBe(0);
  });

  it('treats samples exactly at the threshold as audible', () => {
    const clip = new Float32Array(100);
    clip[50] = SILENCE_THRESHOLD;
    expect(analysePcm(clip, SAMPLE_RATE).silent).toBe(false);
  });

  it('returns zeroes rather than NaN for an empty buffer', () => {
    const a = analysePcm(new Float32Array(0), SAMPLE_RATE);
    expect(a.durationSeconds).toBe(0);
    expect(Number.isNaN(a.dcOffset)).toBe(false);
    expect(Number.isNaN(a.rms)).toBe(false);
  });
});

describe('gradeTrack', () => {
  const clean = analysePcm(makeClip({ durationSeconds: 0.6269 }), SAMPLE_RATE);

  it('passes a clean, confirmed clip', () => {
    const g = gradeTrack({
      analysis: clean,
      expectedDuration: 0.6269,
      loops: false,
      playbackConfirmed: true,
    });
    expect(g.verdict).toBe('ok');
    expect(Math.abs(g.driftMs)).toBeLessThan(1);
  });

  it('fails when playback never started', () => {
    const g = gradeTrack({
      analysis: clean,
      expectedDuration: 0.6269,
      loops: false,
      playbackConfirmed: false,
    });
    expect(g.verdict).toBe('fail');
    expect(g.notes.join(' ')).toMatch(/Playback did not start/);
  });

  it('fails when the decoded duration disagrees with the frame headers', () => {
    const g = gradeTrack({
      analysis: clean,
      expectedDuration: 1.5, // headers say 1.5s, decoder produced 0.63s
      loops: false,
      playbackConfirmed: true,
    });
    expect(g.verdict).toBe('fail');
    expect(g.driftMs).toBeLessThan(0);
  });

  it('warns about leading silence, and says the loop case is worse', () => {
    const laggy = analysePcm(makeClip({ leadingSilenceSamples: 4410 }), SAMPLE_RATE); // 100 ms
    const oneShot = gradeTrack({
      analysis: laggy,
      expectedDuration: laggy.durationSeconds,
      loops: false,
      playbackConfirmed: true,
    });
    const looping = gradeTrack({
      analysis: laggy,
      expectedDuration: laggy.durationSeconds,
      loops: true,
      playbackConfirmed: true,
    });

    expect(oneShot.verdict).toBe('warn');
    expect(oneShot.notes.join(' ')).toMatch(/late relative to the impact frame/);
    expect(looping.notes.join(' ')).toMatch(/gap every repeat/);
  });

  it('warns about a DC offset', () => {
    const thumpy = analysePcm(makeClip({ dc: 0.05 }), SAMPLE_RATE);
    const g = gradeTrack({
      analysis: thumpy,
      expectedDuration: thumpy.durationSeconds,
      loops: false,
      playbackConfirmed: true,
    });
    expect(g.verdict).toBe('warn');
    expect(g.notes.join(' ')).toMatch(/DC offset/);
  });

  it('only checks the loop seam for looping clips', () => {
    const stepped = analysePcm(new Float32Array([0.9, 0.5, 0.5, -0.9]), SAMPLE_RATE);
    const asLoop = gradeTrack({
      analysis: stepped,
      expectedDuration: stepped.durationSeconds,
      loops: true,
      playbackConfirmed: true,
    });
    const asOneShot = gradeTrack({
      analysis: stepped,
      expectedDuration: stepped.durationSeconds,
      loops: false,
      playbackConfirmed: true,
    });

    expect(asLoop.notes.join(' ')).toMatch(/Loop seam/);
    expect(asOneShot.notes.join(' ')).not.toMatch(/Loop seam/);
  });
});
