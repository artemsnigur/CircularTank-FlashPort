/**
 * The mute toggle at the seam, not just the state.
 *
 * A state test would pass on a toggle that flips a persisted boolean and changes
 * nothing audible — which is exactly what would have shipped, because
 * `applyVolumes()` existed and was never called (audit defect 5). So these drive
 * a real `SoundManager` against a recording backend and assert on **what the
 * backend was told**, plus a real `SaveStore` round trip for the persistence.
 *
 * The AS3 keeps these in `CircularTankOptions`, a SharedObject separate from the
 * save slots (`SaveManager.as:846-863`), so a save wipe does not reset
 * preferences and muting does not touch the 63-field slot.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUDIO_OPTIONS,
  applyAudioOptions,
  currentAudioOptions,
  readAudioOptions,
  writeAudioOptions,
} from './audioOptions';
import { MemoryBackend, OPTIONS_STORE, SaveStore } from '../save/SaveStore';
import { SoundManager } from './SoundManager';
import type { AudioBackend, LoopId, MusicChannel } from './SoundManager';

/** Records every instruction, so "what did the engine hear" is answerable. */
class RecordingBackend implements AudioBackend {
  sfx: { file: string; volume: number }[] = [];
  musicPlayed: { channel: MusicChannel; file: string }[] = [];
  musicStopped: MusicChannel[] = [];
  musicVolumes: { channel: MusicChannel; volume: number }[] = [];
  loaded = new Set<string>();

  isLoaded(file: string): boolean {
    return this.loaded.has(file);
  }
  requestLoad(file: string): void {
    this.loaded.add(file);
  }
  playSfx(file: string, volume: number): void {
    this.sfx.push({ file, volume });
  }
  playMusic(channel: MusicChannel, file: string): void {
    this.musicPlayed.push({ channel, file });
  }
  stopMusic(channel: MusicChannel): void {
    this.musicStopped.push(channel);
  }
  setMusicVolume(channel: MusicChannel, volume: number): void {
    this.musicVolumes.push({ channel, volume });
  }
  startLoop(_id: LoopId, _file: string): void {}
  stopLoop(_id: LoopId): void {}
  setLoopVolume(_id: LoopId, _volume: number): void {}
}

const FRAME = 1000 / 60;

/** Runs enough frames for a crossfade to settle. */
function run(manager: SoundManager, frames = 60): void {
  for (let i = 0; i < frames; i += 1) manager.update(FRAME);
}

function fresh(): { manager: SoundManager; backend: RecordingBackend } {
  const backend = new RecordingBackend();
  // Everything already cached, so nothing is gated on a load.
  for (const file of SoundManager.musicFiles()) backend.loaded.add(file);
  for (const file of SoundManager.sfxFilesToPreload()) backend.loaded.add(file);
  return { manager: new SoundManager({ backend }), backend };
}

describe('sound off reaches the backend', () => {
  it('queued effects are not played', () => {
    const { manager, backend } = fresh();
    manager.soundOn = false;

    manager.queue('Coin');
    run(manager, 1);

    expect(backend.sfx).toEqual([]);
  });

  it('and turning it back on lets the next one through', () => {
    const { manager, backend } = fresh();
    manager.soundOn = false;
    manager.queue('Coin');
    run(manager, 1);

    manager.soundOn = true;
    manager.queue('Coin');
    run(manager, 1);

    // Exactly one: the muted request is dropped rather than deferred, matching
    // the AS3, which clears sfxArray unconditionally.
    expect(backend.sfx).toHaveLength(1);
  });
});

describe('music off reaches the backend', () => {
  it('a track requested while muted never plays', () => {
    const { manager, backend } = fresh();
    manager.musicOn = false;

    manager.setMusic('Menu');
    run(manager);

    expect(backend.musicPlayed).toEqual([]);
  });

  it('muting mid-track stops it', () => {
    const { manager, backend } = fresh();
    manager.setMusic('Menu');
    run(manager);
    expect(backend.musicPlayed.length).toBeGreaterThan(0);

    manager.musicOn = false;
    run(manager);

    expect(backend.musicStopped.length).toBeGreaterThan(0);
  });

  it('musicVol still reaches the backend after the crossfade settles — defect 5', () => {
    // The isolation matters. `handleMusicChange` also calls setMusicVolume, but
    // ONLY while `musicChanging` is true, so a volume change during a fade is
    // carried by it and proves nothing. Once the fade completes, `applyVolumes`
    // is the sole maintainer — which is the step that was missing from
    // `update()` for the whole life of the port.
    //
    // A first version of this test ran exactly one crossfade's worth of frames
    // and passed with `applyVolumes` deleted. It was measuring the fade.
    const { manager, backend } = fresh();
    manager.setMusic('Menu');
    run(manager, 240); // well past MUSIC_CROSSFADE_MS (1000ms)

    backend.musicVolumes.length = 0;
    manager.musicVol = 0.25;
    run(manager, 2);

    expect(
      backend.musicVolumes.length,
      'nothing set a volume after the fade — applyVolumes is not being called',
    ).toBeGreaterThan(0);
    // 0.25 * MUSIC_MULTIPLIER (0.75) = 0.1875, on the live channel.
    const loudest = Math.max(...backend.musicVolumes.map((v) => v.volume));
    expect(loudest).toBeCloseTo(0.1875, 4);
  });

  it('soundVol scales effects', () => {
    const { manager, backend } = fresh();
    manager.soundVol = 0.5;

    manager.queue('Coin');
    run(manager, 1);

    expect(backend.sfx[0].volume).toBeCloseTo(0.5, 4);
  });
});

describe('preferences survive a reload', () => {
  const store = (): SaveStore => new SaveStore(OPTIONS_STORE, new MemoryBackend());

  it('defaults match SaveManager.as:831-834', () => {
    expect(readAudioOptions(store())).toEqual(DEFAULT_AUDIO_OPTIONS);
  });

  it('a muted state round-trips through the options store', () => {
    const backend = new MemoryBackend();
    const first = new SaveStore(OPTIONS_STORE, backend);

    const { manager } = fresh();
    manager.soundOn = false;
    manager.musicVol = 0.4;
    writeAudioOptions(first, currentAudioOptions(manager));

    // A second store over the same backend is the reload.
    const reloaded = readAudioOptions(new SaveStore(OPTIONS_STORE, backend));
    expect(reloaded.soundOn).toBe(false);
    expect(reloaded.musicOn).toBe(true);
    expect(reloaded.musicVol).toBeCloseTo(0.4, 4);
  });

  it('a reloaded preference reaches the backend, not just the fields', () => {
    // The full loop: persist, reload, apply, and confirm the engine obeys. A
    // toggle that saved and restored correctly but never reached the backend is
    // precisely the failure this file exists to prevent.
    const backend = new MemoryBackend();
    writeAudioOptions(new SaveStore(OPTIONS_STORE, backend), {
      ...DEFAULT_AUDIO_OPTIONS,
      soundOn: false,
    });

    const { manager, backend: audio } = fresh();
    applyAudioOptions(manager, readAudioOptions(new SaveStore(OPTIONS_STORE, backend)));

    manager.queue('Coin');
    run(manager, 1);

    expect(audio.sfx).toEqual([]);
  });

  it('clamps a corrupt volume rather than passing it through', () => {
    const backend = new MemoryBackend();
    const s = new SaveStore(OPTIONS_STORE, backend);
    s.set('musicVol', 42);
    s.set('soundVol', -3);
    s.flush();

    const read = readAudioOptions(new SaveStore(OPTIONS_STORE, backend));
    expect(read.musicVol).toBe(1);
    expect(read.soundVol).toBe(0);
  });
});
