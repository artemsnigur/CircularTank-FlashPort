# Audio pipeline: what the JPEXS exports actually contain

## Summary

All **123** exported MP3s were audited with `npm run audio:audit`. The result:

```
   123x  44100 Hz mono 80 kbps

  [info] no-gapless-info — 123 file(s)
         No Xing/Info/LAME header, so the encoder delay is unknown.

123 file(s): 0 with errors, 0 with warnings.
```

**The VBR concern does not apply here.** Every file is constant bitrate — a
single 80 kbps bitrate across all 3311 frames of the longest track — at a
uniform 44.1 kHz mono. No ID3 tags, no leading junk, no trailing junk, frame
sync at byte 0, no mixed sample rates. Duration can be computed exactly from
the frame count, and browsers will not mis-seek.

**The real issue is the missing gapless header.** Not one file carries a
Xing/Info/VBRI header or a LAME gapless block, so no decoder can know how much
encoder delay to trim. That is expected for SWF-embedded audio — Flash stored
the delay in its own container tag, which JPEXS does not carry across when it
dumps the raw MPEG frames — but it has audible consequences:

| Symptom | Where it matters |
|---|---|
| ~12 ms (529 samples) of decoder delay rendered as leading silence | Barely perceptible on one-shot SFX |
| Encoder delay on top of that, untrimmed | SFX feel slightly late relative to the impact frame |
| Silence at both ends of a loop | **Music loops gap and click on every repeat** |

So: one-shot SFX are fine as-is. The eight music tracks and the two looping
SFX (`116_sndFlameThrowerLoop`, `143_sndBurningLoop`) need attention before
release — either re-encode to OGG/Opus or AAC (both carry gapless metadata
natively), or trim to a zero crossing and set explicit loop points.

## Two layers of checking

### 1. Offline — `npm run audio:audit`

[`scripts/lib/mp3-probe.mjs`](../scripts/lib/mp3-probe.mjs) parses the MPEG
frame headers directly (no decode, no dependencies) and reports per file:
version, bitrate distribution, sample rate, channel mode, frame-derived
duration, ID3 size, leading/trailing junk, Xing/Info/VBRI presence, and LAME
encoder delay/padding.

It exits non-zero on any error-level issue, so it can gate CI. Add `--json
audio-audit.json` for machine-readable output.

The same parser is asserted against the real asset folder in
[`scripts/mp3-probe.test.mjs`](../scripts/mp3-probe.test.mjs). If a future
re-export starts emitting VBR streams, ID3 tags, or mixed sample rates, the
test suite fails rather than someone's ears.

### 2. Runtime — the audio self-test

Confirming the loader finished proves nothing: a suspended `AudioContext` will
happily report a "playing" sound that makes no noise.
[`src/game/audio/audioSelfTest.ts`](../src/game/audio/audioSelfTest.ts) therefore:

1. Pulls the **decoded `AudioBuffer`** out of Phaser's audio cache and measures
   the actual PCM — leading silence, trailing silence, peak, DC offset, and the
   loop-seam step (`|last sample − first sample|`, which is what clicks).
2. Compares the browser's decoded duration against the frame-header duration
   from the offline audit. A mismatch over 60 ms (~2 frames) means the decoder
   and the bitstream disagree, and the file needs re-encoding.
3. **Plays each clip and confirms the transport advanced.** Short clips are
   awaited to `COMPLETE` and cross-checked against wall-clock time; long music
   is played, sampled via `sound.seek` after 250 ms, and stopped. A `seek` of
   zero means the context is still suspended — the exact failure that "the
   loader completed" would have hidden.

It runs on the first tap on the menu (audio cannot be unlocked before a
gesture) and can be re-run from the menu or the diagnostics panel. Results are
emitted on `audio:selftest` and rendered per track with a pass/warn/fail
verdict and a plain-language reason.

Thresholds live in `DEFAULT_THRESHOLDS` in
[`bufferAnalysis.ts`](../src/game/audio/bufferAnalysis.ts) and are unit-tested
against synthesised clips with known defects.

## Sample set

| Key | File | Duration | Why this one |
|---|---|---|---|
| `sfx-click` | `139_sndInterfaceButtonClick.mp3` | 0.157 s | 6 frames — the shortest clip in the set, where leading silence is proportionally worst |
| `sfx-cannon` | `140_sndWeaponCannon.mp3` | 0.627 s | Typical punchy one-shot |
| `music-menu` | `112_MusicMenu.mp3` | 86.491 s | 3311 frames, loops — the loop-seam case |

## If you re-encode

Recommended target: **OGG Vorbis or Opus**, with AAC/M4A as the Safari
fallback. Both carry gapless metadata, both beat 80 kbps MP3 on quality per
byte, and both are supported by Phaser's loader via an array of URLs.

Do not re-encode MP3 → MP3: you would pay a second lossy generation on top of
Flash-era 80 kbps source, and still not fix the gapless problem unless the
encoder writes a LAME header.

For the looping tracks specifically, trim to zero crossings before encoding —
the audit's `loopSeamDelta` measurement tells you whether it worked.
