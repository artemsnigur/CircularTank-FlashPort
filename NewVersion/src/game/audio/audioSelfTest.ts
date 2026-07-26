/**
 * Runtime audio self-test.
 *
 * Requirement from the port brief: don't just confirm the loader finished —
 * actually play sample sounds and confirm playback isn't glitchy. So this:
 *
 *   1. pulls the decoded AudioBuffer straight out of Phaser's audio cache and
 *      measures it (leading silence, DC offset, loop-seam step, peak),
 *   2. compares the browser's decoded duration against the duration derived
 *      offline from the MP3 frame headers (`npm run audio:audit`),
 *   3. plays each clip and confirms the transport actually advanced, rather
 *      than trusting that `play()` returned without throwing.
 *
 * Must run after a user gesture — browsers keep the AudioContext suspended
 * until then, and a suspended context will happily "play" nothing at all.
 */
import Phaser from 'phaser';
import { SAMPLE_AUDIO } from '../../assets/manifest';
import type { AudioAsset } from '../../assets/manifest';
import type { AudioSelfTestReport, AudioTrackReport } from '../events/GameEvents';
import { analyseAudioBuffer, gradeTrack } from './bufferAnalysis';
import type { BufferAnalysis } from './bufferAnalysis';

/** Long clips are sampled rather than played to completion. */
const LONG_CLIP_SECONDS = 5;
/** How long to let a long clip run before checking the transport, in ms. */
const TRANSPORT_PROBE_MS = 250;
/** Grace on top of a clip's own length before we call it stuck. */
const COMPLETE_TIMEOUT_PADDING_MS = 600;
/** Audible but unobtrusive: this runs in front of the player. */
const TEST_VOLUME = 0.35;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

function backendName(manager: Phaser.Sound.BaseSoundManager): string {
  if (manager instanceof Phaser.Sound.WebAudioSoundManager) return 'webaudio';
  if (manager instanceof Phaser.Sound.HTML5AudioSoundManager) return 'html5';
  return 'none';
}

function analysisFromCache(scene: Phaser.Scene, key: string): BufferAnalysis | null {
  const cached: unknown = scene.cache.audio.get(key);
  // WebAudio caches a decoded AudioBuffer; HTML5 caches an <audio> element,
  // which gives us no PCM to inspect.
  if (cached && typeof cached === 'object' && 'getChannelData' in cached) {
    return analyseAudioBuffer(cached as AudioBuffer);
  }
  return null;
}

/**
 * Plays a clip and reports whether the transport really moved.
 *
 * Short clips are awaited to completion, which also cross-checks the reported
 * duration against wall-clock time. Long clips (music) are sampled: play,
 * wait, read `seek`, stop.
 */
async function confirmPlayback(
  scene: Phaser.Scene,
  asset: AudioAsset,
  analysis: BufferAnalysis | null,
): Promise<{ confirmed: boolean; note: string | null }> {
  let sound: Phaser.Sound.BaseSound;
  try {
    sound = scene.sound.add(asset.key, { volume: TEST_VOLUME, loop: false });
  } catch (error) {
    return { confirmed: false, note: `Could not create sound: ${String(error)}` };
  }

  try {
    const duration = analysis?.durationSeconds ?? asset.expectedDuration;

    if (duration > LONG_CLIP_SECONDS) {
      if (!sound.play()) return { confirmed: false, note: 'play() returned false.' };
      await delay(TRANSPORT_PROBE_MS);
      // `seek` is the transport position. If the context is suspended it stays
      // at 0 even though isPlaying is true — which is exactly the failure mode
      // that "the loader completed" would have hidden.
      const seek = (sound as unknown as { seek: number }).seek;
      sound.stop();
      if (!(seek > 0)) {
        return {
          confirmed: false,
          note: 'Transport did not advance — the AudioContext is probably still suspended.',
        };
      }
      return { confirmed: true, note: null };
    }

    const startedAt = performance.now();
    const finished = await new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => {
        sound.off(Phaser.Sound.Events.COMPLETE, onComplete);
        resolve(false);
      }, duration * 1000 + COMPLETE_TIMEOUT_PADDING_MS);

      const onComplete = (): void => {
        window.clearTimeout(timeout);
        resolve(true);
      };

      sound.once(Phaser.Sound.Events.COMPLETE, onComplete);
      if (!sound.play()) {
        window.clearTimeout(timeout);
        sound.off(Phaser.Sound.Events.COMPLETE, onComplete);
        resolve(false);
      }
    });

    if (!finished) {
      sound.stop();
      return { confirmed: false, note: 'Clip never reported completion.' };
    }

    // Wall-clock cross-check catches a decoder that reports one duration and
    // renders another.
    const elapsed = performance.now() - startedAt;
    const wallDriftMs = elapsed - duration * 1000;
    if (wallDriftMs > 250) {
      return {
        confirmed: true,
        note: `Took ${wallDriftMs.toFixed(0)} ms longer than its duration to finish.`,
      };
    }
    return { confirmed: true, note: null };
  } finally {
    sound.destroy();
  }
}

/**
 * Runs the full self-test. Emits nothing; the caller decides what to do with
 * the report (GameplayScene forwards it on `audio:selftest`).
 */
export async function runAudioSelfTest(
  scene: Phaser.Scene,
  assets: readonly AudioAsset[] = SAMPLE_AUDIO,
): Promise<AudioSelfTestReport> {
  const manager = scene.sound;
  const backend = backendName(manager);
  const context =
    manager instanceof Phaser.Sound.WebAudioSoundManager ? manager.context : null;

  // Phaser exposes `locked` until the first qualifying gesture unlocks the
  // context. Trying to measure before that produces confident nonsense.
  const unlocked = !manager.locked && context?.state !== 'suspended';

  const tracks: AudioTrackReport[] = [];

  for (const asset of assets) {
    const analysis = analysisFromCache(scene, asset.key);
    const notes: string[] = [];

    if (!analysis) {
      notes.push(
        backend === 'html5'
          ? 'HTML5 audio backend: no decoded PCM available, so only playback was checked.'
          : 'No decoded buffer in the audio cache — was this key preloaded?',
      );
    }

    const playback = unlocked
      ? await confirmPlayback(scene, asset, analysis)
      : { confirmed: false, note: 'Audio is still locked; tap once and re-run.' };
    if (playback.note) notes.push(playback.note);

    if (analysis) {
      const graded = gradeTrack({
        analysis,
        expectedDuration: asset.expectedDuration,
        loops: asset.loops,
        playbackConfirmed: playback.confirmed,
      });
      tracks.push({
        key: asset.key,
        file: asset.file,
        decodedDuration: analysis.durationSeconds,
        expectedDuration: asset.expectedDuration,
        driftMs: graded.driftMs,
        leadingSilenceMs: analysis.leadingSilenceMs,
        trailingSilenceMs: analysis.trailingSilenceMs,
        peak: analysis.peak,
        dcOffset: analysis.dcOffset,
        loopSeamDelta: asset.loops ? analysis.loopSeamDelta : null,
        playbackConfirmed: playback.confirmed,
        verdict: graded.verdict,
        notes: [...notes, ...graded.notes],
      });
    } else {
      tracks.push({
        key: asset.key,
        file: asset.file,
        decodedDuration: 0,
        expectedDuration: asset.expectedDuration,
        driftMs: 0,
        leadingSilenceMs: 0,
        trailingSilenceMs: 0,
        peak: 0,
        dcOffset: 0,
        loopSeamDelta: null,
        playbackConfirmed: playback.confirmed,
        verdict: playback.confirmed ? 'warn' : 'fail',
        notes,
      });
    }
  }

  const verdict: AudioSelfTestReport['verdict'] = tracks.some((t) => t.verdict === 'fail')
    ? 'fail'
    : tracks.some((t) => t.verdict === 'warn')
      ? 'warn'
      : 'ok';

  return {
    backend,
    unlocked,
    sampleRate: context?.sampleRate ?? 0,
    tracks,
    verdict,
  };
}
