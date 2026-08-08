/**
 * The volume sliders, driven through the real bus and the real store.
 *
 * These deliberately do **not** assert "a slider renders". A range input that
 * exists and is wired to nothing satisfies that, and the gap this closes was a
 * missing *control*, not a missing element.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VolumeSliders } from './VolumeSliders';
import { GameEvents } from '../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from '../state/bridge';
import { useGameStore } from '../state/gameStore';

const initial = useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initial, true);
  attachStoreBridge();
});

afterEach(() => {
  detachStoreBridge();
});

const soundSlider = (): HTMLInputElement => screen.getByRole('slider', { name: /sound volume/i });
const musicSlider = (): HTMLInputElement => screen.getByRole('slider', { name: /music volume/i });

/** What the scene would do: apply, then republish from the manager. */
const publish = (options: {
  soundOn?: boolean;
  musicOn?: boolean;
  soundVol?: number;
  musicVol?: number;
}): void => {
  const current = useGameStore.getState().audioOptions;
  act(() => {
    GameEvents.emit('audio:options', { ...current, ...options });
  });
};

describe('the slider is a control, not a display', () => {
  /**
   * The round trip, end to end: drag → `ui:set-audio` → (scene applies) →
   * `audio:options` → store → the input shows the engine's value.
   *
   * **The counterpart is the second half.** A slider holding local state passes
   * "it moved"; this fails it, because the value only comes back through the
   * bus. The emitted payload is captured rather than assumed, so a control that
   * renders correctly and emits nothing also fails.
   */
  it('emits the dragged value and shows what comes back', () => {
    const seen: number[] = [];
    const off = GameEvents.subscribe('ui:set-audio', (change) => {
      if (change.soundVol !== undefined) seen.push(change.soundVol);
    });

    render(<VolumeSliders />);
    fireEvent.change(soundSlider(), { target: { value: '0.42' } });

    expect(seen, 'the drag must reach the bus').toEqual([0.42]);
    // Nothing applied it yet, so the input must still show the old value —
    // this is what proves it is not holding its own state.
    expect(soundSlider().valueAsNumber, 'before the engine replies').toBe(1);

    publish({ soundVol: 0.42 });
    expect(soundSlider().valueAsNumber, 'after the engine replies').toBe(0.42);

    off();
  });

  /**
   * Both ends of the range, driven — `:48` clamps to 0 and `:53` to 1.
   *
   * Pinned as a pair against a midpoint, because "always reports 0" and
   * "always reports 1" each satisfy one bound alone.
   */
  it('reaches both real bounds, not just a midpoint', () => {
    const seen: number[] = [];
    const off = GameEvents.subscribe('ui:set-audio', (c) => {
      if (c.soundVol !== undefined) seen.push(c.soundVol);
    });

    render(<VolumeSliders />);
    // Each step is a full round trip — drag, then let the engine reply — because
    // the input is **controlled**. Dragging three times without applying
    // anything snaps it back to the store's value between each, and a `change`
    // to the value already displayed fires no event at all. The first version of
    // this test did exactly that and silently lost its upper bound.
    for (const v of [0, 0.5, 1]) {
      fireEvent.change(soundSlider(), { target: { value: String(v) } });
      publish({ soundVol: v });
      expect(soundSlider().valueAsNumber, `after applying ${v}`).toBe(v);
    }

    expect(seen).toEqual([0, 0.5, 1]);
    off();
  });

  /**
   * `:58` is `mouseX / bar.width` — continuous. The only `Math.round` in the
   * class is `:36`, on the *button's pixel x*, not the value.
   *
   * A `step` of 0.05 or 0.1 is the obvious wrong implementation and looks
   * right in a screenshot; it is caught here by a value no coarse step can
   * represent.
   */
  it('carries a value no quantised step could produce', () => {
    let last: number | null = null;
    const off = GameEvents.subscribe('ui:set-audio', (c) => {
      if (c.musicVol !== undefined) last = c.musicVol;
    });

    render(<VolumeSliders />);
    fireEvent.change(musicSlider(), { target: { value: '0.37' } });

    expect(last).toBe(0.37);
    expect(musicSlider().getAttribute('step')).toBe('any');
    off();
  });

  /** The two channels are independent — a shared handler would fail this. */
  it('keeps sound and music separate', () => {
    render(<VolumeSliders />);
    publish({ soundVol: 0.2, musicVol: 0.9 });

    expect(soundSlider().valueAsNumber).toBe(0.2);
    expect(musicSlider().valueAsNumber).toBe(0.9);
  });

  it('shows the value as a percentage', () => {
    render(<VolumeSliders />);
    publish({ soundVol: 0.42 });
    expect(screen.getByText('42%')).toBeTruthy();
  });
});
