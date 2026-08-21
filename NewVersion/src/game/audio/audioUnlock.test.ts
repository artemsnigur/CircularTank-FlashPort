import { describe, expect, it, vi } from 'vitest';

import { installAudioUnlock, resumeIfSuspended } from './audioUnlock';
import type { ResumableContext } from './audioUnlock';

/** A context whose state the test drives, since jsdom has no Web Audio. */
function fakeContext(state = 'suspended'): ResumableContext & { resumes: number } {
  return {
    state,
    resumes: 0,
    resume() {
      this.resumes += 1;
      this.state = 'running';
      return Promise.resolve();
    },
  };
}

describe('resumeIfSuspended', () => {
  it('resumes a suspended context and reports it did', () => {
    const context = fakeContext('suspended');
    expect(resumeIfSuspended(context)).toBe(true);
    expect(context.resumes).toBe(1);
  });

  it('leaves a running one alone', () => {
    /*
     * The counterpart, and it is not decoration: this runs on **every**
     * gesture, so calling `resume()` on an already-running context would be a
     * pointless promise per click for the life of the session.
     */
    const context = fakeContext('running');
    expect(resumeIfSuspended(context)).toBe(false);
    expect(context.resumes).toBe(0);
  });

  it('survives a missing context and a rejecting one', () => {
    /*
     * Both are real. Phaser's HTML5 fallback and its no-audio stub have no
     * `context` at all, and `resume()` rejects when the call turns out not to
     * be inside a gesture after all — which is a thing browsers decide, not
     * something this can check first.
     *
     * A throw here would take the input handler with it, so neither may
     * escape.
     */
    expect(resumeIfSuspended(null)).toBe(false);
    expect(resumeIfSuspended(undefined)).toBe(false);

    const rejecting: ResumableContext = {
      state: 'suspended',
      resume: () => Promise.reject(new Error('not allowed')),
    };
    expect(() => resumeIfSuspended(rejecting)).not.toThrow();

    const throwing: ResumableContext = {
      state: 'suspended',
      resume: () => {
        throw new Error('gone');
      },
    };
    expect(resumeIfSuspended(throwing)).toBe(false);
  });
});

describe('installAudioUnlock', () => {
  it('resumes on each of the gestures a browser accepts', () => {
    const context = fakeContext('suspended');
    const target = new EventTarget();
    const off = installAudioUnlock(() => context, target);

    for (const type of ['pointerdown', 'mousedown', 'touchend', 'keydown']) {
      context.state = 'suspended';
      target.dispatchEvent(new Event(type));
      expect(context.state, type).toBe('running');
    }
    expect(context.resumes).toBe(4);
    off();
  });

  it('keeps listening rather than unhooking after the first', () => {
    /*
     * Deliberately not one-shot. A context can be suspended again by a
     * background tab or an OS audio change, and a listener that removed itself
     * would leave the game silent for the rest of the session with no way
     * back.
     *
     * `keydown` is the specific case worth naming: it is what ESC produced,
     * and ESC is how the bug this fixes was being worked around.
     */
    const context = fakeContext('suspended');
    const target = new EventTarget();
    const off = installAudioUnlock(() => context, target);

    target.dispatchEvent(new Event('keydown'));
    context.state = 'suspended';
    target.dispatchEvent(new Event('keydown'));

    expect(context.resumes).toBe(2);
    off();
  });

  it('listens in the capture phase, where `stopPropagation` cannot hide it', () => {
    /*
     * The overlays are React and free to stop propagation on their own
     * handlers. A bubbling listener would then never see the gesture — which
     * is the same shape as the bug being fixed, where a Phaser *scene* pointer
     * event could not see a DOM click at all.
     */
    const target = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const off = installAudioUnlock(() => null, target as unknown as EventTarget);

    expect(target.addEventListener).toHaveBeenCalledTimes(4);
    for (const call of target.addEventListener.mock.calls) {
      expect(call[2], `${String(call[0])} options`).toMatchObject({ capture: true });
    }

    off();
    expect(target.removeEventListener).toHaveBeenCalledTimes(4);
  });

  it('reads the context through the thunk on every gesture', () => {
    // Phaser can replace the context, and at install time there may be none.
    // A value captured once would go stale; this pins that it is re-read.
    let context: ResumableContext | null = null;
    const target = new EventTarget();
    const off = installAudioUnlock(() => context, target);

    target.dispatchEvent(new Event('pointerdown')); // nothing to resume yet
    const late = fakeContext('suspended');
    context = late;
    target.dispatchEvent(new Event('pointerdown'));

    expect(late.resumes).toBe(1);
    off();
  });
});
