import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MUSIC_CROSSFADE_MS,
  MUSIC_MULTIPLIER,
  SoundManager,
  strongEaseOut,
} from './SoundManager';
import type { AudioBackend, LoopId, MusicChannel } from './SoundManager';
import { LOOPS, MUSIC, ORPHAN_FILES, SFX } from '../../assets/audioManifest';

interface Call {
  kind: string;
  a?: unknown;
  b?: unknown;
}

/** Records every backend call so behaviour can be asserted precisely. */
class FakeBackend implements AudioBackend {
  calls: Call[] = [];
  loaded = new Set<string>();
  requested: string[] = [];
  musicVolume: Record<MusicChannel, number> = { 1: 0, 2: 0 };
  loopVolume: Record<string, number> = {};

  playSfx(file: string, volume: number): void {
    this.calls.push({ kind: 'playSfx', a: file, b: volume });
  }
  playMusic(channel: MusicChannel, file: string): void {
    this.calls.push({ kind: 'playMusic', a: channel, b: file });
  }
  stopMusic(channel: MusicChannel): void {
    this.calls.push({ kind: 'stopMusic', a: channel });
  }
  setMusicVolume(channel: MusicChannel, volume: number): void {
    this.musicVolume[channel] = volume;
  }
  startLoop(id: LoopId, file: string): void {
    this.calls.push({ kind: 'startLoop', a: id, b: file });
  }
  stopLoop(id: LoopId): void {
    this.calls.push({ kind: 'stopLoop', a: id });
  }
  setLoopVolume(id: LoopId, volume: number): void {
    this.loopVolume[id] = volume;
  }
  isLoaded(file: string): boolean {
    return this.loaded.has(file);
  }
  requestLoad(file: string): void {
    this.requested.push(file);
  }

  played(): string[] {
    return this.calls.filter((c) => c.kind === 'playSfx').map((c) => c.a as string);
  }
  of(kind: string): Call[] {
    return this.calls.filter((c) => c.kind === kind);
  }
}

/** One 30 fps frame, the rate the AS3 constants assume. */
const FRAME = 1000 / 30;

let backend: FakeBackend;

beforeEach(() => {
  backend = new FakeBackend();
  for (const track of MUSIC) backend.loaded.add(track.file);
});

function makeManager(random = () => 0.5): SoundManager {
  return new SoundManager({ backend, random });
}

describe('audioManifest', () => {
  it('covers every logical name with at least one variant', () => {
    expect(SFX.length).toBeGreaterThan(0);
    for (const entry of SFX) {
      expect(entry.variants.length, entry.name).toBeGreaterThan(0);
      for (const v of entry.variants) expect(v.file).toMatch(/\.mp3$/);
    }
  });

  it('has one fewer threshold than variants, or none for single-variant sounds', () => {
    for (const entry of SFX) {
      if (entry.variants.length === 1) expect(entry.thresholds).toEqual([]);
      else expect(entry.thresholds.length, entry.name).toBe(entry.variants.length - 1);
    }
  });

  it('has ascending thresholds', () => {
    for (const entry of SFX) {
      for (let i = 1; i < entry.thresholds.length; i += 1) {
        expect(entry.thresholds[i], entry.name).toBeGreaterThan(entry.thresholds[i - 1]);
      }
    }
  });

  it('maps every one of the 115 AS3 sound classes exactly once', () => {
    const files = new Set([
      ...SFX.flatMap((s) => s.variants.map((v) => v.file)),
      ...MUSIC.map((m) => m.file),
      ...LOOPS.map((l) => l.file),
    ]);
    expect(files.size).toBe(115);
  });

  it('records the 8 orphan mp3s rather than silently dropping them', () => {
    expect(ORPHAN_FILES).toHaveLength(8);
  });

  it('keeps SWF library IDs in every filename for traceability', () => {
    for (const entry of SFX) for (const v of entry.variants) expect(v.file).toMatch(/^\d+/);
  });

  it('splits preload and lazy sets the way the size data implies', () => {
    // 115 = 105 sfx + 2 loops + 8 music. Loops preload with the SFX; only the
    // 8 music tracks (4.8 MB) are lazy.
    expect(SoundManager.sfxFilesToPreload()).toHaveLength(107);
    expect(SoundManager.musicFiles()).toHaveLength(8);
  });
});

describe('strongEaseOut', () => {
  it('matches Flash Strong.easeOut / Phaser Quint.Out', () => {
    expect(strongEaseOut(0)).toBe(0);
    expect(strongEaseOut(1)).toBe(1);
    expect(strongEaseOut(0.5)).toBeCloseTo(1 - 0.5 ** 5, 12);
  });

  it('clamps outside [0, 1]', () => {
    expect(strongEaseOut(-1)).toBe(0);
    expect(strongEaseOut(2)).toBe(1);
  });

  it('eases out — most of the travel happens early', () => {
    expect(strongEaseOut(0.25)).toBeGreaterThan(0.5);
  });
});

describe('SFX playback', () => {
  it('plays a queued sound once per frame', () => {
    const m = makeManager();
    m.queue('InterfaceButtonClick');
    m.update(FRAME);
    expect(backend.played()).toEqual(['139_sndInterfaceButtonClick.mp3']);
  });

  it('de-duplicates repeated requests within one frame', () => {
    // The behaviour that stops 20 simultaneous bullet impacts becoming 20
    // overlapping copies of the same clip.
    const m = makeManager();
    for (let i = 0; i < 20; i += 1) m.queue('ImpactBullet');
    m.update(FRAME);
    expect(backend.played()).toHaveLength(1);
  });

  it('plays distinct sounds in the order they were queued', () => {
    const m = makeManager();
    m.queue('Coin');
    m.queue('InterfaceButtonClick');
    m.queue('Coin');
    m.update(FRAME);
    expect(backend.played()).toHaveLength(2);
    expect(backend.played()[1]).toBe('139_sndInterfaceButtonClick.mp3');
  });

  it('clears the queue between frames', () => {
    const m = makeManager();
    m.queue('InterfaceButtonClick');
    m.update(FRAME);
    m.update(FRAME);
    expect(backend.played()).toHaveLength(1);
  });

  it('does not play while muted, and does not replay afterwards', () => {
    // The AS3 empties sfxArray unconditionally, so a request made while muted
    // is dropped rather than deferred.
    const m = makeManager();
    m.soundOn = false;
    m.queue('InterfaceButtonClick');
    m.update(FRAME);
    expect(backend.played()).toEqual([]);

    m.soundOn = true;
    m.update(FRAME);
    expect(backend.played()).toEqual([]);
  });

  it('scales volume by soundVol', () => {
    const m = makeManager();
    m.soundVol = 0.4;
    m.queue('InterfaceButtonClick');
    m.update(FRAME);
    expect(backend.of('playSfx')[0].b).toBeCloseTo(0.4);
  });

  it('warns and ignores an unknown name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const m = makeManager();
    m.queue('NoSuchSound');
    m.update(FRAME);
    expect(backend.played()).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  describe('variant selection', () => {
    // "Coin" has three variants with thresholds [0.33, 0.66].
    it('picks the first variant below the first threshold', () => {
      const m = makeManager(() => 0.1);
      m.queue('Coin');
      m.update(FRAME);
      expect(backend.played()).toEqual(['138_sndCoinv1.mp3']);
    });

    it('picks the middle variant between thresholds', () => {
      const m = makeManager(() => 0.5);
      m.queue('Coin');
      m.update(FRAME);
      expect(backend.played()).toEqual(['137_sndCoinv2.mp3']);
    });

    it('falls through to the last variant above the last threshold', () => {
      const m = makeManager(() => 0.9);
      m.queue('Coin');
      m.update(FRAME);
      expect(backend.played()).toEqual(['136_sndCoinv3.mp3']);
    });

    it('treats the threshold as a strict upper bound, as `<` does in AS3', () => {
      const m = makeManager(() => 0.33);
      m.queue('Coin');
      m.update(FRAME);
      expect(backend.played()).toEqual(['137_sndCoinv2.mp3']);
    });

    it('reaches every variant of the six-way sound across the range', () => {
      const six = SFX.find((s) => s.variants.length === 6);
      expect(six).toBeDefined();
      const seen = new Set<string>();
      for (const draw of [0.05, 0.2, 0.4, 0.6, 0.8, 0.99]) {
        const m = new SoundManager({ backend, random: () => draw });
        m.queue(six!.name);
        m.update(FRAME);
      }
      for (const f of backend.played()) seen.add(f);
      expect(seen.size).toBe(6);
    });
  });
});

describe('music crossfade', () => {
  it('starts the first track on channel 2 and fades it in', () => {
    const m = makeManager();
    m.setMusic('Menu');
    m.update(FRAME);

    expect(backend.of('playMusic')[0]).toMatchObject({ a: 2, b: '112_MusicMenu.mp3' });
    expect(m.activeMusic).toBe('Menu');
    // Channel 2 carries (1 - tweenVar), which starts near 0 and rises.
    expect(backend.musicVolume[2]).toBeGreaterThan(0);
  });

  it('completes in exactly 1000 ms (30 frames at 30 fps)', () => {
    expect(MUSIC_CROSSFADE_MS).toBe(1000);

    const m = makeManager();
    m.setMusic('Menu');
    for (let i = 0; i < 30; i += 1) m.update(FRAME);

    expect(m.crossfadeProgress).toBe(1);
    expect(backend.musicVolume[2]).toBeCloseTo(MUSIC_MULTIPLIER, 6);
    expect(backend.musicVolume[1]).toBeCloseTo(0, 6);
  });

  it('follows the quintic ease rather than a linear ramp', () => {
    const m = makeManager();
    m.setMusic('Menu');
    m.update(250); // quarter way

    const expected = MUSIC_MULTIPLIER * strongEaseOut(0.25);
    expect(backend.musicVolume[2]).toBeCloseTo(expected, 6);
    // Quintic ease-out is well ahead of linear at t=0.25.
    expect(backend.musicVolume[2]).toBeGreaterThan(MUSIC_MULTIPLIER * 0.25);
  });

  it('keeps the two channels summing to the full music level throughout', () => {
    const m = makeManager();
    m.setMusic('Menu');
    for (let i = 0; i < 30; i += 1) {
      m.update(FRAME);
      const sum = backend.musicVolume[1] + backend.musicVolume[2];
      expect(sum).toBeCloseTo(MUSIC_MULTIPLIER, 6);
    }
  });

  it('alternates channels on each change', () => {
    const m = makeManager();
    m.setMusic('Menu');
    for (let i = 0; i < 30; i += 1) m.update(FRAME);
    m.setMusic('Boss');
    m.update(FRAME);

    const plays = backend.of('playMusic');
    expect(plays[0].a).toBe(2);
    expect(plays[1].a).toBe(1);
    expect(plays[1].b).toBe('73_MusicBoss.mp3');
  });

  it('stops the outgoing channel when the fade finishes', () => {
    const m = makeManager();
    m.setMusic('Menu');
    for (let i = 0; i < 30; i += 1) m.update(FRAME);
    m.setMusic('Boss');
    for (let i = 0; i < 30; i += 1) m.update(FRAME);

    // Moving to channel 1 means channel 2 is the one torn down at the end.
    expect(backend.of('stopMusic').map((c) => c.a)).toContain(2);
    expect(m.crossfadeProgress).toBe(1);
  });

  it('applies musicVol on top of the 0.75 multiplier', () => {
    const m = makeManager();
    m.musicVol = 0.5;
    m.setMusic('Menu');
    for (let i = 0; i < 30; i += 1) m.update(FRAME);
    expect(backend.musicVolume[2]).toBeCloseTo(0.5 * MUSIC_MULTIPLIER, 6);
  });

  it('does nothing when the same track is requested again', () => {
    const m = makeManager();
    m.setMusic('Menu');
    for (let i = 0; i < 30; i += 1) m.update(FRAME);
    const before = backend.of('playMusic').length;

    m.setMusic('Menu');
    m.update(FRAME);
    expect(backend.of('playMusic')).toHaveLength(before);
  });

  it('tears music down when musicOn goes false', () => {
    const m = makeManager();
    m.setMusic('Menu');
    for (let i = 0; i < 30; i += 1) m.update(FRAME);

    m.musicOn = false;
    m.update(FRAME);

    expect(m.activeMusic).toBe('None');
    expect(backend.of('stopMusic').length).toBeGreaterThanOrEqual(2);
  });

  it('tears music down when paused', () => {
    const m = makeManager();
    m.setMusic('Menu');
    for (let i = 0; i < 30; i += 1) m.update(FRAME);

    m.musicPaused = true;
    m.update(FRAME);
    expect(m.activeMusic).toBe('None');
  });

  it('requests a lazy load and retries until the track is decoded', () => {
    backend.loaded.clear();
    const m = makeManager();
    m.setMusic('Boss');
    m.update(FRAME);

    expect(backend.requested).toContain('73_MusicBoss.mp3');
    expect(backend.of('playMusic')).toHaveLength(0);
    expect(m.activeMusic).toBe('None'); // not silently swallowed

    backend.loaded.add('73_MusicBoss.mp3');
    m.update(FRAME);
    expect(backend.of('playMusic')).toHaveLength(1);
    expect(m.activeMusic).toBe('Boss');
  });

  it('stops everything when switched to "None"', () => {
    const m = makeManager();
    m.setMusic('Menu');
    for (let i = 0; i < 30; i += 1) m.update(FRAME);

    m.setMusic('None');
    m.update(FRAME);
    expect(m.activeMusic).toBe('None');
  });
});

describe('continuous loops', () => {
  it('starts on first request and ramps in over 10 frames', () => {
    // flameThrowerVolChangeValue = 0.1/frame at 30 fps -> full in 10 frames.
    const m = makeManager();
    for (let i = 0; i < 10; i += 1) {
      m.keepLoopAlive('FlameThrower');
      m.update(FRAME);
    }

    expect(backend.of('startLoop')[0]).toMatchObject({
      a: 'FlameThrower',
      b: '116_sndFlameThrowerLoop.mp3',
    });
    expect(backend.loopVolume.FlameThrower).toBeCloseTo(1, 6);
  });

  it('starts only once while held', () => {
    const m = makeManager();
    for (let i = 0; i < 20; i += 1) {
      m.keepLoopAlive('FlameThrower');
      m.update(FRAME);
    }
    expect(backend.of('startLoop')).toHaveLength(1);
  });

  it('fades out at twice the fade-in rate once released', () => {
    const m = makeManager();
    for (let i = 0; i < 10; i += 1) {
      m.keepLoopAlive('FlameThrower');
      m.update(FRAME);
    }
    expect(backend.loopVolume.FlameThrower).toBeCloseTo(1, 6);

    // Not re-asserted: 0.2/frame means silence in 5 frames, not 10.
    for (let i = 0; i < 5; i += 1) m.update(FRAME);
    expect(backend.loopVolume.FlameThrower).toBeCloseTo(0, 6);
  });

  it('stops the channel only after the fade completes', () => {
    const m = makeManager();
    for (let i = 0; i < 10; i += 1) {
      m.keepLoopAlive('FlameThrower');
      m.update(FRAME);
    }
    m.update(FRAME);
    expect(backend.of('stopLoop')).toHaveLength(0); // still fading

    for (let i = 0; i < 10; i += 1) m.update(FRAME);
    expect(backend.of('stopLoop')).toHaveLength(1);
  });

  it('treats the request flag as a per-frame keep-alive', () => {
    const m = makeManager();
    m.keepLoopAlive('FlameThrower');
    m.update(FRAME);
    const afterFirst = backend.loopVolume.FlameThrower;

    // One frame without re-asserting must already be fading.
    m.update(FRAME);
    expect(backend.loopVolume.FlameThrower).toBeLessThan(afterFirst);
  });

  it('ramps Burning twice as fast as FlameThrower', () => {
    // burningVolChangeValue = 0.2/frame vs 0.1 — full in 5 frames.
    const m = makeManager();
    for (let i = 0; i < 5; i += 1) {
      m.keepLoopAlive('Burning');
      m.update(FRAME);
    }
    expect(backend.loopVolume.Burning).toBeCloseTo(1, 6);
  });

  it('is frame-rate independent', () => {
    // The AS3 rates are per-frame at 30 fps; ported as per-second they must
    // reach the same place regardless of step size.
    const at30 = new FakeBackend();
    const a = new SoundManager({ backend: at30 });
    for (let i = 0; i < 10; i += 1) {
      a.keepLoopAlive('FlameThrower');
      a.update(1000 / 30);
    }

    const at60 = new FakeBackend();
    const b = new SoundManager({ backend: at60 });
    for (let i = 0; i < 20; i += 1) {
      b.keepLoopAlive('FlameThrower');
      b.update(1000 / 60);
    }

    expect(at60.loopVolume.FlameThrower).toBeCloseTo(at30.loopVolume.FlameThrower, 6);
  });

  it('scales loop volume by soundVol', () => {
    const m = makeManager();
    m.soundVol = 0.25;
    for (let i = 0; i < 10; i += 1) {
      m.keepLoopAlive('FlameThrower');
      m.update(FRAME);
    }
    expect(backend.loopVolume.FlameThrower).toBeCloseTo(0.25, 6);
  });

  /**
   * **Muting silences a running loop.** Found in T83 while porting the volume
   * sliders, and it was a live defect: `handleLoops` scaled by `soundVol` and
   * never consulted `soundOn`.
   *
   * The AS3 gets away with the same expression because `ScreenOptions.as:251-254`
   * forces `soundVol = 0` whenever sound is off — the invariant is structural
   * there, since slider and toggle are one control. This port keeps the two
   * independent, so transcribing the expression dropped the guarantee with it.
   * Harmless until T80 gave the loops their first callers; reachable the moment
   * a player muted mid-flamethrower.
   *
   * **Driven as a pair on one manager, and that is what makes it worth
   * anything.** `soundOn = false` alone is satisfied by a backend that never
   * receives a volume at all, or by a loop that failed to start; asserting the
   * *same* loop is audible again when sound comes back rules both out. The two
   * assertions bracket one continuous run — no re-creation between them.
   */
  it('silences a running loop while muted, and restores it', () => {
    const m = makeManager();
    const run = (): void => {
      for (let i = 0; i < 10; i += 1) {
        m.keepLoopAlive('Burning');
        m.update(FRAME);
      }
    };

    run();
    expect(backend.loopVolume.Burning, 'audible before mute').toBeCloseTo(1, 6);

    m.soundOn = false;
    run();
    expect(backend.loopVolume.Burning, 'silent while muted').toBe(0);

    m.soundOn = true;
    run();
    expect(backend.loopVolume.Burning, 'audible again after unmute').toBeCloseTo(1, 6);
  });

  /**
   * The counterpart to the counterpart: muting must not tear the channel down.
   *
   * `ScreenOptions` mutes by zeroing the volume, not by stopping the sound, so
   * the loop's own state machine keeps running. A fix that called `stopLoop`
   * would pass the test above and restart the loop from silence on unmute — an
   * audible click, and a different behaviour from the original.
   */
  it('mutes by volume, not by stopping the channel', () => {
    const m = makeManager();
    for (let i = 0; i < 10; i += 1) {
      m.keepLoopAlive('Burning');
      m.update(FRAME);
    }
    m.soundOn = false;
    for (let i = 0; i < 10; i += 1) {
      m.keepLoopAlive('Burning');
      m.update(FRAME);
    }

    expect(backend.of('stopLoop'), 'still running, just silent').toHaveLength(0);
    expect(backend.of('startLoop'), 'never restarted').toHaveLength(1);
  });
});
