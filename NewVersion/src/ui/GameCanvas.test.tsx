/**
 * Guards the StrictMode invariant: exactly one Phaser.Game, ever.
 *
 * This regressed in every Phaser+React project that has ever existed, and the
 * symptom (a second, invisible update loop) is nearly impossible to spot by
 * eye — so it gets a test rather than a comment.
 */
import { StrictMode } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCanvas } from './GameCanvas';
import type { GameBootstrap } from './gameBootstrap';

function countingBootstrap(): { bootstrap: GameBootstrap; created: () => number; destroyed: () => number } {
  let created = 0;
  let destroyed = 0;
  const bootstrap: GameBootstrap = () => {
    created += 1;
    return {
      destroy: () => {
        destroyed += 1;
      },
    };
  };
  return { bootstrap, created: () => created, destroyed: () => destroyed };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GameCanvas', () => {
  it('creates exactly one game under StrictMode double-invocation', () => {
    const { bootstrap, created, destroyed } = countingBootstrap();

    render(
      <StrictMode>
        <GameCanvas bootstrap={bootstrap} />
      </StrictMode>,
    );

    // StrictMode has already run effect -> cleanup -> effect by now.
    expect(created()).toBe(1);

    // Let the deferred destroy scheduled by the synthetic unmount fire; it
    // must have been cancelled by the second effect run.
    act(() => {
      vi.runAllTimers();
    });

    expect(created()).toBe(1);
    expect(destroyed()).toBe(0);
  });

  it('destroys the game on a real unmount', () => {
    const { bootstrap, created, destroyed } = countingBootstrap();

    const { unmount } = render(
      <StrictMode>
        <GameCanvas bootstrap={bootstrap} />
      </StrictMode>,
    );

    act(() => {
      vi.runAllTimers();
    });
    expect(destroyed()).toBe(0);

    unmount();
    act(() => {
      vi.runAllTimers();
    });

    expect(created()).toBe(1);
    expect(destroyed()).toBe(1);
  });

  it('does not leak an instance across unmount/remount cycles', () => {
    const { bootstrap, created, destroyed } = countingBootstrap();

    for (let i = 0; i < 3; i += 1) {
      const { unmount } = render(
        <StrictMode>
          <GameCanvas bootstrap={bootstrap} />
        </StrictMode>,
      );
      act(() => {
        vi.runAllTimers();
      });
      unmount();
      act(() => {
        vi.runAllTimers();
      });
    }

    expect(created()).toBe(3);
    expect(destroyed()).toBe(3);
  });

  it('renders a canvas inside the measured container', () => {
    const { bootstrap } = countingBootstrap();
    const { container } = render(<GameCanvas bootstrap={bootstrap} />);

    const host = container.querySelector('.game-canvas-host');
    expect(host).not.toBeNull();
    expect(host?.querySelector('canvas.game-canvas')).not.toBeNull();
  });
});
