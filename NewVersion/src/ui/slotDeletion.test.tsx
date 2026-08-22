/**
 * Deleting a save slot asks first — T257.
 *
 * ── What each layer here proves ───────────────────────────────────────────
 * The first block is a **source-shape test**: it greps `src/ui/` for the event
 * name and proves that no file other than `slotDeletion.ts` spells it. That is
 * a claim about *spelling*, and nothing more — it cannot see whether either
 * screen reaches the hook, or whether the question is rendered where a player
 * can answer it. The two blocks after it drive the real components and are
 * what prove the behaviour.
 *
 * Both are needed. The component tests would still pass if someone added a
 * third screen with its own unguarded ✕; the grep is what fails then.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MainMenuScreen } from './screens/MainMenuScreen';
import { SaveSlotScreen } from './screens/SaveSlotScreen';
import { GameEvents } from '../game/events/GameEvents';
import { useGameStore } from '../state/gameStore';

const initial = useGameStore.getState();

const SLOTS = [
  { slot: 1, hasData: true, progress: 'World 1 - 3', dateTime: '16/Aug/26/03:31', premium: false },
  { slot: 2, hasData: true, progress: 'World 2 - 9', dateTime: '17/Aug/26/11:02', premium: false },
  { slot: 3, hasData: false, premium: false },
];

/** Every delete that reached the bus during a test. */
let deleted: number[] = [];

beforeEach(() => {
  useGameStore.setState(initial, true);
  useGameStore.setState({ activeScene: 'MainMenu', phase: 'ready', slotList: SLOTS });
  deleted = [];
  GameEvents.on('ui:delete-slot', ({ slot }) => deleted.push(slot));
});

afterEach(() => {
  GameEvents.removeAllListeners();
});

describe('one place emits the delete', () => {
  /**
   * Source-shape. Proves the event name appears in exactly one file under
   * `src/ui/`; proves nothing about whether that file is ever called.
   */
  it('names `ui:delete-slot` in `slotDeletion.ts` and nowhere else in src/ui', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) return walk(path);
        return /\.tsx?$/.test(entry) ? [path] : [];
      });

    const named = walk('src/ui')
      .filter((path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'))
      .filter((path) => readFileSync(path, 'utf8').includes("'ui:delete-slot'"));

    // The whole point is the *count*. Before T257 this was two: the shared
    // rule did not exist and the main menu emitted the delete inline.
    expect(named.map((p) => p.replace(/\\/g, '/'))).toEqual(['src/ui/slotDeletion.ts']);
  });
});

describe('the main menu', () => {
  it('asks instead of deleting when the ✕ is pressed', () => {
    render(<MainMenuScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));

    // The two halves of the requirement, and both are needed: that the
    // question appeared, and that nothing was destroyed on the way to it.
    expect(screen.getByText('Delete slot 1?')).toBeInTheDocument();
    expect(deleted).toEqual([]);
  });

  it('deletes exactly once when the question is answered yes', () => {
    render(<MainMenuScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    // `toEqual([1])` rather than "was called": a count is what separates one
    // delete from two, and "did it fire" cannot tell those apart. Note this
    // render is *not* under StrictMode — see the block at the end of the file
    // for the test that actually drives that.
    expect(deleted).toEqual([1]);
    expect(screen.queryByText('Delete slot 1?')).toBeNull();
  });

  it('deletes nothing when the question is answered no', () => {
    render(<MainMenuScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(deleted).toEqual([]);
    expect(screen.queryByText('Delete slot 1?')).toBeNull();
    // The slot is still there to be loaded — a cancel that left the row blank
    // would satisfy both lines above.
    expect(screen.getByRole('button', { name: /Load slot 1/ })).toBeInTheDocument();
  });

  it('asks about one slot at a time', () => {
    render(<MainMenuScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 2' }));

    // Asking about 2 withdraws the question on 1, so the single "Delete"
    // button on screen cannot belong to the slot the player stopped asking
    // about. Without this, two open questions share one confirm label.
    expect(screen.queryByText('Delete slot 1?')).toBeNull();
    expect(screen.getByText('Delete slot 2?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleted).toEqual([2]);
  });

  it('names the progress that is about to be lost', () => {
    render(<MainMenuScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 2' }));

    // The confirmation is worth little if it does not say what is at stake —
    // "are you sure" about an unnamed slot is a dialog to click through.
    expect(screen.getByText(/World 2 - 9 will be lost/)).toBeInTheDocument();
  });

  it('forgets the question when the screen goes away', () => {
    const { rerender } = render(<MainMenuScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));
    expect(screen.getByText('Delete slot 1?')).toBeInTheDocument();

    // The picker opens over the menu, which hides — without unmounting, since
    // the component computes its hooks and only then returns null.
    useGameStore.setState({ slotPickerOpen: true });
    rerender(<MainMenuScreen />);
    useGameStore.setState({ slotPickerOpen: false });
    rerender(<MainMenuScreen />);

    // A question set up before doing something else must not still be one
    // click from deleting when the player comes back.
    expect(screen.queryByText('Delete slot 1?')).toBeNull();
    expect(screen.getByRole('button', { name: /Load slot 1/ })).toBeInTheDocument();
    expect(deleted).toEqual([]);
  });
});

describe('the save-slot picker', () => {
  beforeEach(() => {
    useGameStore.setState({ slotPickerOpen: true });
  });

  it('asks before deleting, and deletes once on yes', () => {
    render(<SaveSlotScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));
    expect(screen.getByText('Delete slot?')).toBeInTheDocument();
    expect(deleted).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(deleted).toEqual([1]);
  });

  it('deletes nothing on cancel', () => {
    render(<SaveSlotScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(deleted).toEqual([]);
    expect(screen.getByRole('button', { name: /Slot 1/ })).toBeInTheDocument();
  });

  it('forgets the question when the picker closes', () => {
    const { rerender } = render(<SaveSlotScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));

    useGameStore.setState({ slotPickerOpen: false });
    rerender(<SaveSlotScreen />);
    useGameStore.setState({ slotPickerOpen: true });
    rerender(<SaveSlotScreen />);

    expect(screen.queryByText('Delete slot?')).toBeNull();
    expect(deleted).toEqual([]);
  });
});

describe('the guard inside confirm', () => {
  it('emits nothing when there is no pending question', () => {
    /*
     * The negative, driven on the same context as its positive above: with
     * nothing asked, `confirm()` must be silent. Reached through the screen
     * rather than by calling the hook directly, because that is the path a
     * stray click actually takes.
     */
    render(<MainMenuScreen />);
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(deleted).toEqual([]);
  });

  it('does not double-emit when Delete is clicked twice', () => {
    render(<MainMenuScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);
    // The button is gone from the document after the first click; clicking the
    // detached node is what a fast second press does.
    fireEvent.click(confirmButton);

    expect(deleted).toEqual([1]);
  });
});

describe('under StrictMode, as the app runs it', () => {
  /*
   * `main.tsx:30` wraps the tree in `StrictMode`, and RTL's `render` does not
   * — so every other test in this file renders under different rules than the
   * game does. That gap hid a real bug for the length of one edit: `confirm()`
   * was first written with the emit *inside* a `setPending` updater, which
   * React deliberately double-invokes in development to surface side effects
   * in a place that is contractually pure. Measured in a throwaway before this
   * test was written: the updater form fired twice, the current form once.
   *
   * `deleteSlot` is idempotent, so the doubled version would have looked
   * correct on screen while putting two deletes on the bus for anything
   * downstream to trip over.
   */
  it('emits one delete per confirmed question', () => {
    render(
      <StrictMode>
        <MainMenuScreen />
      </StrictMode>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete slot 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deleted).toEqual([1]);
  });
});

describe('the delete control still exists where it did', () => {
  it('offers a ✕ only on slots that hold a save', () => {
    // The counterpart to everything above: a confirmation is easy to make
    // unreachable, and every test in this file would still pass if the ✕ had
    // simply stopped rendering. Slot 3 is empty and must not offer one.
    render(<MainMenuScreen />);

    expect(screen.getByRole('button', { name: 'Delete slot 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete slot 2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete slot 3' })).toBeNull();
  });
});
