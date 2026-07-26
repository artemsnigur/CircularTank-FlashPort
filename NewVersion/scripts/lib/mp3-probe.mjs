/**
 * Minimal MPEG-1/2/2.5 Layer III bitstream probe.
 *
 * Why this exists: JPEXS exports SWF-embedded sounds by dumping the raw MP3
 * frames out of the SWF tag. Flash stored MP3 in a container that carried its
 * own "seek samples" offset, and the encoder delay/padding that a normal MP3
 * file advertises via a Xing/LAME header is frequently *absent* in these
 * exports. Browser decoders then either (a) insert the codec's own 529-sample
 * decoder delay as audible silence, or (b) decode the first (garbage) granule,
 * which is heard as a click. Short one-shot SFX are where this is most audible.
 *
 * This module parses frame headers only (no audio decode), so it is fast,
 * dependency-free, and usable from both the Node audit script and Vitest.
 *
 * Reference: ISO/IEC 11172-3, plus the informal Xing/Info/LAME tag layout.
 */

/** @typedef {'MPEG1'|'MPEG2'|'MPEG2.5'} MpegVersion */

const BITRATES_V1_L3 = [
  null, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, null,
];
const BITRATES_V2_L3 = [
  null, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, null,
];
const SAMPLE_RATES = {
  MPEG1: [44100, 48000, 32000],
  MPEG2: [22050, 24000, 16000],
  'MPEG2.5': [11025, 12000, 8000],
};
const CHANNEL_MODES = ['stereo', 'joint-stereo', 'dual-channel', 'mono'];

/**
 * The number of samples a Layer III decoder must discard at the start of a
 * stream before the output is valid. Fixed by the codec, independent of the
 * encoder's own delay.
 */
export const DECODER_DELAY_SAMPLES = 529;

/**
 * Reads the size of an ID3v2 tag at `offset`, or 0 if there is none.
 * @param {Buffer|Uint8Array} buf
 * @param {number} offset
 */
function id3v2Size(buf, offset) {
  if (buf.length < offset + 10) return 0;
  if (buf[offset] !== 0x49 || buf[offset + 1] !== 0x44 || buf[offset + 2] !== 0x33) {
    return 0; // not "ID3"
  }
  const flags = buf[offset + 5];
  // Syncsafe integer: 7 significant bits per byte.
  const size =
    (buf[offset + 6] << 21) |
    (buf[offset + 7] << 14) |
    (buf[offset + 8] << 7) |
    buf[offset + 9];
  const footer = (flags & 0x10) !== 0 ? 10 : 0;
  return 10 + size + footer;
}

/**
 * Parses a 4-byte frame header. Returns null if it is not a valid Layer III
 * frame header.
 * @param {Buffer|Uint8Array} buf
 * @param {number} offset
 */
export function parseFrameHeader(buf, offset) {
  if (offset + 4 > buf.length) return null;
  const b0 = buf[offset];
  const b1 = buf[offset + 1];
  const b2 = buf[offset + 2];
  const b3 = buf[offset + 3];

  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return null; // 11-bit frame sync

  /** @type {MpegVersion|null} */
  let version = null;
  switch ((b1 >> 3) & 0x03) {
    case 0: version = 'MPEG2.5'; break;
    case 2: version = 'MPEG2'; break;
    case 3: version = 'MPEG1'; break;
    default: return null; // reserved
  }

  const layer = (b1 >> 1) & 0x03;
  if (layer !== 1) return null; // 01 == Layer III; we only care about Layer III

  const crcProtected = (b1 & 0x01) === 0;
  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  if (sampleRateIndex === 3) return null; // reserved

  const padding = (b2 >> 1) & 0x01;
  const channelMode = CHANNEL_MODES[(b3 >> 6) & 0x03];

  const bitrateKbps =
    version === 'MPEG1' ? BITRATES_V1_L3[bitrateIndex] : BITRATES_V2_L3[bitrateIndex];
  if (bitrateKbps == null) return null; // free-format or invalid

  const sampleRate = SAMPLE_RATES[version][sampleRateIndex];
  const samplesPerFrame = version === 'MPEG1' ? 1152 : 576;
  const coefficient = version === 'MPEG1' ? 144 : 72;
  const frameLength = Math.floor((coefficient * bitrateKbps * 1000) / sampleRate) + padding;
  if (frameLength <= 4) return null;

  return {
    version,
    bitrateKbps,
    sampleRate,
    samplesPerFrame,
    channelMode,
    channels: channelMode === 'mono' ? 1 : 2,
    padding,
    crcProtected,
    frameLength,
  };
}

/**
 * Byte offset of the Xing/Info/VBRI tag inside a frame, which sits after the
 * Layer III side information block.
 * @param {ReturnType<typeof parseFrameHeader>} header
 */
function tagOffsetInFrame(header) {
  if (!header) return 4;
  const sideInfo =
    header.version === 'MPEG1'
      ? header.channels === 1 ? 17 : 32
      : header.channels === 1 ? 9 : 17;
  return 4 + (header.crcProtected ? 2 : 0) + sideInfo;
}

/**
 * @param {Buffer|Uint8Array} buf
 * @param {number} frameStart
 * @param {ReturnType<typeof parseFrameHeader>} header
 */
function readVbrTag(buf, frameStart, header) {
  const at = frameStart + tagOffsetInFrame(header);
  const tag = String.fromCharCode(buf[at], buf[at + 1], buf[at + 2], buf[at + 3]);

  if (tag !== 'Xing' && tag !== 'Info') {
    // VBRI is written by the Fraunhofer encoder at a fixed offset of 32 bytes.
    const vbriAt = frameStart + 36;
    const vbri = String.fromCharCode(
      buf[vbriAt], buf[vbriAt + 1], buf[vbriAt + 2], buf[vbriAt + 3],
    );
    return vbri === 'VBRI' ? { kind: 'VBRI', encoder: null, encoderDelay: null, encoderPadding: null } : null;
  }

  // Xing == VBR stream, Info == CBR stream written by a LAME-family encoder.
  let encoder = null;
  let encoderDelay = null;
  let encoderPadding = null;

  const lameAt = at + 120;
  if (lameAt + 24 <= buf.length) {
    const sig = Buffer.from(buf.subarray(lameAt, lameAt + 9)).toString('latin1');
    if (/^(LAME|Lavc|Lavf|GOGO)/.test(sig)) {
      encoder = sig.replace(/\0.*$/, '').trim();
      const d = lameAt + 21; // gapless-playback block
      encoderDelay = (buf[d] << 4) | (buf[d + 1] >> 4);
      encoderPadding = ((buf[d + 1] & 0x0f) << 8) | buf[d + 2];
    }
  }

  return { kind: tag, encoder, encoderDelay, encoderPadding };
}

/**
 * Walks every frame in an MP3 buffer and summarises the stream.
 *
 * @param {Buffer|Uint8Array} buf
 * @param {{ name?: string }} [meta]
 */
export function probeMp3(buf, meta = {}) {
  const issues = [];
  const byteLength = buf.length;

  const id3v2Bytes = id3v2Size(buf, 0);
  let offset = id3v2Bytes;

  // Some exporters leave junk before the first frame; scan forward for a sync
  // word rather than giving up.
  let firstFrameOffset = -1;
  let scan = offset;
  const scanLimit = Math.min(byteLength - 4, offset + 8192);
  while (scan <= scanLimit) {
    const candidate = parseFrameHeader(buf, scan);
    if (candidate) {
      // Guard against a false sync by requiring the *next* frame to line up too.
      const next = parseFrameHeader(buf, scan + candidate.frameLength);
      if (next || scan + candidate.frameLength >= byteLength - 4) {
        firstFrameOffset = scan;
        break;
      }
    }
    scan += 1;
  }

  if (firstFrameOffset < 0) {
    return {
      name: meta.name ?? null,
      byteLength,
      ok: false,
      issues: [{ level: 'error', code: 'no-frames', message: 'No MPEG Layer III frames found.' }],
      frameCount: 0,
      sampleRates: [],
      bitrates: [],
      vbr: null,
      durationSeconds: 0,
      id3v2Bytes,
      id3v1: false,
      leadingJunkBytes: 0,
      trailingJunkBytes: 0,
      vbrTag: null,
      encoderDelay: null,
      encoderPadding: null,
      firstFrameOffset: -1,
    };
  }

  const leadingJunkBytes = firstFrameOffset - id3v2Bytes;
  if (leadingJunkBytes > 0) {
    issues.push({
      level: 'warn',
      code: 'leading-junk',
      message: `${leadingJunkBytes} byte(s) of non-frame data before the first frame.`,
    });
  }

  const firstHeader = parseFrameHeader(buf, firstFrameOffset);
  const vbrTag = readVbrTag(buf, firstFrameOffset, firstHeader);

  // A Xing/Info frame is a header-only frame: it carries no audio.
  let cursor = firstFrameOffset;
  let frameCount = 0;
  let audioFrameCount = 0;
  let totalSamples = 0;
  const bitrates = new Set();
  const sampleRates = new Set();
  const channelModes = new Set();
  let brokenFrameAt = -1;

  while (cursor + 4 <= byteLength) {
    const header = parseFrameHeader(buf, cursor);
    if (!header) {
      // ID3v1 trailer or padding is expected; anything else is a real break.
      brokenFrameAt = cursor;
      break;
    }
    frameCount += 1;
    const isTagFrame = frameCount === 1 && vbrTag !== null;
    if (!isTagFrame) {
      audioFrameCount += 1;
      totalSamples += header.samplesPerFrame;
    }
    bitrates.add(header.bitrateKbps);
    sampleRates.add(header.sampleRate);
    channelModes.add(header.channelMode);
    cursor += header.frameLength;
  }

  const id3v1 =
    byteLength >= 128 &&
    Buffer.from(buf.subarray(byteLength - 128, byteLength - 125)).toString('latin1') === 'TAG';

  const streamEnd = id3v1 ? byteLength - 128 : byteLength;
  const trailingJunkBytes = Math.max(0, streamEnd - (brokenFrameAt >= 0 ? brokenFrameAt : cursor));

  if (brokenFrameAt >= 0 && trailingJunkBytes > 0) {
    issues.push({
      level: 'warn',
      code: 'trailing-junk',
      message: `${trailingJunkBytes} byte(s) of non-frame data after the last valid frame.`,
    });
  }

  const sampleRate = firstHeader.sampleRate;
  const durationSeconds = totalSamples / sampleRate;
  const isVbr = bitrates.size > 1;

  if (isVbr && (!vbrTag || vbrTag.kind === 'Info')) {
    issues.push({
      level: 'error',
      code: 'vbr-without-header',
      message:
        'Variable bitrate stream with no Xing/VBRI header. Browsers cannot compute an ' +
        'accurate duration and will seek/loop inaccurately.',
    });
  }

  if (sampleRates.size > 1) {
    issues.push({
      level: 'error',
      code: 'mixed-sample-rates',
      message: `Frames disagree on sample rate (${[...sampleRates].join(', ')} Hz).`,
    });
  }

  if (!vbrTag) {
    issues.push({
      level: 'info',
      code: 'no-gapless-info',
      message:
        `No Xing/Info/LAME header, so the encoder delay is unknown. Web Audio will decode ` +
        `the codec's ${DECODER_DELAY_SAMPLES}-sample delay as leading silence ` +
        `(~${((DECODER_DELAY_SAMPLES / sampleRate) * 1000).toFixed(1)} ms) and may click on loop.`,
    });
  } else if (vbrTag.encoderDelay != null && vbrTag.encoderDelay > 0) {
    issues.push({
      level: 'info',
      code: 'encoder-delay',
      message:
        `LAME gapless block declares ${vbrTag.encoderDelay} samples of encoder delay and ` +
        `${vbrTag.encoderPadding} of padding; browsers vary in whether they honour it.`,
    });
  }

  if (sampleRate < 22050) {
    issues.push({
      level: 'warn',
      code: 'low-sample-rate',
      message: `${sampleRate} Hz will be resampled by the browser; expect dulled transients.`,
    });
  }

  if (audioFrameCount > 0 && audioFrameCount < 3) {
    issues.push({
      level: 'warn',
      code: 'very-short',
      message:
        `Only ${audioFrameCount} audio frame(s). After the decoder delay is trimmed there is ` +
        'very little signal left; verify this clip audibly.',
    });
  }

  return {
    name: meta.name ?? null,
    byteLength,
    ok: issues.every((i) => i.level !== 'error'),
    issues,
    frameCount,
    audioFrameCount,
    sampleRates: [...sampleRates],
    bitrates: [...bitrates].sort((a, b) => a - b),
    channelModes: [...channelModes],
    vbr: isVbr,
    durationSeconds,
    id3v2Bytes,
    id3v1,
    leadingJunkBytes,
    trailingJunkBytes,
    vbrTag: vbrTag ? vbrTag.kind : null,
    encoder: vbrTag ? vbrTag.encoder : null,
    encoderDelay: vbrTag ? vbrTag.encoderDelay : null,
    encoderPadding: vbrTag ? vbrTag.encoderPadding : null,
    firstFrameOffset,
  };
}
