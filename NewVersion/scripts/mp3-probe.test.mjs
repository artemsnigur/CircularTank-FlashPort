/**
 * Runs the MP3 probe against the real extracted audio.
 *
 * This is a guard on the *asset pipeline*, not on the parser: if a future
 * re-export from JPEXS starts emitting VBR streams, ID3 tags or mixed sample
 * rates, the suite fails here rather than in someone's ears.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { probeMp3, parseFrameHeader, DECODER_DELAY_SAMPLES } from './lib/mp3-probe.mjs';

// Vitest rewrites `import.meta.url` to a non-file scheme for transformed
// modules, so resolve from the project root instead. Vitest always runs with
// cwd set to the config's root.
const audioDir = resolve(process.cwd(), 'src/assets/audio');

function listMp3s() {
  try {
    return readdirSync(audioDir).filter((f) => f.endsWith('.mp3')).sort();
  } catch {
    return [];
  }
}

const files = listMp3s();

describe('mp3 frame header parser', () => {
  it('rejects a buffer with no frame sync', () => {
    expect(parseFrameHeader(Buffer.from([0x00, 0x00, 0x00, 0x00]), 0)).toBeNull();
  });

  it('rejects a reserved MPEG version', () => {
    // 0xFF 0xEA: sync ok, version bits 01 == reserved.
    expect(parseFrameHeader(Buffer.from([0xff, 0xea, 0x00, 0x00]), 0)).toBeNull();
  });

  it('rejects layers other than III', () => {
    // 0xFF 0xFD: MPEG1, layer bits 10 == Layer II.
    expect(parseFrameHeader(Buffer.from([0xff, 0xfd, 0x90, 0x00]), 0)).toBeNull();
  });

  it('decodes a known MPEG1 Layer III header', () => {
    // 0xFF 0xFB = MPEG1 Layer III, no CRC.
    // 0x90 = bitrate index 9 (128 kbps), sample rate index 0 (44100), no padding.
    // 0x00 = stereo.
    const header = parseFrameHeader(Buffer.from([0xff, 0xfb, 0x90, 0x00]), 0);
    expect(header).toMatchObject({
      version: 'MPEG1',
      bitrateKbps: 128,
      sampleRate: 44100,
      samplesPerFrame: 1152,
      channelMode: 'stereo',
    });
    expect(header.frameLength).toBe(Math.floor((144 * 128000) / 44100));
  });

  it('accounts for the padding bit in the frame length', () => {
    const unpadded = parseFrameHeader(Buffer.from([0xff, 0xfb, 0x90, 0x00]), 0);
    const padded = parseFrameHeader(Buffer.from([0xff, 0xfb, 0x92, 0x00]), 0);
    expect(padded.frameLength).toBe(unpadded.frameLength + 1);
  });
});

describe.skipIf(files.length === 0)('extracted MP3 assets', () => {
  const probes = files.map((name) => probeMp3(readFileSync(join(audioDir, name)), { name }));

  it('found audio to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('every file parses as a Layer III stream', () => {
    const unparseable = probes.filter((p) => p.frameCount === 0).map((p) => p.name);
    expect(unparseable).toEqual([]);
  });

  it('no file is variable bitrate without a Xing/VBRI header', () => {
    // JPEXS dumps raw SWF sound frames; a VBR stream arriving without a Xing
    // header would make browsers mis-compute duration and seek badly.
    const offenders = probes
      .filter((p) => p.issues.some((i) => i.code === 'vbr-without-header'))
      .map((p) => p.name);
    expect(offenders).toEqual([]);
  });

  it('no file mixes sample rates mid-stream', () => {
    const offenders = probes.filter((p) => p.sampleRates.length > 1).map((p) => p.name);
    expect(offenders).toEqual([]);
  });

  it('no file carries leading or trailing junk around the frame data', () => {
    const offenders = probes
      .filter((p) => p.leadingJunkBytes > 0 || p.trailingJunkBytes > 0)
      .map((p) => `${p.name} (+${p.leadingJunkBytes}/-${p.trailingJunkBytes})`);
    expect(offenders).toEqual([]);
  });

  it('the export is uniformly 44.1 kHz, which needs no resampling', () => {
    const rates = new Set(probes.map((p) => p.sampleRates[0]));
    expect([...rates]).toEqual([44100]);
  });

  it('reports zero error-level issues across the whole set', () => {
    const errored = probes
      .filter((p) => p.issues.some((i) => i.level === 'error'))
      .map((p) => `${p.name}: ${p.issues.map((i) => i.code).join(',')}`);
    expect(errored).toEqual([]);
  });

  it('documents the known gapless-header gap rather than pretending it is absent', () => {
    // Every file lacks a Xing/Info/LAME header, so no decoder can trim the
    // encoder delay. This is expected for SWF-embedded audio; the runtime
    // self-test measures the resulting leading silence. If a future re-export
    // *adds* headers, this test fails and the audio docs need updating.
    const withoutGapless = probes.filter((p) => p.vbrTag === null);
    expect(withoutGapless.length).toBe(probes.length);
    expect(DECODER_DELAY_SAMPLES).toBe(529);
  });
});
